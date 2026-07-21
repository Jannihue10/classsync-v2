import { useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Check, Users } from "lucide-react";
import { useKlasse } from "../../context/KlasseContext";
import { useTheme } from "../../context/ThemeContext";
import { radius } from "../../styles/theme";
import { Btn, Empty, Input } from "../ui/UI";
import CourseAvatar from "../ui/CourseAvatar";

// Kursauswahl für die Zielgruppe. Optik und Verhalten wie KurswahlModal, aber rein
// lokaler State ohne Firestore-Write – gespeichert wird erst beim Veröffentlichen.
//
// Wird im SELBEN Modal wie das Formular gerendert (step-Umschaltung statt zweitem
// Modal): gestapelte Modals würden sich beim Schließen gegenseitig das
// document.body.overflow-Aufräumen kaputt machen.
export default function ZielgruppeStep({ selected, onChange, onBack }) {
  const { t } = useTheme();
  const { kurse } = useKlasse();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return kurse;
    return kurse.filter(
      (k) => k.name.toLowerCase().includes(q) || (k.lehrer || "").toLowerCase().includes(q)
    );
  }, [kurse, search]);

  const alleGewaehlt = selected.size === kurse.length;

  // Erreichte Personen: bei „alle Kurse" die ganze Klasse (auch wer in keinem Kurs ist),
  // sonst die Vereinigung der memberIds der gewählten Kurse.
  const erreicht = useMemo(() => {
    if (alleGewaehlt) return null;
    const ids = new Set();
    for (const kurs of kurse) {
      if (!selected.has(kurs.id)) continue;
      for (const uid of kurs.memberIds || []) ids.add(uid);
    }
    return ids.size;
  }, [kurse, selected, alleGewaehlt]);

  function toggle(kursId) {
    const next = new Set(selected);
    next.has(kursId) ? next.delete(kursId) : next.add(kursId);
    onChange(next);
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16 }}>
        <button
          onClick={onBack}
          aria-label="Zurück"
          style={{
            background: t.surface2, border: "none", borderRadius: radius.full,
            width: 30, height: 30, cursor: "pointer", color: t.textMuted, flexShrink: 0,
            display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 2,
          }}
        >
          <ArrowLeft size={15} strokeWidth={2} />
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: t.text, letterSpacing: -0.2 }}>
            Empfänger wählen
          </h2>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: t.textMuted }}>
            Alle, die in mindestens einem der gewählten Kurse sind, bekommen die Ankündigung.
          </p>
        </div>
      </div>

      {kurse.length === 0 ? (
        <Empty
          icon={BookOpen}
          text="Noch keine Kurse in dieser Klasse"
          sub="Ohne Kurse geht die Ankündigung automatisch an alle Klassenmitglieder."
        />
      ) : (
        <>
          <div
            style={{
              display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", marginBottom: 12,
              background: t.accentSoft, border: `1px solid ${t.accent}44`, borderRadius: radius.md,
            }}
          >
            <Users size={15} strokeWidth={1.8} color={t.accent} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: t.text, fontWeight: 600 }}>
              {alleGewaehlt
                ? "Alle Klassenmitglieder"
                : erreicht === 0
                ? "Niemand – mindestens einen Kurs wählen"
                : `${erreicht} ${erreicht === 1 ? "Mitglied" : "Mitglieder"} erreicht`}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <Input
                placeholder="Kurs oder Lehrer suchen…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Btn variant="soft" small onClick={() => onChange(new Set(kurse.map((k) => k.id)))}>
              Alle wählen
            </Btn>
            <Btn variant="soft" small onClick={() => onChange(new Set())}>
              Alle abwählen
            </Btn>
          </div>

          <div style={{ display: "grid", gap: 8, maxHeight: 340, overflowY: "auto", paddingRight: 2 }}>
            {filtered.length === 0 && (
              <p style={{ textAlign: "center", color: t.textMuted, fontSize: 13.5, padding: 20 }}>
                Keine Kurse gefunden.
              </p>
            )}
            {filtered.map((kurs) => {
              const active = selected.has(kurs.id);
              return (
                <button
                  key={kurs.id}
                  onClick={() => toggle(kurs.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 12, padding: "11px 14px",
                    borderRadius: radius.md, cursor: "pointer", textAlign: "left",
                    background: active ? t.accentSoft : t.surface2,
                    border: `1.5px solid ${active ? t.accent : t.border}`,
                    transition: "border-color .12s, background .12s",
                  }}
                >
                  <CourseAvatar name={kurs.name} farbe={kurs.farbe} size={34} radius={9} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 600, fontSize: 14, color: t.text }}>
                      {kurs.name}
                    </span>
                    <span style={{ display: "block", fontSize: 12, color: t.textMuted }}>
                      {[kurs.lehrer, `${kurs.memberIds?.length || 0} Mitglieder`].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                  <span
                    style={{
                      width: 22, height: 22, borderRadius: 999, flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: active ? t.accent : "transparent",
                      border: `1.5px solid ${active ? t.accent : t.borderStrong}`,
                      color: t.accentText,
                    }}
                  >
                    {active && <Check size={13} strokeWidth={2.5} />}
                  </span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
        <Btn onClick={onBack}>Übernehmen</Btn>
      </div>
    </>
  );
}
