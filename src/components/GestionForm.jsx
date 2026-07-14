import { useState, useRef } from "react";
import { API_CIE, API_GESTIONES, API_REPORTES } from "../config/api";

function CieSearch({ value, onSelect }) {
  const [query, setQuery] = useState(value?.codigo || "");
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const timerRef = useRef();

  function search(q) {
    setQuery(q);
    clearTimeout(timerRef.current);
    if (!q || q.length < 2) { setResults([]); setOpen(false); return; }
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`${API_CIE}?filters[codigo][$containsi]=${q}`);
        const json = await res.json();
        if (json.data && json.data.length > 0) { setResults(json.data); setOpen(true); }
        else {
          const res2 = await fetch(`${API_CIE}?filters[descripcion][$containsi]=${q}&pageSize=20`);
          const json2 = await res2.json();
          setResults(json2.data || []); setOpen(true);
        }
      } catch { setResults([]); }
    }, 350);
  }

  function select(item) {
    setQuery(item.attributes.codigo + " - " + item.attributes.descripcion);
    setOpen(false);
    onSelect({ codigo: item.attributes.codigo, descripcion: item.attributes.descripcion });
  }

  return (
    <div style={{ position: "relative" }}>
      <input className="form-control" placeholder="Buscar código CIE-10..." value={query} onChange={e => search(e.target.value)} onFocus={() => results.length && setOpen(true)} />
      {open && results.length > 0 && (
        <div className="cie-dropdown">
          {results.map(r => (
            <div key={r.id} className="cie-item" onClick={() => select(r)}>
              <strong>{r.attributes.codigo}</strong> — {r.attributes.descripcion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// En tu archivo GestionForm.jsx (donde está el formulario de seguimientos)
export default function GestionForm({ user, reporteId, gestionToEdit, onClose, onSaved }) {
  // 1. Prellenar el estado si estamos editando, si no, valores por defecto
  const [form, setForm] = useState(
    gestionToEdit ? {
      fecha_hora: gestionToEdit.attributes.fecha_hora,
      temporalidad: gestionToEdit.attributes.temporalidad || "",
      accion_realizada: gestionToEdit.attributes.accion_realizada || "",
      sistema_afectado: gestionToEdit.attributes.sistema_afectado || "",
      estado_registrado: gestionToEdit.attributes.estado_registrado || "seguimiento",
      peso_kg: gestionToEdit.attributes.peso_kg || "",
      talla_m: gestionToEdit.attributes.talla_m || "",
      diagnostico: gestionToEdit.attributes.diagnostico || "",
      descripcion: gestionToEdit.attributes.descripcion || "",
      diagnostico_sst: gestionToEdit.attributes.diagnostico_sst || "",
    } : { 
      fecha_hora: new Date().toISOString().split("T")[0], 
      temporalidad: "", 
      accion_realizada: "", 
      sistema_afectado: "", 
      estado_registrado: "seguimiento", // Por defecto
      peso_kg: "", 
      talla_m: "", 
      diagnostico: "", 
      descripcion: "" ,
      diagnostico_sst: "",
    }
  );
  
  // Si editamos, inicializamos el CIE
  const [cie, setCie] = useState(
    gestionToEdit?.attributes.categoria_cie 
      ? { codigo: gestionToEdit.attributes.categoria_cie, descripcion: gestionToEdit.attributes.diagnostico } 
      : null
  );
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  async function submit() {
    if (!form.accion_realizada) { setError("Selecciona una acción realizada."); return; }
    setSaving(true); setError("");
    try {
      // 2. Determinar si creamos (POST) o actualizamos (PUT)
      const isEditing = !!gestionToEdit;
      const method = isEditing ? "PUT" : "POST";
      const endpoint = isEditing ? `${API_GESTIONES}/${gestionToEdit.id}` : API_GESTIONES;

      const resGestion = await fetch(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          data: { 
            creador: user.nombre, 
            fecha_hora: form.fecha_hora, 
            temporalidad: form.temporalidad || null, 
            accion_realizada: form.accion_realizada, 
            sistema_afectado: form.sistema_afectado, 
            estado_registrado: form.estado_registrado, 
            peso_kg: form.peso_kg ? parseFloat(form.peso_kg) : null, 
            talla_m: form.talla_m ? parseFloat(form.talla_m) : null, 
            categoria_cie: cie?.codigo || null, 
            diagnostico: cie?.descripcion || form.diagnostico, 
            descripcion: form.descripcion, 
            diagnostico_sst: form.diagnostico_sst || null,
            sstreporte: reporteId 
          } 
        }),
      });

      if (!resGestion.ok) throw new Error("Error guardando gestión.");

      // 3. SINCRONIZAR ESTADO DEL REPORTE GLOBAL
      await fetch(`${API_REPORTES}/${reporteId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { estado: form.estado_registrado } })
      });

      onSaved();
    } catch (e) { setError(e.message); }
    setSaving(false);
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">{gestionToEdit ? "Editar Seguimiento" : "Nuevo Seguimiento"}</div>
        <div className="form-grid">
          <div className="form-group"><label className="form-label">Fecha</label><input type="date" className="form-control" value={form.fecha_hora} onChange={e => set("fecha_hora", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Temporalidad (Vence)</label><input type="date" className="form-control" value={form.temporalidad} onChange={e => set("temporalidad", e.target.value)} /></div>
          <div className="form-group">
            <label className="form-label">Acción Realizada *</label>
            <select className="form-control" value={form.accion_realizada} onChange={e => set("accion_realizada", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="Compromiso de Autocuidado">Compromiso de Autocuidado</option>
              <option value="Acta de Seguimiento">Acta de Seguimiento</option>
              <option value="Autorización de Lonchera">Autorización de Lonchera</option>
              <option value="Reincorporación Laboral">Reincorporación Laboral</option>
              <option value="Cierre de Reincorporación">Cierre de Reincorporación</option>
              <option value="Seguimiento">Seguimiento</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Sistema Afectado</label>
            <select className="form-control" value={form.sistema_afectado} onChange={e => set("sistema_afectado", e.target.value)}>
              <option value="">Seleccionar...</option>
              <option value="Cardiovascular">Cardiovascular</option>
              <option value="Dermatologico">Dermatologico</option>
              <option value="Gastrointestinal">Gastrointestinal</option>
              <option value="Genitourinario">Genitourinario</option>
              <option value="Inmunologico">Inmunologico</option>
              <option value="Neurologico">Neurologico</option>
              <option value="Respiratorio">Respiratorio</option>
              <option value="Alimenticio">Alimenticio</option>
              <option value="Neoplasias">Neoplasias</option>
              <option value="Auditivo">Auditivo</option>
              <option value="Otro">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Actualizar Estado</label>
            <select className="form-control" value={form.estado_registrado} onChange={e => set("estado_registrado", e.target.value)}>
              <option value="seguimiento">En Seguimiento</option>
              <option value="cerrado">Cerrado</option>
            </select>
          </div>
          <div className="form-group"><label className="form-label">Peso (Kg)</label><input type="number" className="form-control" placeholder="60" value={form.peso_kg} onChange={e => set("peso_kg", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Talla (M)</label><input type="number" className="form-control" placeholder="1.70" step="0.01" value={form.talla_m} onChange={e => set("talla_m", e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Código CIE-10</label><CieSearch value={cie} onSelect={c => { setCie(c); set("diagnostico", c.descripcion); }} /></div>
          <div className="form-group full"><label className="form-label">Diagnóstico</label><input className="form-control" disabled value={form.diagnostico} onChange={e => set("diagnostico", e.target.value)} placeholder="Auto desde CIE-10..." /></div>
          <div className="form-group full"><label className="form-label">Diagnóstico SST</label><textarea className="form-control" rows={3} placeholder="Descripción del diagnóstico..." value={form.diagnostico_sst} onChange={e => set("diagnostico_sst", e.target.value)} /></div>
          <div className="form-group full"><label className="form-label">Observaciones</label><textarea className="form-control" rows={3} placeholder="Notas adicionales..." value={form.descripcion} onChange={e => set("descripcion", e.target.value)} /></div>
        </div>

        {error && <div className="login-error" style={{ marginTop: 12 }}>{error}</div>}
        <div style={{ display: "flex", gap: 10, marginTop: 20, justifyContent: "flex-end" }}>
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? "Guardando..." : "Guardar Gestión"}</button>
        </div>
      </div>
    </div>
  );
}