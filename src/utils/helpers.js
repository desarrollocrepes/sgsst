export function calcAge(birth) {
  if (!birth) return "";
  const d = new Date(birth);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function calcYears(date) {
  if (!date) return "";
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

export function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getBadge(estado) {
  const map = {
    seguimiento: "badge-seguimiento",
    abierto: "badge-abierto",
    cerrado: "badge-cerrado",
    vencido: "badge-vencido",
  };
  return map[estado?.toLowerCase()] || "badge-abierto";
}

export function badgeLabel(e) {
  const m = { seguimiento: "En Seguimiento", abierto: "Abierto", cerrado: "Cerrado", vencido: "Vencido" };
  return m[e?.toLowerCase()] || e || "—";
}