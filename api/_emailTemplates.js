// HTML-Vorlagen für die transaktionalen ClassSync-Mails (Verify + Passwort-Reset).
// Reines Inline-HTML mit Tabellen-Layout: E-Mail-Clients unterstützen kein externes
// CSS und keine <svg>-Icons zuverlässig. Design an die Slate-Sprache angelehnt
// (Akzent #3b6ea5, flache Flächen, keine Emoji, klarer CTA + Fallback-Klartext-Link).

const ACCENT = "#3b6ea5";
const INK = "#1e293b"; // slate-800
const MUTED = "#64748b"; // slate-500
const BORDER = "#e2e8f0"; // slate-200
const BG = "#f1f5f9"; // slate-100
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

// Minimales Escaping für interpolierte Werte (Nickname etc.).
function esc(s) {
  return String(s ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c])
  );
}

// Gemeinsames Grundgerüst: Karte auf Slate-Hintergrund, Wortmarke, Inhalt, Fußzeile.
function shell({ heading, bodyHtml, buttonLabel, link }) {
  const safeLink = esc(link);
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>${esc(heading)}</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border:1px solid ${BORDER};border-radius:14px;overflow:hidden;">
    <tr><td style="padding:28px 32px 8px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:32px;height:32px;background:${ACCENT};border-radius:8px;text-align:center;vertical-align:middle;color:#ffffff;font-family:${FONT};font-weight:700;font-size:18px;line-height:32px;">C</td>
        <td style="padding-left:10px;font-family:${FONT};font-weight:700;font-size:18px;color:${INK};">ClassSync</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:16px 32px 8px 32px;">
      <h1 style="margin:0;font-family:${FONT};font-size:20px;font-weight:700;color:${INK};">${esc(heading)}</h1>
    </td></tr>
    <tr><td style="padding:8px 32px 8px 32px;font-family:${FONT};font-size:15px;line-height:1.6;color:${INK};">
      ${bodyHtml}
    </td></tr>
    <tr><td style="padding:20px 32px 8px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="border-radius:10px;background:${ACCENT};">
          <a href="${safeLink}" style="display:inline-block;padding:12px 22px;font-family:${FONT};font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:10px;">${esc(buttonLabel)}</a>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:16px 32px 4px 32px;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
      Falls der Button nicht funktioniert, kopiere diesen Link in deinen Browser:
      <br><a href="${safeLink}" style="color:${ACCENT};word-break:break-all;">${safeLink}</a>
    </td></tr>
    <tr><td style="padding:20px 32px 28px 32px;border-top:1px solid ${BORDER};font-family:${FONT};font-size:12px;line-height:1.6;color:${MUTED};">
      Diese E-Mail wurde automatisch von ClassSync versendet. Wenn du das nicht warst, kannst du sie ignorieren.
    </td></tr>
  </table>
  <div style="font-family:${FONT};font-size:12px;color:${MUTED};padding-top:16px;">ClassSync &middot; Alles für deine Klasse. An einem Ort.</div>
</td></tr>
</table>
</body>
</html>`;
}

export function verifyEmailHtml({ link, nickname }) {
  const hi = nickname ? `Hallo ${esc(nickname)},` : "Hallo,";
  return shell({
    heading: "Bestätige deine E-Mail-Adresse",
    buttonLabel: "E-Mail bestätigen",
    link,
    bodyHtml: `<p style="margin:0 0 12px 0;">${hi}</p>
      <p style="margin:0;">willkommen bei ClassSync! Bestätige mit einem Klick deine E-Mail-Adresse, um dein Konto freizuschalten und loszulegen.</p>`,
  });
}

export function resetEmailHtml({ link }) {
  return shell({
    heading: "Passwort zurücksetzen",
    buttonLabel: "Neues Passwort festlegen",
    link,
    bodyHtml: `<p style="margin:0;">Für dein ClassSync-Konto wurde ein Zurücksetzen des Passworts angefordert. Klicke auf den Button, um ein neues Passwort festzulegen. Der Link ist nur begrenzt gültig.</p>`,
  });
}

// Mail an die NEUE Adresse: erst nach Klick wechselt Firebase die E-Mail des Kontos.
export function changeEmailHtml({ link, nickname }) {
  const hi = nickname ? `Hallo ${esc(nickname)},` : "Hallo,";
  return shell({
    heading: "Neue E-Mail-Adresse bestätigen",
    buttonLabel: "Neue E-Mail bestätigen",
    link,
    bodyHtml: `<p style="margin:0 0 12px 0;">${hi}</p>
      <p style="margin:0;">für dein ClassSync-Konto wurde diese Adresse als neue E-Mail angefragt. Bestätige mit einem Klick, um die Änderung abzuschließen. Erst danach wird die neue Adresse aktiv. Wenn du das nicht warst, ignoriere diese E-Mail einfach.</p>`,
  });
}

export const SUBJECTS = {
  verify: "Bestätige deine E-Mail-Adresse für ClassSync",
  reset: "Setze dein ClassSync-Passwort zurück",
  changeEmail: "Bestätige deine neue E-Mail-Adresse für ClassSync",
};
