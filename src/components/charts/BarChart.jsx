export default function BarChart({ title, data, color = "var(--teal)" }) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="stat-card">
      <div className="stat-title">{title}</div>
      {data.length === 0 && <div style={{ fontSize: 12, color: "var(--gray-400)" }}>Sin datos</div>}
      {data.map((d, i) => (
        <div key={i} className="bar-row">
          <div className="bar-label" title={d.label}>{d.label}</div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${(d.count / max) * 100}%`, background: color }} />
          </div>
          <div className="bar-count">{d.count}</div>
        </div>
      ))}
    </div>
  );
}