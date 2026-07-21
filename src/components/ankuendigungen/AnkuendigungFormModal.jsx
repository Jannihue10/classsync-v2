import { useRef, useState } from "react";
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from "firebase/storage";
import { storage } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { BellRing, CalendarClock, Check, Megaphone, Paperclip, Save, Users, X } from "lucide-react";
import { createAnkuendigung, updateAnkuendigung } from "../../lib/ankuendigungActions";
import { todayISO } from "../../lib/dates";
import { radius } from "../../styles/theme";
import { Btn, Input, Modal, ModalHeader } from "../ui/UI";
import DateiIcon from "../ui/DateiIcon";
import ZielgruppeStep from "./ZielgruppeStep";

const MAX_MB = 10;

// Häkchen im App-Stil (runder Akzent-Kreis wie in der Kursauswahl) statt der
// eckigen Browser-Checkbox – die fiel als einziges Bedienelement aus der Designsprache.
function CheckRow({ checked, onChange, icon: Icon, label, hinweis }) {
  const { t } = useTheme();
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      style={{
        display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
        background: "transparent", border: "none", padding: 0, cursor: "pointer",
      }}
    >
      <span
        style={{
          width: 20, height: 20, borderRadius: 999, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          background: checked ? t.accent : "transparent",
          border: `1.5px solid ${checked ? t.accent : t.borderStrong}`,
          color: t.accentText,
        }}
      >
        {checked && <Check size={12} strokeWidth={2.5} />}
      </span>
      {Icon && <Icon size={15} strokeWidth={1.8} color={t.textMuted} style={{ flexShrink: 0 }} />}
      <span style={{ minWidth: 0 }}>
        <span style={{ display: "block", fontSize: 13.5, color: t.text, fontWeight: 600 }}>{label}</span>
        {hinweis && (
          <span style={{ display: "block", fontSize: 12, color: t.textMuted, marginTop: 1 }}>{hinweis}</span>
        )}
      </span>
    </button>
  );
}

// Ankündigung verfassen ODER bearbeiten (nur Klassen-Admins). Upload-Kette 1:1 wie
// UploadModal, nur mit dem Klassen-Storage-Pfad statt dem Kurs-Pfad.
// `ank` gesetzt = Bearbeiten-Modus.
export default function AnkuendigungFormModal({ ank, onClose }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { klasse, kurse } = useKlasse();
  const fileInputRef = useRef(null);
  const bearbeiten = Boolean(ank);

  const [step, setStep] = useState("form"); // "form" | "zielgruppe"
  const [titel, setTitel] = useState(ank?.titel || "");
  const [text, setText] = useState(ank?.text || "");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(null); // null = kein Upload, 0..100

  // Bestehender Anhang (nur im Bearbeiten-Modus). `entfernt` = Nutzer hat ihn abgewählt.
  const [altDatei, setAltDatei] = useState(
    ank?.storagePath ? { name: ank.dateiName, typ: ank.dateiTyp } : null
  );
  const [erneutBenachrichtigen, setErneutBenachrichtigen] = useState(false);

  // Standard beim Neuanlegen: alle Kurse = die ganze Klasse.
  // Beim Bearbeiten die gespeicherte Auswahl, aber gegen die AKTUELLE Kursliste
  // gefiltert – zwischenzeitlich gelöschte Kurse würden sonst die
  // „alle gewählt"-Erkennung verfälschen.
  const [selected, setSelected] = useState(() =>
    ank?.kursIds
      ? new Set(ank.kursIds.filter((id) => kurse.some((k) => k.id === id)))
      : new Set(kurse.map((k) => k.id))
  );

  const [mitTermin, setMitTermin] = useState(Boolean(ank?.termin));
  const [von, setVon] = useState(ank?.termin?.von || todayISO());
  const [bis, setBis] = useState(ank?.termin?.bis || "");
  const [zeit, setZeit] = useState(ank?.termin?.zeit || "");

  const alleGewaehlt = selected.size === kurse.length;
  const busy = progress !== null;
  // Datei angefasst? Nur dann werden die Datei-Felder überschrieben.
  const dateiGeaendert = Boolean(file) || (bearbeiten && Boolean(ank.storagePath) && !altDatei);

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
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (titel.trim().length < 3) return setError("Bitte gib einen Titel an (mind. 3 Zeichen).");
    if (!text.trim() && !file && !altDatei)
      return setError("Schreibe einen Text oder hänge eine Datei an.");
    if (!alleGewaehlt && selected.size === 0)
      return setError("Wähle mindestens einen Kurs als Empfänger – oder alle.");
    if (mitTermin && !von) return setError("Bitte gib ein Datum für den Termin an.");
    if (mitTermin && bis && bis < von) return setError("Das Enddatum liegt vor dem Startdatum.");

    try {
      let dateiUrl = null;
      let storagePath = null;
      let dateiTyp = null;

      if (file) {
        dateiTyp = file.type === "application/pdf" ? "PDF" : "Bild";
        storagePath = `klassen/${klasse.id}/ankuendigungen/${Date.now()}_${file.name}`;
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

      // Alle Kurse gewählt -> kursIds null = ganze Klasse. Wichtig: sonst blieben
      // Mitglieder außen vor, die (noch) in keinem Kurs sind.
      const kursIds = alleGewaehlt ? null : [...selected];
      const kursNamen = kursIds
        ? kurse.filter((k) => selected.has(k.id)).map((k) => k.name)
        : null;

      const termin = mitTermin
        ? { von, bis: bis || null, zeit: zeit || null, titel: titel.trim() }
        : null;

      if (bearbeiten) {
        await updateAnkuendigung(
          klasse.id,
          ank,
          {
            titel, text, kursIds, kursNamen, termin,
            dateiGeaendert,
            dateiUrl, storagePath, dateiTyp,
            dateiName: file?.name || null,
          },
          { erneutBenachrichtigen, editorUid: profile.uid }
        );
      } else {
        await createAnkuendigung(klasse.id, {
          titel,
          text,
          autor: profile.nickname,
          autorId: profile.uid,
          kursIds,
          kursNamen,
          dateiUrl,
          storagePath,
          dateiTyp,
          dateiName: file?.name || null,
          termin,
        });
      }
      onClose();
    } catch {
      setError(
        bearbeiten
          ? "Speichern fehlgeschlagen. Bitte erneut versuchen."
          : "Veröffentlichen fehlgeschlagen. Bitte erneut versuchen."
      );
      setProgress(null);
    }
  }

  if (step === "zielgruppe") {
    return (
      <Modal width={560} onClose={onClose}>
        <ZielgruppeStep selected={selected} onChange={setSelected} onBack={() => setStep("form")} />
      </Modal>
    );
  }

  const labelStyle = {
    display: "block", fontSize: 13, fontWeight: 600, color: t.textMuted, marginBottom: 6,
  };

  return (
    <Modal width={560} onClose={busy ? undefined : onClose}>
      <ModalHeader
        title={bearbeiten ? "Ankündigung bearbeiten" : "Neue Ankündigung"}
        subtitle={
          bearbeiten
            ? 'Die Änderung wird als „bearbeitet" markiert.'
            : `Erscheint bei allen Empfängern in „${klasse.name}" beim nächsten Öffnen.`
        }
        onClose={busy ? undefined : onClose}
      />

      <form onSubmit={handleSubmit} style={{ display: "grid", gap: 14 }}>
        <Input
          label="Titel"
          required
          value={titel}
          onChange={(e) => setTitel(e.target.value)}
          placeholder="z. B. Klassenfahrt nach Hamburg"
          maxLength={80}
        />

        <Input
          label="Nachricht"
          textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Was sollen alle wissen?"
          maxLength={4000}
          style={{ minHeight: 110 }}
        />

        {/* Empfänger */}
        <div>
          <span style={labelStyle}>Empfänger</span>
          <button
            type="button"
            onClick={() => setStep("zielgruppe")}
            style={{
              display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left",
              padding: "10px 12px", borderRadius: radius.sm, cursor: "pointer",
              background: t.surface2, border: `1px solid ${t.border}`,
            }}
          >
            <Users size={16} strokeWidth={1.8} color={t.accent} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, color: t.text }}>
              {alleGewaehlt
                ? "Alle Klassenmitglieder"
                : selected.size === 0
                ? "Kein Kurs gewählt"
                : kurse.filter((k) => selected.has(k.id)).map((k) => k.name).join(", ")}
            </span>
            <span style={{ fontSize: 12.5, color: t.accent, fontWeight: 600, flexShrink: 0 }}>Ändern</span>
          </button>
        </div>

        {/* Termin */}
        <div>
          <CheckRow
            checked={mitTermin}
            onChange={setMitTermin}
            icon={CalendarClock}
            label="Termin im Kalender eintragen"
          />

          {mitTermin && (
            <div
              style={{
                display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 10, marginTop: 10, padding: "12px 13px",
                background: t.surface2, border: `1px solid ${t.border}`, borderRadius: radius.sm,
              }}
            >
              <Input
                label="Von"
                type="date"
                value={von}
                onChange={(e) => setVon(e.target.value)}
              />
              <Input
                label="Bis (optional)"
                type="date"
                min={von}
                value={bis}
                onChange={(e) => setBis(e.target.value)}
              />
              <Input
                label="Uhrzeit (optional)"
                type="time"
                value={zeit}
                onChange={(e) => setZeit(e.target.value)}
              />
            </div>
          )}
        </div>

        {/* Datei */}
        <div>
          <span style={labelStyle}>Anhang (PDF oder Bild, max. {MAX_MB} MB)</span>
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
              <DateiIcon typ={file.type === "application/pdf" ? "PDF" : "Bild"} size={18} />
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
                  style={{ background: "none", border: "none", color: t.danger, cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <X size={15} strokeWidth={2} />
                </button>
              )}
            </div>
          ) : altDatei ? (
            /* Bestehender Anhang im Bearbeiten-Modus: ersetzen oder entfernen.
               Die alte Datei wird erst nach erfolgreichem Speichern gelöscht. */
            <div
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                background: t.surface2, border: `1px solid ${t.border}`, borderRadius: radius.sm,
              }}
            >
              <DateiIcon typ={altDatei.typ} size={18} />
              <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: t.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {altDatei.name || "Anhang"}
              </span>
              {!busy && (
                <>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{ background: "none", border: "none", color: t.accent, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}
                  >
                    Ersetzen
                  </button>
                  <button
                    type="button"
                    onClick={() => setAltDatei(null)}
                    title="Anhang entfernen"
                    style={{ background: "none", border: "none", color: t.danger, cursor: "pointer", display: "flex", alignItems: "center" }}
                  >
                    <X size={15} strokeWidth={2} />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                width: "100%", padding: "18px 12px", borderRadius: radius.sm,
                border: `1.5px dashed ${t.borderStrong}`, background: "transparent",
                color: t.textMuted, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
            >
              <Paperclip size={15} strokeWidth={1.8} style={{ verticalAlign: "-2px", marginRight: 6 }} />
              Datei anhängen – optional
            </button>
          )}
        </div>

        {/* Erneut benachrichtigen – nur beim Bearbeiten */}
        {bearbeiten && (
          <div style={{ padding: "12px 13px", background: t.surface2, border: `1px solid ${t.border}`, borderRadius: radius.sm }}>
            <CheckRow
              checked={erneutBenachrichtigen}
              onChange={setErneutBenachrichtigen}
              icon={BellRing}
              label="Alle erneut benachrichtigen"
              hinweis="Das Popup erscheint noch einmal bei allen Empfängern – auch bei denen, die es schon gelesen haben."
            />
          </div>
        )}

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
            {busy ? (
              file ? `Hochladen… ${progress}%` : bearbeiten ? "Speichern…" : "Veröffentlichen…"
            ) : bearbeiten ? (
              <>
                <Save size={14} strokeWidth={1.9} /> Speichern
              </>
            ) : (
              <>
                <Megaphone size={14} strokeWidth={1.9} /> Veröffentlichen
              </>
            )}
          </Btn>
        </div>
      </form>
    </Modal>
  );
}
