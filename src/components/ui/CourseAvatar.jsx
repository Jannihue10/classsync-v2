// Farbiges Monogramm als Kurs-Kennung (ersetzt die früheren Emoji-Icons).
// Getönter Hintergrund + Buchstabe in Kursfarbe – funktioniert in Light & Dark.
export default function CourseAvatar({ name, farbe, size = 28, radius = 8, style }) {
  const letter = (name || "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        flexShrink: 0,
        background: `${farbe}1e`,
        border: `1px solid ${farbe}45`,
        color: farbe,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.round(size * 0.46),
        fontWeight: 700,
        lineHeight: 1,
        userSelect: "none",
        ...style,
      }}
    >
      {letter}
    </span>
  );
}
