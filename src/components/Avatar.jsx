import { useState } from "react";

export default function Avatar({ src, name, size = 34 }) {
  const [err, setErr] = useState(false);
  if (src && !err) {
    return <img src={src} alt={name} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover" }} onError={() => setErr(true)} />;
  }
  const initials = (name || "?").split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--teal)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--navy)", fontWeight: 700, fontSize: size * 0.35 }}>
      {initials}
    </div>
  );
}