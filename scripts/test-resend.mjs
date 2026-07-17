// Wegwerf-Testskript: prüft die Auth-Mail-Kette lokal ohne Vercel/Deploy.
//   node scripts/test-resend.mjs <empfaenger-email> [verify|reset]
//   node scripts/test-resend.mjs <neue-email> changeEmail <aktuelle-konto-email>
// Liest .env.local (RESEND_API_KEY, FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY),
// initialisiert das Admin-SDK, erzeugt einen Firebase-Action-Link und schickt die
// gebrandete Mail über Resend – identisch zu api/auth-email.js.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";
import { verifyEmailHtml, resetEmailHtml, changeEmailHtml, SUBJECTS } from "../api/_emailTemplates.js";

const here = dirname(fileURLToPath(import.meta.url));

// .env.local minimal parsen (nur KEY=VALUE, Quotes entfernen).
const env = {};
for (const line of readFileSync(join(here, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)$/);
  if (!m) continue;
  let v = m[2].trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    v = v.slice(1, -1);
  }
  env[m[1]] = v;
}

const to = process.argv[2];
const type = process.argv[3] || "reset";
// changeEmail: `to` ist die NEUE Adresse (Empfänger), argv[4] = aktuelle Konto-Adresse.
const currentEmail = process.argv[4];
if (!to || !["verify", "reset", "changeEmail"].includes(type)) {
  console.error("Nutzung: node scripts/test-resend.mjs <empfaenger-email> [verify|reset]");
  console.error("         node scripts/test-resend.mjs <neue-email> changeEmail <aktuelle-konto-email>");
  process.exit(1);
}
if (type === "changeEmail" && !currentEmail) {
  console.error("changeEmail braucht die aktuelle Konto-Adresse als 3. Argument.");
  process.exit(1);
}

const FROM = env.MAIL_FROM || "ClassSync <noreply@mail.classsync.de>";
const acs = { url: env.AUTH_CONTINUE_URL || "https://app.classsync.de", handleCodeInApp: false };

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: (env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    }),
  });
}
const auth = getAuth();

// 1) Admin-Credentials prüfen (unabhängig vom Empfänger).
try {
  const list = await auth.listUsers(1);
  console.log(`[ok] Firebase-Admin-Credentials gültig (mind. ${list.users.length} User sichtbar).`);
} catch (e) {
  console.error("[FEHLER] Admin-Credentials ungültig:", e.message);
  process.exit(1);
}

// 2) Firebase-Action-Link erzeugen (bei unbekanntem User: Platzhalter, damit der
//    Resend-Versand trotzdem getestet wird).
//    changeEmail: Link basiert auf der AKTUELLEN Konto-Adresse -> Wechsel auf `to`.
const linkSubject = type === "changeEmail" ? currentEmail : to;
let link, note = "";
// changeEmail: ist die Zieladresse schon vergeben, ist kein echter Wechsel-Link möglich
// (Firebase wirft dann einen kryptischen INTERNAL-ASSERT). Für einen reinen Zustell-/Design-Test
// weichen wir dann auf einen Platzhalter-Link aus.
if (type === "changeEmail") {
  try {
    const existing = await auth.getUserByEmail(to);
    link = "https://app.classsync.de/__test-link__";
    note = ` (Hinweis: ${to} ist bereits ein Konto [uid ${existing.uid}] -> kein echter Wechsel-Link möglich, Platzhalter-Link; nur Zustellung/Design werden getestet)`;
    console.log(`[warn] Zieladresse ${to} ist belegt -> Platzhalter-Link.`);
  } catch (e) {
    if (e.code !== "auth/user-not-found") {
      console.error("[FEHLER] Prüfung der Zieladresse:", e.message);
      process.exit(1);
    }
    // frei -> weiter unten echten Link erzeugen
  }
}
try {
  if (link) {
    // Platzhalter bereits gesetzt (changeEmail auf belegte Adresse)
  } else if (type === "verify") link = await auth.generateEmailVerificationLink(to, acs);
  else if (type === "reset") link = await auth.generatePasswordResetLink(to, acs);
  else link = await auth.generateVerifyAndChangeEmailLink(currentEmail, to, acs);
  if (!note) console.log(`[ok] ${type}-Link erzeugt.`);
} catch (e) {
  if (e.code === "auth/user-not-found") {
    link = "https://app.classsync.de/__test-link__";
    note = ` (Hinweis: kein Firebase-Konto zu ${linkSubject} -> Platzhalter-Link, nur Versand/Design werden getestet)`;
    console.log(`[warn] Kein Konto zu ${linkSubject} -> Platzhalter-Link.`);
  } else if (e.code === "auth/email-already-exists") {
    console.error(`[FEHLER] ${to} wird bereits von einem Konto verwendet – für den changeEmail-Link muss die neue Adresse frei sein.`);
    process.exit(1);
  } else {
    console.error("[FEHLER] Link-Erzeugung:", e.message);
    process.exit(1);
  }
}

// 3) Über Resend versenden.
const resend = new Resend(env.RESEND_API_KEY);
const html =
  type === "verify"
    ? verifyEmailHtml({ link })
    : type === "reset"
      ? resetEmailHtml({ link })
      : changeEmailHtml({ link });
const { data, error } = await resend.emails.send({
  from: FROM,
  to,
  subject: SUBJECTS[type],
  html,
});
if (error) {
  console.error("[FEHLER] Resend:", JSON.stringify(error));
  process.exit(1);
}
console.log(`[ok] Mail an ${to} versendet (Resend-ID ${data?.id}).${note}`);
console.log("-> Postfach prüfen: Absender noreply@mail.classsync.de, ClassSync-Design.");
