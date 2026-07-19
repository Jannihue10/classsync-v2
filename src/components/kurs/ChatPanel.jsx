import { useEffect, useMemo, useRef, useState } from "react";
import { Ban, Check, MessageSquare, Pencil, SendHorizontal, Trash2, X } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { useKlasse } from "../../context/KlasseContext";
import { formatUhrzeit } from "../../lib/dates";
import { useKursCollection, tsMillis } from "../../lib/useKursCollection";
import { radius, vhScaled } from "../../styles/theme";
import { Btn, Card, Empty, Spinner } from "../ui/UI";
import ConfirmDialog from "../modals/ConfirmDialog";
import { canDeleteMessage, canEditMessage, deleteMessage, editMessage } from "./chatActions";

// Echtzeit-Kurschat. Autoren können eigene Nachrichten bearbeiten; Autoren sowie
// Kurs-/Klassen-Admins können sie löschen (Tombstone „Nachricht wurde gelöscht").
export default function ChatPanel({ klasseId, kurs }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { isKlassenAdmin } = useKlasse();
  const { docs, loading } = useKursCollection(klasseId, kurs.id, "chat");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [menuFor, setMenuFor] = useState(null);   // Nachricht mit offenem Aktionsmenü
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [confirmMsg, setConfirmMsg] = useState(null); // zu löschende Nachricht
  const bottomRef = useRef(null);

  const canModerate = isKlassenAdmin || kurs.erstellerId === profile.uid;

  const messages = useMemo(
    () => [...docs].sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt)),
    [docs]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  // Menü bei Klick außerhalb / Escape schließen
  useEffect(() => {
    if (!menuFor) return;
    const close = () => setMenuFor(null);
    const onKey = (e) => e.key === "Escape" && setMenuFor(null);
    document.addEventListener("click", close);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", close);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuFor]);

  async function handleSend(e) {
    e.preventDefault();
    const msg = text.trim();
    if (!msg) return;
    setBusy(true);
    setText("");
    try {
      await addDoc(collection(db, "klassen", klasseId, "kurse", kurs.id, "chat"), {
        text: msg,
        autor: profile.nickname,
        autorId: profile.uid,
        createdAt: serverTimestamp(),
      });
    } catch {
      setText(msg); // bei Fehler Eingabe zurückgeben
    } finally {
      setBusy(false);
    }
  }

  function startEdit(msg) {
    setMenuFor(null);
    setEditingId(msg.id);
    setEditText(msg.text);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditText("");
  }

  async function saveEdit(msg) {
    const next = editText.trim();
    if (!next || next === msg.text) {
      cancelEdit();
      return;
    }
    try {
      await editMessage(klasseId, kurs.id, msg.id, next);
      cancelEdit();
    } catch {
      /* Eingabe bleibt zum erneuten Versuch stehen */
    }
  }

  return (
    <Card style={{ display: "flex", flexDirection: "column", height: `min(${vhScaled(64)}, 620px)` }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <Spinner center />
        ) : messages.length === 0 ? (
          <Empty icon={MessageSquare} text="Noch keine Nachrichten" sub={`Starte die Unterhaltung in ${kurs.name}!`} />
        ) : (
          messages.map((msg, i) => {
            const own = msg.autorId === profile.uid;
            const prev = messages[i - 1];
            const showAutor = !own && !msg.deleted && (!prev || prev.autorId !== msg.autorId);
            const editing = editingId === msg.id;
            const mayEdit = canEditMessage(msg, profile.uid);
            const mayDelete = canDeleteMessage(msg, profile.uid, canModerate);
            const hasActions = mayEdit || mayDelete;

            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: own ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "78%", position: "relative" }}>
                  {showAutor && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, margin: "0 0 3px 10px" }}>
                      {msg.autor}
                    </div>
                  )}

                  {editing ? (
                    <EditBubble
                      t={t}
                      value={editText}
                      onChange={setEditText}
                      onSave={() => saveEdit(msg)}
                      onCancel={cancelEdit}
                    />
                  ) : (
                    <div
                      onClick={(e) => {
                        if (!hasActions) return;
                        e.stopPropagation();
                        setMenuFor(menuFor === msg.id ? null : msg.id);
                      }}
                      style={{
                        background: msg.deleted ? t.surface2 : own ? t.chatOwn : t.chatOther,
                        color: msg.deleted ? t.textMuted : own ? t.chatOwnText : t.text,
                        border: msg.deleted ? `1px solid ${t.border}` : "none",
                        borderRadius: own ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                        padding: "8px 12px", fontSize: 13.5, lineHeight: 1.5,
                        wordBreak: "break-word", whiteSpace: "pre-wrap",
                        cursor: hasActions ? "pointer" : "default",
                      }}
                    >
                      {msg.deleted ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontStyle: "italic" }}>
                          <Ban size={13} strokeWidth={1.8} />
                          Diese Nachricht wurde gelöscht
                        </span>
                      ) : (
                        msg.text
                      )}
                      <span
                        style={{
                          fontSize: 10, opacity: 0.65, marginLeft: 8,
                          float: "right", marginTop: 6,
                          display: "inline-flex", alignItems: "center", gap: 3,
                        }}
                      >
                        {msg.editedAt && !msg.deleted && (
                          <Pencil size={10} strokeWidth={1.8} aria-label="bearbeitet" />
                        )}
                        {formatUhrzeit(msg.createdAt)}
                      </span>
                    </div>
                  )}

                  {menuFor === msg.id && !editing && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: "absolute", top: "100%", marginTop: 4, zIndex: 5,
                        [own ? "right" : "left"]: 0,
                        background: t.surface, border: `1px solid ${t.border}`,
                        borderRadius: radius.md, boxShadow: t.shadowLg,
                        padding: 4, display: "flex", flexDirection: "column", minWidth: 132,
                      }}
                    >
                      {mayEdit && (
                        <MenuItem t={t} icon={Pencil} label="Bearbeiten" onClick={() => startEdit(msg)} />
                      )}
                      {mayDelete && (
                        <MenuItem
                          t={t} icon={Trash2} label="Löschen" danger
                          onClick={() => { setMenuFor(null); setConfirmMsg(msg); }}
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={handleSend}
        style={{ display: "flex", gap: 8, padding: 12, borderTop: `1px solid ${t.border}` }}
      >
        <input
          placeholder="Nachricht schreiben…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          style={{
            flex: 1, padding: "10px 14px", borderRadius: radius.full,
            border: `1px solid ${t.borderStrong}`, background: t.surface2,
            color: t.text, fontSize: 13.5, outline: "none",
          }}
        />
        <Btn type="submit" small disabled={busy || !text.trim()} style={{ borderRadius: radius.full }} aria-label="Senden">
          <SendHorizontal size={15} strokeWidth={1.8} />
        </Btn>
      </form>

      {confirmMsg && (
        <ConfirmDialog
          title="Nachricht löschen?"
          text={'Die Nachricht wird für alle als „Nachricht wurde gelöscht“ angezeigt. Dies lässt sich nicht rückgängig machen.'}
          confirmLabel="Löschen"
          onConfirm={() => deleteMessage(klasseId, kurs.id, confirmMsg.id)}
          onClose={() => setConfirmMsg(null)}
        />
      )}
    </Card>
  );
}

// Inline-Bearbeitung einer Nachricht
function EditBubble({ t, value, onChange, onSave, onCancel }) {
  const ref = useRef(null);
  useEffect(() => { ref.current?.focus(); }, []);
  return (
    <div
      style={{
        background: t.surface, border: `1px solid ${t.borderStrong}`,
        borderRadius: radius.md, padding: 6, display: "flex", gap: 6, alignItems: "center",
      }}
    >
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); onSave(); }
          if (e.key === "Escape") { e.preventDefault(); onCancel(); }
        }}
        maxLength={1000}
        style={{
          flex: 1, minWidth: 140, padding: "6px 10px", borderRadius: radius.sm,
          border: `1px solid ${t.border}`, background: t.surface2,
          color: t.text, fontSize: 13.5, outline: "none",
        }}
      />
      <button
        type="button" onClick={onSave} aria-label="Speichern"
        style={iconBtnStyle(t, t.accent)}
      >
        <Check size={15} strokeWidth={2} />
      </button>
      <button
        type="button" onClick={onCancel} aria-label="Abbrechen"
        style={iconBtnStyle(t, t.textMuted)}
      >
        <X size={15} strokeWidth={2} />
      </button>
    </div>
  );
}

function iconBtnStyle(t, color) {
  return {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: 30, height: 30, borderRadius: radius.sm,
    border: `1px solid ${t.border}`, background: t.surface2,
    color, cursor: "pointer",
  };
}

function MenuItem({ t, icon: Icon, label, onClick, danger }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 9,
        padding: "8px 10px", borderRadius: radius.sm,
        border: "none", background: "transparent",
        color: danger ? t.danger : t.text, fontSize: 13, fontWeight: 500,
        cursor: "pointer", textAlign: "left", width: "100%",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = danger ? t.dangerSoft : t.surfaceHover)}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
    >
      <Icon size={15} strokeWidth={1.8} />
      {label}
    </button>
  );
}
