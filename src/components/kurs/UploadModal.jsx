import { useRef, useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { db, storage } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { MAT_TYPEN, MAT_COLORS, MAT_ICONS } from "../../lib/faecher";
import { radius } from "../../styles/theme";
import { Btn, Input, Modal, ModalHeader } from "../ui/UI";

const MAX_MB = 10;

export default function UploadModal({ klasseId, kurs, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const fileInputRef = useRef(null);

  const [typ, setTyp] = useState("Mitschrift");
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null); // null = kein Upload, 0..100

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    setError("");
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`Die Datei ist zu groß (max. ${MAX_MB} MB).`);
      e.target.value = "";
      return;
    }
    const isPdf = f.type === "application/pdf";
    const isImage = f.type.startsWith("image/");
    if (!isPdf && !isImage) {
      setError("Nur PDF- und Bilddateien sind erlaubt.");
      e.target.value = "";
      return;
    }
    setFile(f);
    if (!titel) setTitel(f.name.replace(/\.[^.]+$/, ""));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (titel.trim().length < 2) return setError("Bitte gib einen Titel an (mind. 2 Zeichen).");
    if (!file && !beschreibung.trim())
      return setError("Wähle eine Datei ODER schreibe eine Notiz in die Beschreibung.");

    try {
      let dateiUrl = null;
      let storagePath = null;
      let dateiTyp = "Notiz";

      if (file) {
        dateiTyp = file.type === "application/pdf" ? "PDF" : "Bild";
        storagePath = `klassen/${klasseId}/kurse/${kurs.id}/${Date.now()}_${file.name}`;
        const task = uploadBytesResumable(storageRef(storage, storagePath), file, {
          contentType: file.type,
        });
        setProgress(0);
        await new Promise((resolve, reject) => {
          task.on(
            "state_changed",
            (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
            reject,
            resolve
          );
        });
        dateiUrl = await getDownloadURL(task.snapshot.ref);
      } else {
        setProgress(0);
      }

      await addDoc(collection(db, "klassen", klasseId, "kurse", kurs.id, "materialien"), {
        typ,
        titel: titel.trim(),
        beschreibung: beschreibung.trim(),
        dateiUrl,
        storagePath,
        dateiTyp,
        dateiName: file?.name || null,
        autor: profile.nickname,
        autorId: profile.uid,
        likes: [],
        createdAt: serverTimestamp(),
      });
      onClose();
    } catch {
      setError("Upload fehlgeschlagen. Bitte erneut versuchen.");
      setProgress(null);
    }
  }

  const busy = progress !== null;

  return (
    <Modal width={520} onClose={busy ? undefined : onClose}>
      <ModalHeader
        title="Material hochladen"
        subtitle={`Wird mit allen Mitgliedern von „${kurs.name}" geteilt.`}
        onClose={busy ? undefined : onClose}
      />
      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        {/* Typ-Auswahl */}
        <div>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>Typ</span>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {MAT_TYPEN.map((matTyp) => {
              const active = typ === matTyp;
              const color = MAT_COLORS[matTyp];
              return (
                <button
                  key={matTyp}
                  type="button"
                  onClick={() => setTyp(matTyp)}
                  style={{
                    padding: "9px 12px", borderRadius: radius.sm, cursor: "pointer",
                    background: active ? `${color}1e` : t.surface2,
                    border: `1.5px solid ${active ? color : t.border}`,
                    color: active ? color : t.textMuted, fontSize: 13, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 7,
                  }}
                >
                  {MAT_ICONS[matTyp]} {matTyp}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z. B. Analysis – Ableitungsregeln"
          maxLength={80}
        />

        <Input
          label="Beschreibung (bei Notizen: der Inhalt)"
          textarea
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder="Optional – kurze Beschreibung oder Notiz-Text…"
          maxLength={2000}
        />

        {/* Datei */}
        <div>
          <span style={{ display: "block", fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 6 }}>
            Datei (PDF oder Bild, max. {MAX_MB} MB)
          </span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,image/*"
            onChange={handleFileSelect}
            style={{ display: "none" }}
          />
          {file ? (
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: t.surface2, border: `1px solid ${t.border}`, borderRadius: radius.sm,
              }}
            >
              <span style={{ fontSize: 18 }}>{file.type === "application/pdf" ? "📄" : "🖼️"}</span>
              <span style={{ flex: 1, fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {file.name}
              </span>
              <span style={{ fontSize: 12, color: t.textFaint }}>
                {(file.size / 1024 / 1024).toFixed(1)} MB
              </span>
              {!busy && (
                <button
                  type="button"
                  onClick={() => { setFile(null); fileInputRef.current.value = ""; }}
                  style={{ background: "none", border: "none", color: t.danger, cursor: "pointer", fontSize: 14 }}
                >
                  ✕
                </button>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", padding: "22px 12px", borderRadius: radius.sm,
                border: `1.5px dashed ${t.borderStrong}`, background: "transparent",
                color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              📎 Datei auswählen – oder ohne Datei als Notiz speichern
            </button>
          )}
        </div>

        {busy && file && (
          <div style={{ background: t.surface2, borderRadius: radius.full, height: 8, overflow: "hidden" }}>
            <div
              style={{
                width: `${progress}%`, height: "100%", background: t.accent,
                borderRadius: radius.full, transition: "width .2s",
              }}
            />
          </div>
        )}

        {error && <p style={{ margin: 0, color: t.danger, fontSize: 13 }}>{error}</p>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <Btn variant="ghost" type="button" onClick={onClose} disabled={busy}>Abbrechen</Btn>
          <Btn type="submit" disabled={busy}>
            {busy ? (file ? `Hochladen… ${progress}%` : "Speichern…") : "⬆️ Teilen"}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
