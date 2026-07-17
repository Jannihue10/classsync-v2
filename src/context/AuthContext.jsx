import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  onAuthStateChanged,
  reauthenticateWithCredential,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  verifyBeforeUpdateEmail,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);

// Endpoint-Fehlercodes auf die vorhandenen Firebase-Codes mappen, damit authErrorText()
// (unten) einheitliche deutsche Texte liefert.
const ENDPOINT_ERR_MAP = {
  "too-many-requests": "auth/too-many-requests",
  "invalid-email": "auth/invalid-email",
  "no-email-on-account": "auth/invalid-email",
  "email-already-in-use": "auth/email-already-in-use",
  "same-email": "auth/same-email",
};

// POST an die serverlose Auth-Mail-Function (Prod). Wirft bei Nicht-2xx einen Fehler
// mit .code, den authErrorText() übersetzen kann; Netzwerkfehler -> auth/network-request-failed.
async function postAuthEmail(type, payload) {
  let res;
  try {
    res = await fetch("/api/auth-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, ...payload }),
    });
  } catch {
    const err = new Error("network");
    err.code = "auth/network-request-failed";
    throw err;
  }
  if (!res.ok) {
    let data = {};
    try {
      data = await res.json();
    } catch {
      /* ignore */
    }
    const err = new Error(data.error || `http-${res.status}`);
    err.code = ENDPOINT_ERR_MAP[data.error] || `endpoint/${data.error || res.status}`;
    throw err;
  }
  return res.json().catch(() => ({}));
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null); // Firestore users/{uid}
  const [emailVerified, setEmailVerified] = useState(false);
  const [loading, setLoading] = useState(true); // Auth-Status noch unbekannt
  const [profileLoading, setProfileLoading] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u);
      setEmailVerified(u?.emailVerified ?? false);
      setLoading(false);
      if (!u) setProfile(null);
    });
  }, []);

  // Live-Profil aus Firestore (Nickname-Änderungen, Klassen-Wechsel)
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          // Lazy-Migration Alt->Neu: Einzel-klasseId -> klasseIds[] + activeKlasseId
          if (data.klasseIds === undefined && "klasseId" in data) {
            const legacy = data.klasseId || null;
            updateDoc(doc(db, "users", user.uid), {
              klasseIds: legacy ? [legacy] : [],
              activeKlasseId: legacy,
            }).catch(() => {});
            // lokal sofort spiegeln, damit das Gate nicht kurz ins Onboarding fällt
            data.klasseIds = legacy ? [legacy] : [];
            data.activeKlasseId = legacy;
          }
          // E-Mail-Sync: nach einem bestätigten E-Mail-Wechsel (verifyAndChangeEmail) ist die
          // Auth-Adresse aktuell, das denormalisierte users.email aber noch alt -> nachziehen.
          const authEmail = auth.currentUser?.email;
          if (authEmail && data.email !== authEmail) {
            updateDoc(doc(db, "users", user.uid), { email: authEmail }).catch(() => {});
            data.email = authEmail;
          }
          setProfile({ uid: user.uid, ...data });
        } else {
          setProfile(null);
        }
        setProfileLoading(false);
      },
      () => setProfileLoading(false)
    );
    return unsub;
  }, [user]);

  async function register(email, password, nickname) {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(db, "users", cred.user.uid), {
      nickname: nickname.trim(),
      email: email.trim(),
      klasseIds: [],
      activeKlasseId: null,
      createdAt: Date.now(),
    });
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email.trim(), password);
  }

  function logout() {
    return signOut(auth);
  }

  // Passwort-Reset-Mail. Prod: eigener Endpoint -> Resend. DEV (npm run dev, kein
  // /api): Firebase-Standardmail als Fallback, damit lokales Testen ohne `vercel dev` geht.
  async function resetPassword(email) {
    if (import.meta.env.DEV) return sendPasswordResetEmail(auth, email.trim());
    await postAuthEmail("reset", { email: email.trim() });
  }

  // Verifizierungs-E-Mail senden (Auto-Versand + manueller Resend im VerifyEmail-Screen).
  // Prod: eigener Endpoint -> Resend (Adresse kommt serverseitig aus dem verifizierten
  // idToken). DEV: Firebase-Standardmail als Fallback.
  async function sendVerification() {
    if (import.meta.env.DEV) return sendEmailVerification(auth.currentUser);
    const idToken = await auth.currentUser.getIdToken();
    await postAuthEmail("verify", { idToken });
  }

  // Aktuellen Auth-Status neu laden (on-demand, kein Polling) und emailVerified spiegeln.
  // reload() löst onAuthStateChanged NICHT aus -> State hier manuell aktualisieren.
  async function reloadVerification() {
    await auth.currentUser.reload();
    const verified = auth.currentUser.emailVerified;
    setEmailVerified(verified);
    return verified;
  }

  // E-Mail-Adresse ändern. Erfordert Reauthentifizierung (aktuelles Passwort) und schickt
  // einen Bestätigungslink an die NEUE Adresse – erst nach Klick wechselt Firebase die E-Mail.
  // Prod: gebrandete Resend-Mail über den Endpoint. DEV: Firebase-Standardmail als Fallback
  // (verifyBeforeUpdateEmail), damit `npm run dev` ohne `vercel dev` läuft.
  async function changeEmail(newEmail, currentPassword) {
    const cred = EmailAuthProvider.credential(auth.currentUser.email, currentPassword);
    await reauthenticateWithCredential(auth.currentUser, cred);
    const next = newEmail.trim();
    if (import.meta.env.DEV) return verifyBeforeUpdateEmail(auth.currentUser, next);
    const idToken = await auth.currentUser.getIdToken();
    await postAuthEmail("changeEmail", { idToken, newEmail: next });
  }

  function updateProfile(fields) {
    return updateDoc(doc(db, "users", user.uid), fields);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, emailVerified, loading, profileLoading, register, login, logout, resetPassword, sendVerification, reloadVerification, changeEmail, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

// Firebase-Fehlercodes -> deutsche Meldungen
export function authErrorText(err) {
  const code = err?.code || "";
  const map = {
    "auth/invalid-email": "Ungültige E-Mail-Adresse.",
    "auth/user-not-found": "Kein Konto mit dieser E-Mail gefunden.",
    "auth/wrong-password": "Falsches Passwort.",
    "auth/invalid-credential": "E-Mail oder Passwort ist falsch.",
    "auth/email-already-in-use": "Diese E-Mail wird bereits verwendet.",
    "auth/weak-password": "Passwort zu schwach (mind. 6 Zeichen).",
    "auth/too-many-requests": "Zu viele Versuche. Bitte später erneut versuchen.",
    "auth/network-request-failed": "Netzwerkfehler. Bitte Verbindung prüfen.",
    "auth/requires-recent-login": "Bitte melde dich zur Sicherheit erneut an und versuche es dann noch einmal.",
    "auth/same-email": "Das ist bereits deine aktuelle E-Mail-Adresse.",
    "auth/missing-password": "Bitte gib dein Passwort ein.",
  };
  return map[code] || "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
}
