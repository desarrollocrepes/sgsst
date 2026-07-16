import { useState, useEffect, useCallback } from "react";
import { API_EMPLEADOS, API_REPORTES } from "../config/api";
import { fmtDate, getBadge, badgeLabel } from "../utils/helpers";
import { computeStats } from "../utils/stats"; // Mueve la función computeStats aquí
import Avatar from "../components/Avatar";
import CasePanel from "../components/CasePanel";
import BarChart from "../components/charts/BarChart";

export default function SST({ user }) {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kpiFilter, setKpiFilter] = useState("todos");
  const [search, setSearch] = useState("");
  const [soloMios, setSoloMios] = useState(false);
  const [selectedReporte, setSelectedReporte] = useState(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [empleadosByDoc, setEmpleadosByDoc] = useState({});

  const loadReportes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_REPORTES}?populate=*&pagination[pageSize]=40000`);
      const json = await res.json();
      const data = json.data || [];
      setReportes(data);

      const docs = [...new Set(data.map(r => r.attributes?.colaborador_documento).filter(Boolean))];
      if (docs.length) {
        const results = await Promise.all(
          docs.map(async (doc) => {
            try {
              const empRes = await fetch(`${API_EMPLEADOS}?documento=${doc}`);
              const empJson = await empRes.json();
              return { doc, data: empJson.ok && empJson.data?.length ? empJson.data[0] : null };
            } catch {
              return { doc, data: null };
            }
          })
        );

        const map = {};
        results.forEach(({ doc, data: emp }) => {
          if (emp) map[doc] = emp;
        });
        setEmpleadosByDoc(map);
      } else {
        setEmpleadosByDoc({});
      }
    } catch {
      setReportes([]);
      setEmpleadosByDoc({});
    }
    setLoading(false);
  }, []);

  const deleteReporte = async (id, e) => {
    e.stopPropagation(); // Evita que se abra el panel lateral
    if (!window.confirm("¿Estás seguro de que deseas eliminar este reporte?")) return;
    
    try {
      await fetch(`${API_REPORTES}/${id}`, { method: "DELETE" });
      loadReportes(); // Recarga la tabla
    } catch (error) {
      alert("Error al eliminar el reporte.");
    }
  };

  useEffect(() => { loadReportes(); }, [loadReportes]);

  const today = new Date();

  // Cálculos de KPIs
  const kpis = {
    todos: reportes.length,
    abierto: reportes.filter(r => r.attributes.estado?.toLowerCase() === "abierto").length,
    cerrado: reportes.filter(r => r.attributes.estado?.toLowerCase() === "cerrado").length,
    seguimiento: reportes.filter(r => r.attributes.estado?.toLowerCase() === "seguimiento").length,
    vencido: reportes.filter(r => {
      const gs = r.attributes.sstgestions?.data || [];
      return gs.some(g => g.attributes.temporalidad && new Date(g.attributes.temporalidad) < today);
    }).length,
  };

  // Filtros aplicados
  const filtered = reportes.filter(r => {
    const a = r.attributes;
    const estado = a.estado?.toLowerCase();
    
    if (kpiFilter === "abierto" && estado !== "abierto") return false;
    if (kpiFilter === "cerrado" && estado !== "cerrado") return false;
    if (kpiFilter === "seguimiento" && estado !== "seguimiento") return false;
    if (kpiFilter === "vencido") {
      const gs = a.sstgestions?.data || [];
      const vencido = gs.some(g => g.attributes.temporalidad && new Date(g.attributes.temporalidad) < today);
      if (!vencido) return false;
    }
    if (soloMios) {
      const gs = a.sstgestions?.data || [];
      if (!gs.some(g => g.attributes.creador === user.nombre)) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      if (!a.colaborador_nombre?.toLowerCase().includes(q) &&
          !String(a.colaborador_documento).includes(q) &&
          !String(r.id).includes(q)) return false;
    }
    return true;
  });

  const stats = computeStats(reportes, empleadosByDoc);

  function openCase(r) {
    setSelectedReporte(r);
    setPanelOpen(true);
  }

  return (
    <div className="page">
      {/* KPIs Grid */}
      <div className="kpi-grid">
        {[
          { key: "todos", label: "Total", cls: "" },
          { key: "abierto", label: "Abiertos", cls: "kpi-abierto" },
          { key: "cerrado", label: "Cerrados", cls: "kpi-cerrado" },
          { key: "seguimiento", label: "En Seguimiento", cls: "kpi-seguimiento" },
          { key: "vencido", label: "Vencidos", cls: "kpi-vencido" },
        ].map(k => (
          <div key={k.key} className={`kpi-card ${k.cls} ${kpiFilter === k.key ? "active" : ""}`}
            onClick={() => setKpiFilter(kpiFilter === k.key && k.key !== "todos" ? "todos" : k.key)}>
            <div className="kpi-label">{k.label}</div>
            <div className="kpi-value">{kpis[k.key]}</div>
            <div className="kpi-bar" />
          </div>
        ))}
      </div>

      {/* Stats Charts */}
      <div className="section-title" style={{ marginBottom: 14 }}>Estadísticas</div>
      <div className="stats-grid">
        <BarChart title="Estado de Casos" data={stats.estadoCasos} />
        <BarChart title="IMC" data={stats.imc} color="var(--gold)" />
        <BarChart title="Entidad" data={stats.entidad} color="var(--purple)" />
        <BarChart title="Acción Realizada" data={stats.accion} color="var(--teal)" />
        <BarChart title="Sistema Afectado" data={stats.sistema} color="#E53E3E" />
        <BarChart title="Género" data={stats.genero} color="var(--navy)" />
        <BarChart title="Categoría" data={stats.categoria} color="#805AD5" />
        <BarChart title="Diagnósticos CIE" data={stats.diagnostico} color="#D69E2E" />
        <BarChart title="Por Cargo" data={stats.cargo} color="#3182CE" />
        <BarChart title="Edad (rangos)" data={stats.edadRango} color="#805AD5" />
        <BarChart title="Antigüedad (rangos)" data={stats.antiguedadRango} color="#F59E0B" />
        <BarChart title="Área" data={stats.area} color="#0F766E" />
      </div>

      {/* Tabla */}
      <div className="section-header">
        <div className="section-title">Historial de Casos</div>
      </div>
      <button className="btn btn-secondary" onClick={loadReportes} disabled={loading}>
        Recargar
      </button>
      <div className="search-row">
        <input className="search-input" placeholder="Buscar por nombre, CC o ID..." value={search} onChange={e => setSearch(e.target.value)} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={soloMios} onChange={e => setSoloMios(e.target.checked)} />
          Solo casos que he atendido
        </label>
      </div>
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          <div className="table-wrap">
            {loading ? (
              <div className="loading"><span className="spinner" />Cargando...</div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">No hay casos con los filtros seleccionados.</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Colaborador</th>
                    <th>Estado</th>
                    <th>Fecha Reporte</th>
                    <th>Seguimientos</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const a = r.attributes;
                    const nSeg = a.sstgestions?.data?.length || 0;
                    return (
                      <tr key={r.id} className="clickable" onClick={() => openCase(r)}>
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
                        <td>
                          {nSeg > 0
                            ? <span className="seguimiento-counter">{nSeg}</span>
                            : <span style={{ color: "var(--gray-400)", fontSize: 12 }}>—</span>}
                        </td>
                        <td>
                          <button 
                            className="btn btn-danger btn-sm" 
                            style={{ background: "#fee2e2", color: "#dc2626", border: "none" }}
                            onClick={(e) => deleteReporte(r.id, e)}
                            title="Eliminar"
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <CasePanel
        reporte={selectedReporte}
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        user={user}
        onGestionAdded={() => {
          loadReportes();
          if (selectedReporte) {
            fetch(`${API_REPORTES}/${selectedReporte.id}?populate=*`)
              .then(r => r.json())
              .then(j => { if (j.data) setSelectedReporte(j.data); })
              .catch(() => {});
          }
        }}
      />
    </div>
  );
}