import { useState } from "react";
import { API_EMPLEADOS, API_REPORTES } from "../config/api";
import Avatar from "./Avatar";

function CollabSelector({ equipo, onSelect, selected }) {
  const [search, setSearch] = useState("");
  const [apiResult, setApiResult] = useState(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState("");

  async function searchByDoc() {
    if (!search.trim()) return;
    setApiLoading(true); setApiError(""); setApiResult(null);
    try {
      const res = await fetch(`${API_EMPLEADOS}?documento=${search.trim()}`);
      const json = await res.json();
      if (json.ok && json.data?.length) setApiResult(json.data[0]);
      else setApiError("No encontrado.");
    } catch { setApiError("Error de conexión."); }
    setApiLoading(false);
  }

  const filtered = equipo?.filter(e =>
    !search || e.nombre?.toLowerCase().includes(search.toLowerCase()) || String(e.document_number).includes(search)
  ) || [];

  return (
    <div>
      <div className="form-control" style={{ display: "flex", gap: 6, padding: "4px 8px", marginBottom: 6 }}>
        <input style={{ flex: 1, border: "none", outline: "none", fontSize: 13, fontFamily: "var(--font-main)" }} placeholder="Buscar por nombre o CC..." value={search} onChange={e => { setSearch(e.target.value); setApiResult(null); setApiError(""); }} />
        <button className="btn btn-primary btn-sm" onClick={searchByDoc} disabled={apiLoading}>{apiLoading ? "..." : "Buscar CC"}</button>
      </div>
      {apiError && <div style={{ fontSize: 12, color: "var(--red)", marginBottom: 6 }}>{apiError}</div>}
      <div style={{ border: "1.5px solid var(--gray-200)", borderRadius: "var(--radius-sm)", maxHeight: 180, overflowY: "auto" }}>
        {apiResult && (
          <div className="collab-select-item" style={{ background: "var(--teal-light)" }} onClick={() => onSelect(apiResult)}>
            <Avatar src={apiResult.foto} name={apiResult.nombre} size={30} />
            <div><div style={{ fontWeight: 600 }}>{apiResult.nombre}</div><div style={{ fontSize: 11, color: "var(--gray-500)" }}>{apiResult.document_number} · {apiResult.cargo}</div></div>
          </div>
        )}
        {filtered.map(e => (
          <div key={e.document_number} className="collab-select-item" style={selected?.document_number === e.document_number ? { background: "var(--teal-light)" } : {}} onClick={() => onSelect(e)}>
            <Avatar src={e.foto} name={e.nombre} size={30} />
            <div><div style={{ fontWeight: 600 }}>{e.nombre}</div><div style={{ fontSize: 11, color: "var(--gray-500)" }}>{e.document_number}</div></div>
          </div>
        ))}
        {!filtered.length && !apiResult && <div style={{ padding: "12px", fontSize: 12, color: "var(--gray-400)", textAlign: "center" }}>Sin resultados. Busca por CC arriba.</div>}
      </div>
    </div>
  );
}

export default function ReporteForm({ equipo, user, onClose, onSaved }) {
  const [collab, setCollab] = useState(null);
  const [form, setForm] = useState({ 
    categoria: "", 
    genero: "", 
    fecha: new Date().toISOString().split("T")[0], 
    tipo_entidad: "", 
    nombre_entidad: "", 
    descripcion: "" 
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function submit() {
    if (!collab) { setError("Selecciona un colaborador."); return; }
    if (!form.categoria || !form.genero || !form.tipo_entidad) { setError("Completa los campos obligatorios."); return; }
    
    setSaving(true); 
    setError("");

    try {
      // Preparamos los datos del formulario de Reportes
      const payloadData = {
        colaborador_documento: collab.document_number, 
        colaborador_nombre: collab.nombre, 
        colaborador_foto: collab.foto || "", 
        genero: form.genero, 
        categoria: form.categoria, 
        tipo_entidad: form.tipo_entidad, 
        nombre_entidad: form.nombre_entidad, 
        descripcion: form.descripcion, 
        estado: "abierto", 
        fecha_creacion_manual: form.fecha, 
        creador_reporte_nombre: user.nombre 
      };

      // Usamos FormData para que funcione el envío del archivo
      const formData = new FormData();
      formData.append("data", JSON.stringify(payloadData));

      if (file) {
        // Recuerda cambiar "adjunto" por el nombre exacto de tu campo en Strapi
        formData.append("files.adjunto", file); 
      }

      // Hacemos el fetch a API_REPORTES, sin Content-Type
      const res = await fetch(API_REPORTES, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Detalles del Error 400 de Strapi:", errorData.error);
        const strapiMsg = errorData?.error?.message || "Error guardando reporte";
        throw new Error(`Strapi dice: ${strapiMsg}`);
      }

      onSaved();
    } catch (e) { 
      setError(e.message); 
    }
    setSaving(false);
  }
  
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Reporte</div>
        <div className="form-grid cols-1" style={{ marginBottom: 14 }}>
          <div className="form-group">
            <label className="form-label">Colaborador *</label>
            <CollabSelector equipo={equipo} onSelect={setCollab} selected={collab} />
            {collab && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--teal-light)", borderRadius: "var(--radius-sm)", marginTop: 6, fontSize: 13 }}>
                <Avatar src={collab.foto} name={collab.nombre} size={28} />
                <span style={{ fontWeight: 600 }}>{collab.nombre}</span>
                <span style={{ color: "var(--gray-500)" }}>· {collab.document_number}</span>
              </div>
            )}
          </div>
        </div>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Categoría del Evento *</label>
            <select className="form-control" value={form.categoria} onChange={e => set("categoria", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="Reincorporacion Postincapacidad">Reincorporación Postincapacidad</option>
              <option value="Recomendaciones Medicas">Recomendaciones Médicas</option>
              <option value="Recomendaciones Nutricionales">Recomendaciones Nutricionales</option>
              <option value="Incapacidades Recurrentes">Incapacidades Recurrentes</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Género *</label>
            <select className="form-control" value={form.genero} onChange={e => set("genero", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="Mujer">Mujer</option>
              <option value="Hombre">Hombre</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Fecha de Creación</label>
            <input type="date" className="form-control" value={form.fecha} onChange={e => set("fecha", e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Tipo de Entidad *</label>
            <select className="form-control" value={form.tipo_entidad} onChange={e => set("tipo_entidad", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="EPS">EPS</option>
              <option value="ARL">ARL</option>
              <option value="Medicina Prepagada">Medicina Prepagada</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Nombre de la Entidad</label>
            <input className="form-control" placeholder="Ej: Sanitas..." value={form.nombre_entidad} onChange={e => set("nombre_entidad", e.target.value)} />
          </div>
          <div className="form-group full">
            <label className="form-label">Descripción Detallada</label>
            <textarea className="form-control" rows={3} placeholder="Describa la situación..." value={form.descripcion} onChange={e => set("descripcion", e.target.value)} />
          </div>
          <div className="form-group full">
            <label className="form-label">Adjuntar Documento</label>
            <div className="file-upload-area" onClick={() => document.getElementById("file-inp").click()}>{file ? file.name : "Haz clic para adjuntar archivo"}</div>
            <input id="file-inp" type="file" style={{ display: "none" }} onChange={e => setFile(e.target.files[0])} />
          </div>
        </div>
        {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar Reporte"}</button>
        </div>
      </div>
    </div>
  );
}