export default function BarChart({ title, data = [], color = "var(--teal)" }) {
  const safeData = Array.isArray(data) ? data : [];
  const max = Math.max(...safeData.map(d => Number(d.count) || 0), 1);

  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      {safeData.length === 0 && <div style={{ fontSize: 12, color: "var(--gray-400)" }}>Sin datos</div>}
      {safeData.map((d, i) => (
        <div key={i} className="bar-row">
          <div className="bar-label" title={d.label}>{d.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${((Number(d.count) || 0) / max) * 100}%`, background: color }} />
          </div>
          <div className="bar-count">{d.count}</div>
        </div>
      ))}
    </div>
  );
}