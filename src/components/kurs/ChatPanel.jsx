import { useEffect, useMemo, useRef, useState } from "react";
import { MessageSquare, SendHorizontal } from "lucide-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { formatUhrzeit } from "../../lib/dates";
import { useKursCollection, tsMillis } from "../../lib/useKursCollection";
import { radius } from "../../styles/theme";
import { Btn, Card, Empty, Spinner } from "../ui/UI";

// Echtzeit-Kurschat. Nachrichten können nicht bearbeitet oder gelöscht werden.
export default function ChatPanel({ klasseId, kurs }) {
  const { t } = useTheme();
  const { profile } = useAuth();
  const { docs, loading } = useKursCollection(klasseId, kurs.id, "chat");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const messages = useMemo(
    () => [...docs].sort((a, b) => tsMillis(a.createdAt) - tsMillis(b.createdAt)),
    [docs]
  );

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

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

  return (
    <Card style={{ display: "flex", flexDirection: "column", height: "min(64vh, 620px)" }}>
      <div style={{ flex: 1, overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
        {loading ? (
          <Spinner center />
        ) : messages.length === 0 ? (
          <Empty icon={MessageSquare} text="Noch keine Nachrichten" sub={`Starte die Unterhaltung in ${kurs.name}!`} />
        ) : (
          messages.map((msg, i) => {
            const own = msg.autorId === profile.uid;
            const prev = messages[i - 1];
            const showAutor = !own && (!prev || prev.autorId !== msg.autorId);
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: own ? "flex-end" : "flex-start" }}>
                <div style={{ maxWidth: "78%" }}>
                  {showAutor && (
                    <div style={{ fontSize: 11, fontWeight: 700, color: t.textMuted, margin: "0 0 3px 10px" }}>
                      {msg.autor}
                    </div>
                  )}
                  <div
                    style={{
                      background: own ? t.chatOwn : t.chatOther,
                      color: own ? t.chatOwnText : t.text,
                      borderRadius: own ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      padding: "8px 12px", fontSize: 13.5, lineHeight: 1.5,
                      wordBreak: "break-word", whiteSpace: "pre-wrap",
                    }}
                  >
                    {msg.text}
                    <span
                      style={{
                        fontSize: 10, opacity: 0.65, marginLeft: 8,
                        float: "right", marginTop: 6,
                      }}
                    >
                      {formatUhrzeit(msg.createdAt)}
                    </span>
                  </div>
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
    </Card>
  );
}
