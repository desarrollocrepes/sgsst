import { useState, useEffect, useCallback } from "react";
import { API_REPORTES } from "../config/api";
import { fmtDate, getBadge, badgeLabel } from "../utils/helpers";
import Avatar from "../components/Avatar";
import ReporteForm from "../components/ReporteForm";

export default function Lider({ user }) {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const loadReportes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_REPORTES}?populate=*&filters[creador_reporte_nombre][$containsi]=${encodeURIComponent(user.nombre)}&pagination[pageSize]=40000`);
      const json = await res.json();
      setReportes(json.data || []);
    } catch { setReportes([]); }
    setLoading(false);
  }, [user.nombre]);

  useEffect(() => { loadReportes(); }, [loadReportes]);

  return (
    <div className="page">
      <div className="section-header">
        <div>
          <div className="section-title">Mis Reportes</div>
          <div style={{ fontSize: 13, color: "var(--gray-500)" }}>Historial de reportes creados por ti</div>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>Nuevo Reporte</button>
      </div>
      
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            {loading ? (
              <div className="loading"><span className="spinner" />Cargando reportes...</div>
            ) : reportes.length === 0 ? (
              <div className="empty-state">No tienes reportes aún. ¡Crea el primero!</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Colaborador</th>
                    <th>Estado</th>
                    <th>Fecha Reporte</th>
                  </tr>
                </thead>
                <tbody>
                  {reportes.map(r => {
                    const a = r.attributes;
                    return (
                      <tr key={r.id}>
                        <td style={{ fontWeight: 700, color: "var(--navy)" }}>#{r.id}</td>
                        <td>
                          <div className="collab-cell">
                            <Avatar src={a.colaborador_foto} name={a.colaborador_nombre} size={34} />
                            <div>
                              <div className="collab-name">{a.colaborador_nombre}</div>
                              <div className="collab-doc">{a.colaborador_documento}</div>
                            </div>
                          </div>
                        </td>
                        <td><span className={`badge ${getBadge(a.estado)}`}>{badgeLabel(a.estado)}</span></td>
                        <td style={{ color: "var(--gray-600)" }}>{fmtDate(a.fecha_creacion_manual)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
      
      {showForm && (
        <ReporteForm
          equipo={user.equipo || []}
          user={user}
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); loadReportes(); }}
        />
      )}
    </div>
  );
}