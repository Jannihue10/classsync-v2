// Wegwerf-Testskript: prüft die Auth-Mail-Kette lokal ohne Vercel/Deploy.
//   node scripts/test-resend.mjs <empfaenger-email> [verify|reset]
// Liest .env.local (RESEND_API_KEY, FIREBASE_PROJECT_ID/CLIENT_EMAIL/PRIVATE_KEY),
// initialisiert das Admin-SDK, erzeugt einen Firebase-Action-Link und schickt die
// gebrandete Mail über Resend – identisch zu api/auth-email.js.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { Resend } from "resend";
import { verifyEmailHtml, resetEmailHtml, SUBJECTS } from "../api/_emailTemplates.js";

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
if (!to) {
  console.error("Nutzung: node scripts/test-resend.mjs <empfaenger-email> [verify|reset]");
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
let link, note = "";
try {
  link =
    type === "verify"
      ? await auth.generateEmailVerificationLink(to, acs)
      : await auth.generatePasswordResetLink(to, acs);
  console.log(`[ok] ${type}-Link erzeugt.`);
} catch (e) {
  if (e.code === "auth/user-not-found") {
    link = "https://app.classsync.de/__test-link__";
    note = " (Hinweis: kein Firebase-Konto zu dieser Adresse -> Platzhalter-Link, nur Versand/Design werden getestet)";
    console.log(`[warn] Kein Konto zu ${to} -> Platzhalter-Link.`);
  } else {
    console.error("[FEHLER] Link-Erzeugung:", e.message);
    process.exit(1);
  }
}

// 3) Über Resend versenden.
const resend = new Resend(env.RESEND_API_KEY);
const html = type === "verify" ? verifyEmailHtml({ link }) : resetEmailHtml({ link });
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
