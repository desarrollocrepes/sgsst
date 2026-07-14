import { useState, useEffect } from "react";
import { API_EMPLEADOS, API_GESTIONES, API_REPORTES } from "../config/api";
import { calcAge, calcYears, fmtDate, getBadge, badgeLabel } from "../utils/helpers";
import Avatar from "./Avatar";
import GestionForm from "./GestionForm";

export default function CasePanel({ reporte, open, onClose, user, onGestionAdded }) {
  const [empData, setEmpData] = useState(null);
  const [showGestionForm, setShowGestionForm] = useState(false);
  const [gestionToEdit, setGestionToEdit] = useState(null);
  
  // 1. VARIABLES SEGURAS: Agregamos "?." después de attrs para evitar que se rompa si es null
  const attrs = reporte?.attributes;
  const gestiones = attrs?.sstgestions?.data || [];
  const archivos = attrs?.archivo?.data || [];

  // Los Hooks (useEffect) siempre deben ir arriba, no pueden estar después de un "return null"
  useEffect(() => {
    if (!reporte || !open) return;
    fetch(`${API_EMPLEADOS}?documento=${attrs.colaborador_documento}`)
      .then(r => r.json())
      .then(j => { if (j.ok && j.data?.length) setEmpData(j.data[0]); })
      .catch(() => {});
  }, [reporte, open, attrs?.colaborador_documento]);

  const openNewGestion = () => {
    setGestionToEdit(null);
    setShowGestionForm(true);
  };

  const editGestion = (gestion) => {
    setGestionToEdit(gestion);
    setShowGestionForm(true);
  };

  const deleteGestion = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm("¿Estás seguro de eliminar este seguimiento?")) return;
    
    try {
      await fetch(`${API_GESTIONES}/${id}`, { method: "DELETE" });

      const gestionesRestantes = gestiones.filter(g => g.id !== id);
      const estadoNuevo = gestionesRestantes.length > 0 
        ? gestionesRestantes[gestionesRestantes.length - 1].attributes.estado_registrado 
        : "abierto"; 

      await fetch(`${API_REPORTES}/${reporte.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { estado: estadoNuevo } })
      });

      onGestionAdded(); 
    } catch (error) {
      alert("Error al eliminar el seguimiento");
    }
  };

  // 2. RETORNO TEMPRANO: Si no hay reporte, salimos aquí, DESPUÉS de los hooks
  if (!reporte) return null;

  // Cálculos restantes que asumen que 'empData' y 'gestiones' existen de forma segura
  const age = empData ? calcAge(empData.birthday) : null;
  const tenure = empData ? calcYears(empData.ingreso) : null;

  const imcVal = gestiones.length > 0 ? (() => {
    const last = [...gestiones].reverse().find(g => g.attributes.peso_kg && g.attributes.talla_m);
    if (!last) return null;
    return (last.attributes.peso_kg / (last.attributes.talla_m * last.attributes.talla_m)).toFixed(1);
  })() : null;

  return (
    <>
      <div className={`panel-overlay ${open ? "open" : ""}`} onClick={onClose} />
      <div className={`slide-panel ${open ? "open" : ""}`}>
        <div className="panel-header">
          <div>
            <div style={{ fontSize: 11, color: "var(--teal-mid)", marginBottom: 2 }}>Caso #{reporte.id}</div>
            <h2>{attrs.colaborador_nombre}</h2>
          </div>
          <button className="panel-close" onClick={onClose}>✕</button>
        </div>
        <div className="panel-body">
          {/* Ficha Empleado */}
          <div>
            <div className="emp-card">
              <Avatar src={attrs.colaborador_foto || empData?.foto} name={attrs.colaborador_nombre} size={80} />
              <div className="emp-name" style={{ marginTop: 10 }}>{attrs.colaborador_nombre}</div>
              <div className="emp-id">{attrs.colaborador_documento}</div>
              {empData && (
                <div style={{ textAlign: "left" }}>
                  {[
                    ["Cargo", empData.cargo?.trim()],
                    ["Área", empData.area_nombre],
                    ["Departamento", empData.departamento],
                    ["Dirección", empData.direction],
                    ["Celular", empData.Celular],
                    ["Correo", empData.correo],
                    ["Edad", empData.birthday ? `${fmtDate(empData.birthday)} (${age} años)` : "—"],
                    ["Antiguedad", empData.ingreso ? `${fmtDate(empData.ingreso)} (${tenure} años)` : "—"],
                    ["Género", attrs.genero], ...(imcVal ? [["IMC", `${imcVal} kg/m²`]] : []),
                  ].map(([label, val]) => (
                    <div key={label} className="emp-row">
                      <span className="emp-row-label">{label}</span><span className="emp-row-val">{val || "—"}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Detalles Reporte */}
          <div className="report-detail">
            <div className="detail-section">
              <div className="detail-section-title">Reporte</div>
              {[
                ["Categoría", attrs.categoria], ["Tipo Entidad", attrs.tipo_entidad?.toUpperCase()], ["Nombre Entidad", attrs.nombre_entidad],
                ["Estado", <span key="e" className={`badge ${getBadge(attrs.estado)}`}>{badgeLabel(attrs.estado)}</span>],
                ["Fecha Reporte", fmtDate(attrs.fecha_creacion_manual)], ["Creado por", attrs.creador_reporte_nombre],
              ].map(([l, v]) => (
                <div key={l} className="detail-row"><span className="detail-label">{l}:</span><span className="detail-val">{v || "—"}</span></div>
              ))}
              {attrs.descripcion && <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--gray-50)", borderRadius: "var(--radius-sm)", fontSize: 13, color: "var(--gray-700)" }}>{attrs.descripcion}</div>}
              {archivos.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gray-500)", marginBottom: 6 }}>DOCUMENTOS ADJUNTOS</div>
                  {archivos.map(a => (
                    <a key={a.id} href={a.attributes.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--teal)", textDecoration: "none", marginRight: 8 }}>
                      📄 {a.attributes.name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Gestiones */}
            <div className="detail-section">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div className="detail-section-title" style={{ marginBottom: 0 }}>Seguimientos</div>
                <button className="btn btn-primary btn-sm" onClick={openNewGestion}>+ Nueva Gestión</button>
              </div>
              {gestiones.length === 0 && <div className="empty-state" style={{ padding: "16px" }}>Sin gestiones aún.</div>}
              {[...gestiones].reverse().map(g => {
                const ga = g.attributes;
                const imc = ga.peso_kg && ga.talla_m ? (ga.peso_kg / (ga.talla_m * ga.talla_m)).toFixed(1) : null;
                return (
                  <div key={g.id} className="gestion-card">
                    
                    {/* --- AQUÍ ESTÁ EL ENCABEZADO NUEVO CON LOS BOTONES --- */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <div className="gestion-meta" style={{ marginBottom: 0 }}>
                        <span>{ga.creador}</span> · {fmtDate(ga.fecha_hora)} {ga.temporalidad && <> · Vence: {fmtDate(ga.temporalidad)}</>}
                      </div>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button 
                          className="btn btn-secondary btn-sm" 
                          style={{ padding: "2px 6px" }} 
                          onClick={() => editGestion(g)} 
                          title="Editar"
                        >Editar</button>
                        <button 
                          className="btn btn-danger btn-sm" 
                          style={{ padding: "2px 6px", background: "#fee2e2", border:"none", color: "#dc2626" }} 
                          onClick={(e) => deleteGestion(g.id, e)} 
                          title="Eliminar"
                        >Eliminar</button>
                      </div>
                    </div>
                    {/* --- FIN DEL ENCABEZADO CON BOTONES --- */}
                    
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>{ga.accion_realizada?.replace(/_/g, " ")}</div>
                    {ga.sistema_afectado && <div style={{ fontSize: 12, color: "var(--gray-600)" }}>Sistema: {ga.sistema_afectado}</div>}
                    {ga.categoria_cie && <div style={{ fontSize: 12, color: "var(--gray-600)" }}>CIE: {ga.categoria_cie} — {ga.diagnostico}</div>}
                    {imc && <div style={{ fontSize: 12, color: "var(--gray-600)" }}>IMC: {imc} (P:{ga.peso_kg}kg T:{ga.talla_m}m)</div>}
                    {ga.estado_registrado && <div style={{ marginTop: 4 }}><span className={`badge ${getBadge(ga.estado_registrado)}`}>{badgeLabel(ga.estado_registrado)}</span></div>}
                    {ga.descripcion && <div style={{ marginTop: 6, fontSize: 12, color: "var(--gray-600)" }}>{ga.descripcion}</div>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      {showGestionForm && <GestionForm user={user} reporteId={reporte.id} gestionToEdit={gestionToEdit} onClose={() => setShowGestionForm(false)} onSaved={() => { setShowGestionForm(false); onGestionAdded(); }} />}
    </>
  );
}