// Vercel-Serverless-Function: erzeugt Firebase-Action-Links serverseitig (Admin-SDK)
// und verschickt sie im ClassSync-Design über Resend.
//
// Warum so: Firebase-Templates sind nicht gestaltbar. Wir behalten aber Firebases
// Verifizierungs-/Reset-Mechanik – der Link führt weiter auf Firebases Action-Handler,
// wo emailVerified kippt bzw. das Passwort gesetzt wird. Frontend (reloadVerification,
// emailVerified-Gate) bleibt dadurch unverändert; wir tauschen nur den Versandweg.
//
// Env-Vars (Vercel, unpräfixiert – NICHT VITE_):
//   RESEND_API_KEY, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY

import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";
import { verifyEmailHtml, resetEmailHtml, changeEmailHtml, SUBJECTS } from "./_emailTemplates.js";

// Continue-URL nach Verify/Reset. app.classsync.de ist bereits autorisierte Domain.
const CONTINUE_URL = process.env.AUTH_CONTINUE_URL || "https://app.classsync.de";
const FROM = process.env.MAIL_FROM || "ClassSync <noreply@mail.classsync.de>";

// Admin einmalig initialisieren (Guard gegen Re-Init bei Serverless-Warm-Starts).
function admin() {
  if (!getApps().length) {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      }),
    });
  }
  return getAuth();
}

// Best-effort In-Memory-Rate-Limit (pro warmer Instanz). Kein harter Schutz, aber
// bremst simples E-Mail-Bombing. Für echten Schutz später ein Store/Provider-Limit.
const HITS = new Map(); // key -> [timestamps]
const WINDOW_MS = 60_000;
const MAX_HITS = 5;
function rateLimited(key) {
  const now = Date.now();
  const arr = (HITS.get(key) || []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(key, arr);
  return arr.length > MAX_HITS;
}

async function readJson(req) {
  if (req.body) {
    return typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString("utf8")) : {};
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "method-not-allowed" });
  }

  if (!process.env.RESEND_API_KEY || !process.env.FIREBASE_PRIVATE_KEY) {
    return res.status(500).json({ error: "server-not-configured" });
  }

  let body;
  try {
    body = await readJson(req);
  } catch {
    return res.status(400).json({ error: "invalid-json" });
  }

  const type = body?.type;
  if (type !== "verify" && type !== "reset" && type !== "changeEmail") {
    return res.status(400).json({ error: "invalid-type" });
  }

  const auth = admin();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const acs = { url: CONTINUE_URL, handleCodeInApp: false };

  const ip =
    (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";

  try {
    // ---- Verify: nur für den eingeloggten Nutzer selbst (idToken erforderlich) ----
    if (type === "verify") {
      const idToken =
        body.idToken || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!idToken) return res.status(401).json({ error: "missing-token" });

      let decoded;
      try {
        decoded = await auth.verifyIdToken(idToken);
      } catch {
        return res.status(401).json({ error: "invalid-token" });
      }
      if (decoded.email_verified) {
        // Schon verifiziert – nichts zu tun, aber sauber quittieren.
        return res.status(200).json({ ok: true, alreadyVerified: true });
      }

      const email = decoded.email;
      if (!email) return res.status(400).json({ error: "no-email-on-account" });
      if (rateLimited(`v:${decoded.uid}`))
        return res.status(429).json({ error: "too-many-requests" });

      const link = await auth.generateEmailVerificationLink(email, acs);
      let nickname;
      try {
        nickname = decoded.name || (await auth.getUser(decoded.uid)).displayName;
      } catch {
        /* Nickname ist optional – Anrede fällt sonst neutral aus */
      }

      const { error } = await resend.emails.send({
        from: FROM,
        to: email,
        subject: SUBJECTS.verify,
        html: verifyEmailHtml({ link, nickname }),
      });
      if (error) {
        console.error("resend verify error", error);
        return res.status(502).json({ error: "send-failed" });
      }
      return res.status(200).json({ ok: true });
    }

    // ---- ChangeEmail: nur für den eingeloggten Nutzer selbst (idToken erforderlich) ----
    // Mail geht an die NEUE Adresse; erst nach Klick wechselt Firebase die E-Mail des Kontos
    // (generateVerifyAndChangeEmailLink). Frontend/Gate bleiben unverändert.
    if (type === "changeEmail") {
      const idToken =
        body.idToken || (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
      if (!idToken) return res.status(401).json({ error: "missing-token" });

      let decoded;
      try {
        decoded = await auth.verifyIdToken(idToken);
      } catch {
        return res.status(401).json({ error: "invalid-token" });
      }

      const current = decoded.email;
      if (!current) return res.status(400).json({ error: "no-email-on-account" });

      const newEmail = String(body.newEmail || "").trim().toLowerCase();
      // simple Plausibilitätsprüfung (die echte Validierung macht Firebase beim Link-Erzeugen)
      if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
        return res.status(400).json({ error: "invalid-email" });
      }
      if (newEmail === current.toLowerCase()) {
        return res.status(400).json({ error: "same-email" });
      }
      if (rateLimited(`c:${decoded.uid}`))
        return res.status(429).json({ error: "too-many-requests" });

      // Vorab-Check: ist die neue Adresse bereits vergeben? generateVerifyAndChangeEmailLink
      // wirft in dem Fall einen kryptischen INTERNAL-ASSERT statt auth/email-already-exists –
      // deshalb hier sauber abfangen und dem Client eine klare Meldung geben.
      try {
        await auth.getUserByEmail(newEmail);
        return res.status(409).json({ error: "email-already-in-use" });
      } catch (e) {
        if (e?.code !== "auth/user-not-found") {
          // andere Fehler (z. B. invalid-email) unten/generisch behandeln
          if (e?.code === "auth/invalid-email") {
            return res.status(400).json({ error: "invalid-email" });
          }
        }
        // user-not-found = Adresse frei -> weiter
      }

      let link;
      try {
        link = await auth.generateVerifyAndChangeEmailLink(current, newEmail, acs);
      } catch (e) {
        // Sicherheitsnetz, falls die Adresse zwischen Check und Link-Erzeugung belegt wird
        if (e?.code === "auth/email-already-exists") {
          return res.status(409).json({ error: "email-already-in-use" });
        }
        if (e?.code === "auth/invalid-email") {
          return res.status(400).json({ error: "invalid-email" });
        }
        console.error("change-email link error", e);
        return res.status(500).json({ error: "internal" });
      }

      let nickname;
      try {
        nickname = decoded.name || (await auth.getUser(decoded.uid)).displayName;
      } catch {
        /* Nickname optional – Anrede fällt sonst neutral aus */
      }

      const { error } = await resend.emails.send({
        from: FROM,
        to: newEmail,
        subject: SUBJECTS.changeEmail,
        html: changeEmailHtml({ link, nickname }),
      });
      if (error) {
        console.error("resend change-email error", error);
        return res.status(502).json({ error: "send-failed" });
      }
      return res.status(200).json({ ok: true });
    }

    // ---- Reset: unauthentifiziert. Immer generisch 200 (keine User-Enumeration) ----
    const email = String(body.email || "").trim().toLowerCase();
    if (!email) return res.status(400).json({ error: "invalid-email" });
    if (rateLimited(`r:${ip}:${email}`))
      return res.status(429).json({ error: "too-many-requests" });

    try {
      const link = await auth.generatePasswordResetLink(email, acs);
      const { error } = await resend.emails.send({
        from: FROM,
        to: email,
        subject: SUBJECTS.reset,
        html: resetEmailHtml({ link }),
      });
      if (error) console.error("resend reset error", error);
    } catch (e) {
      // user-not-found u.ä. bewusst schlucken -> generische Antwort unten.
      if (e?.code && e.code !== "auth/user-not-found") {
        console.error("reset link error", e);
      }
    }
    // Immer Erfolg melden, egal ob die Adresse existiert.
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error("auth-email fatal", e);
    return res.status(500).json({ error: "internal" });
  }
}
