import { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";

const AuthContext = createContext(null);

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

  // Live-Profil aus Firestore (Nickname-Änderungen, klasseId-Wechsel)
  useEffect(() => {
    if (!user) return;
    setProfileLoading(true);
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setProfile(snap.exists() ? { uid: user.uid, ...snap.data() } : null);
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
      klasseId: null,
      createdAt: Date.now(),
    });
  }

  function login(email, password) {
    return signInWithEmailAndPassword(auth, email.trim(), password);
  }

  function logout() {
    return signOut(auth);
  }

  function resetPassword(email) {
    return sendPasswordResetEmail(auth, email.trim());
  }

  // Verifizierungs-E-Mail senden (manueller Resend im VerifyEmail-Screen)
  function sendVerification() {
    return sendEmailVerification(auth.currentUser);
  }

  // Aktuellen Auth-Status neu laden (on-demand, kein Polling) und emailVerified spiegeln.
  // reload() löst onAuthStateChanged NICHT aus -> State hier manuell aktualisieren.
  async function reloadVerification() {
    await auth.currentUser.reload();
    const verified = auth.currentUser.emailVerified;
    setEmailVerified(verified);
    return verified;
  }

  function updateProfile(fields) {
    return updateDoc(doc(db, "users", user.uid), fields);
  }

  return (
    <AuthContext.Provider
      value={{ user, profile, emailVerified, loading, profileLoading, register, login, logout, resetPassword, sendVerification, reloadVerification, updateProfile }}
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
  };
  return map[code] || "Etwas ist schiefgelaufen. Bitte erneut versuchen.";
}
