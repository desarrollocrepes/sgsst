import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import axios from 'axios';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer 
} from 'recharts';
import "./VistaSST.css";
import { ArrowDown, ArrowUp, CircleX } from 'lucide-react';

// --- CONSTANTES ---
const API_BASE = 'https://macfer.crepesywaffles.com/api';
const BUK_API = 'https://apialohav2.crepesywaffles.com/buk';
const COLORES = ['#1abc9c', '#3498db', '#9b59b6', '#34495e', '#f1c40f', '#e67e22', '#e74c3c', '#95a5a6'];

// --- FUNCIONES AUXILIARES ---
const calcularEdad = (birthday) => birthday ? dayjs().diff(dayjs(birthday), 'year') : 'N/A';
const calcularAntiguedad = (ingreso) => ingreso ? dayjs().diff(dayjs(ingreso), 'year') : 'N/A';
const calcularIMC = (peso, talla) => (peso && talla) ? (peso / (talla * talla)).toFixed(2) : 'N/A';

const verificarVencimiento = (gestionesData) => {
  if (!gestionesData || gestionesData.length === 0) return false;
  return gestionesData.some(g => {
    const temp = g.attributes.temporalidad;
    return temp && dayjs().isAfter(dayjs(temp), 'day');
  });
};

// Obtiene la gestión más reciente de un reporte para filtros y gráficos
const obtenerUltimaGestion = (rep) => {
  const gestiones = rep.attributes.sstgestions?.data;
  if (!gestiones || gestiones.length === 0) return null;
  return gestiones[gestiones.length - 1]?.attributes;
};

// Función para agrupar datos para los gráficos
const contarFrecuencias = (data, accessor) => {
  const counts = {};
  data.forEach(item => {
    const val = accessor(item) || 'Sin Datos';
    counts[val] = (counts[val] || 0) + 1;
  });
  return Object.keys(counts)
    .map(key => ({ name: key, value: counts[key] }))
    .sort((a, b) => b.value - a.value); // Orden descendente
};

export default function VistaSST() {
  const navigate = useNavigate();
  const [sst, setSst] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [datosBukColaborador, setDatosBukColaborador] = useState(null);
  const [cargandoCruceBuk, setCargandoCruceBuk] = useState(false);
  const [mostrarFormSeguimiento, setMostrarFormSeguimiento] = useState(false);
  const [gestionEnEdicion, setGestionEnEdicion] = useState(null);
  
  // --- ESTADOS DE FILTROS ---
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroMisCasos, setFiltroMisCasos] = useState(false);
  const [filtroVencidos, setFiltroVencidos] = useState(false);
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroSistema, setFiltroSistema] = useState('');
  const [filtroDiagnostico, setFiltroDiagnostico] = useState('');

  const { register, handleSubmit, reset, setValue } = useForm();

  // --- EFECTOS ---
  useEffect(() => {
    const usuario = localStorage.getItem('usuarioLogueado');
    if (usuario) {
      const userParsed = JSON.parse(usuario);
      if (userParsed.departamento === "Seguridad y Salud en el Trabajo") {
        setSst(userParsed);
      } else {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const cargarReportesSST = async () => {
    try {
      setCargandoGlobal(true);
      const response = await axios.get(`${API_BASE}/sstreportes?populate=sstgestions&sort=createdAt:desc`);
      const data = response.data.data || [];
      setReportes(data);

      if (casoSeleccionado) {
        const casoActualizado = data.find(r => r.id === casoSeleccionado.id);
        if (casoActualizado) setCasoSeleccionado(casoActualizado);
      }
    } catch (error) {
      console.error("Error al consultar reportes generales:", error);
    } finally {
      setCargandoGlobal(false);
    }
  };

  useEffect(() => {
    if (sst) cargarReportesSST();
  }, [sst]);

  useEffect(() => {
    if (casoSeleccionado && !datosBukColaborador) {
      const doc = casoSeleccionado.attributes.colaborador_documento;
      setCargandoCruceBuk(true);
      axios.get(`${BUK_API}/empleados3?documento=${doc}`)
        .then(res => {
          if (res.data.ok && res.data.data.length > 0) setDatosBukColaborador(res.data.data[0]);
        })
        .catch(err => console.error("Error Buk:", err))
        .finally(() => setCargandoCruceBuk(false));
    }
  }, [casoSeleccionado]);

  // --- LÓGICA DE FILTRADO ---
  const reportesFiltrados = useMemo(() => {
    return reportes.filter(rep => {
      const attrs = rep.attributes;
      const ultGestion = obtenerUltimaGestion(rep);
      const estaVencido = verificarVencimiento(attrs.sstgestions?.data);

      // 1. Búsqueda por texto libre
      if (filtroBusqueda) {
        const str = `${rep.id} ${attrs.colaborador_nombre} ${attrs.colaborador_documento}`.toLowerCase();
        if (!str.includes(filtroBusqueda.toLowerCase())) return false;
      }
      // 2. Mis Casos
      if (filtroMisCasos) {
        if (attrs.creador_reporte_nombre !== sst?.nombre && ultGestion?.creador !== sst?.nombre) return false;
      }
      // 3. Vencidos
      if (filtroVencidos && (!estaVencido || attrs.estado === 'cerrado')) return false;
      // 4. Acción Realizada
      if (filtroAccion && ultGestion?.accion_realizada !== filtroAccion) return false;
      // 5. Sistema Afectado
      if (filtroSistema && ultGestion?.sistema_afectado !== filtroSistema) return false;
      // 6. Diagnóstico
      if (filtroDiagnostico && (!ultGestion?.diagnostico || !ultGestion.diagnostico.toLowerCase().includes(filtroDiagnostico.toLowerCase()))) return false;

      return true;
    });
  }, [reportes, filtroBusqueda, filtroMisCasos, filtroVencidos, filtroAccion, filtroSistema, filtroDiagnostico, sst]);

  // --- MÉTRICAS Y GRÁFICOS (Basados en resultados filtrados) ---
  const metricas = {
    abiertos: reportesFiltrados.filter(r => r.attributes.estado === 'abierto').length,
    seguimiento: reportesFiltrados.filter(r => r.attributes.estado === 'seguimiento').length,
    cerrados: reportesFiltrados.filter(r => r.attributes.estado === 'cerrado').length,
    total: reportesFiltrados.length
  };

  const datosEstado = [
    { name: 'Abiertos', value: metricas.abiertos, color: '#e74c3c' },
    { name: 'En Seguimiento', value: metricas.seguimiento, color: '#f39c12' },
    { name: 'Cerrados', value: metricas.cerrados, color: '#2ecc71' }
  ];

  const datosEntidad = contarFrecuencias(reportesFiltrados, r => r.attributes.nombre_entidad);
  const datosGenero = contarFrecuencias(reportesFiltrados, r => r.attributes.genero);
  const datosAccion = contarFrecuencias(reportesFiltrados, r => obtenerUltimaGestion(r)?.accion_realizada);
  const datosSistema = contarFrecuencias(reportesFiltrados, r => obtenerUltimaGestion(r)?.sistema_afectado);
  const datosDiagnostico = contarFrecuencias(reportesFiltrados, r => obtenerUltimaGestion(r)?.diagnostico);
  
  // (Nota: Edad y Antigüedad requieren datos locales. Mostramos lo que haya en 'attributes' si existe)
  const datosEdad = contarFrecuencias(reportesFiltrados, r => r.attributes.edad ? `${r.attributes.edad} años` : null);

  // Cálculo especial para IMC
  const calcularGraficoIMC = () => {
    let bajo = 0, normal = 0, sobrepeso = 0, obesidad = 0, sinDatos = 0;
    reportesFiltrados.forEach(rep => {
      const ult = obtenerUltimaGestion(rep);
      const imcStr = calcularIMC(ult?.peso_kg, ult?.talla_m);
      if (imcStr === 'N/A') { sinDatos++; return; }
      const imc = parseFloat(imcStr);
      if (imc < 18.5) bajo++;
      else if (imc < 25) normal++;
      else if (imc < 30) sobrepeso++;
      else obesidad++;
    });
    return [
      { name: 'Bajo Peso', value: bajo }, { name: 'Normal', value: normal },
      { name: 'Sobrepeso', value: sobrepeso }, { name: 'Obesidad', value: obesidad }
    ].filter(d => d.value > 0);
  };
  const datosIMC = calcularGraficoIMC();

  // Opciones únicas para selects de filtros
  const opcionesAcciones = [...new Set(reportes.map(r => obtenerUltimaGestion(r)?.accion_realizada).filter(Boolean))];
  const opcionesSistemas = [...new Set(reportes.map(r => obtenerUltimaGestion(r)?.sistema_afectado).filter(Boolean))];

  // --- HANDLERS ---
  const handleEditarGestion = (gestion) => {
    setGestionEnEdicion(gestion);
    setMostrarFormSeguimiento(true);
    const attrs = gestion.attributes;
    
    setValue('fechaHistorial', attrs.fecha_hora ? dayjs(attrs.fecha_hora).format('YYYY-MM-DD') : '');
    setValue('accion', attrs.accion_realizada);
    setValue('sistema', attrs.sistema_afectado);
    setValue('nuevoEstado', attrs.estado_registrado || casoSeleccionado.attributes.estado);
    setValue('pesoKg', attrs.peso_kg);
    setValue('tallaM', attrs.talla_m);
    setValue('diagnostico', attrs.diagnostico);
    setValue('descripcion', attrs.descripcion);
    setValue('temporalidad', attrs.temporalidad ? dayjs(attrs.temporalidad).format('YYYY-MM-DD') : '');
  };

  const handleEliminarGestion = async (id) => {
    if (window.confirm("¿Seguro que desea eliminar este seguimiento?")) {
      try {
        await axios.delete(`${API_BASE}/sstgestions/${id}`);
        alert("Seguimiento eliminado");
        cargarReportesSST();
      } catch (error) {
        console.error("Error al eliminar gestión", error);
      }
    }
  };

  const onSubmitGestionSST = async (data) => {
    try {
      const fechaFinalIso = data.fechaHistorial ? new Date(data.fechaHistorial).toISOString() : new Date().toISOString();
      const temporalidadIso = data.temporalidad ? new Date(data.temporalidad).toISOString() : null;

      const payloadGestion = {
        data: {
          creador: sst.nombre,
          fecha_hora: fechaFinalIso,
          accion_realizada: data.accion,
          sistema_afectado: data.sistema,
          peso_kg: Number(data.pesoKg),
          talla_m: Number(data.tallaM),
          diagnostico: data.diagnostico,
          descripcion: data.descripcion,
          temporalidad: temporalidadIso,
          estado_registrado: data.nuevoEstado,
          sstreporte: casoSeleccionado.id
        }
      };

      if (gestionEnEdicion) {
        await axios.put(`${API_BASE}/sstgestions/${gestionEnEdicion.id}`, payloadGestion);
      } else {
        await axios.post(`${API_BASE}/sstgestions`, payloadGestion);
      }

      if (casoSeleccionado.attributes.estado !== data.nuevoEstado) {
        await axios.put(`${API_BASE}/sstreportes/${casoSeleccionado.id}`, {
          data: { estado: data.nuevoEstado }
        });
      }

      alert(gestionEnEdicion ? "Seguimiento actualizado" : "Seguimiento guardado exitosamente");
      cerrarModal();
      cargarReportesSST();
    } catch (error) {
      console.error("Error al procesar el seguimiento en Strapi:", error);
      alert("Hubo un fallo al sincronizar la información.");
    }
  };

  const cerrarModal = () => {
    setCasoSeleccionado(null);
    setDatosBukColaborador(null);
    setMostrarFormSeguimiento(false);
    setGestionEnEdicion(null);
    reset();
  };

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioLogueado');
    navigate('/login');
  };

  // --- COMPONENTES AUXILIARES ---
  const CustomBarChart = ({ data, title }) => (
    <div className="sst-chart-card">
      <h4>{title}</h4>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 11}} />
            <Tooltip />
            <Bar dataKey="value" fill="#3498db" radius={[0, 4, 4, 0]}>
              {data.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <p>No hay datos</p>}
    </div>
  );

  if (!sst) return <p style={{textAlign: 'center', marginTop: '2rem'}}>Cargando panel operacional...</p>;

  return (
    <div className="sst-wrapper">
      
      {/* NAVBAR */}
      <nav className="sst-navbar">
        <div className="sst-navbar-user">
          <img src={sst.foto} alt={sst.nombre} />
          <div>
            <h4>{sst.nombre}</h4>
            <small>{sst.departamento}</small>
          </div>
        </div>
        <button className="sst-btn-logout" onClick={cerrarSesion}>Salir</button>
      </nav>

      <div className="sst-container">
        {cargandoGlobal ? <p>Cargando información del servidor...</p> : (
          <>
            {/* BARRA DE FILTROS */}
            <div className="sst-filters">
              <input 
                type="text" placeholder="Buscar ID, Nombre o Documento..." 
                value={filtroBusqueda} onChange={e => setFiltroBusqueda(e.target.value)}
              />
              
              <select value={filtroAccion} onChange={e => setFiltroAccion(e.target.value)}>
                <option value="">Todas las Acciones</option>
                {opcionesAcciones.map(acc => <option key={acc} value={acc}>{acc}</option>)}
              </select>

              <select value={filtroSistema} onChange={e => setFiltroSistema(e.target.value)}>
                <option value="">Todos los Sistemas</option>
                {opcionesSistemas.map(sis => <option key={sis} value={sis}>{sis}</option>)}
              </select>

              <input 
                type="text" placeholder="Diagnóstico médico..." 
                value={filtroDiagnostico} onChange={e => setFiltroDiagnostico(e.target.value)}
              />

              <label>
                <input type="checkbox" checked={filtroMisCasos} onChange={e => setFiltroMisCasos(e.target.checked)} /> Mis Casos
              </label>

              <label>
                <input type="checkbox" checked={filtroVencidos} onChange={e => setFiltroVencidos(e.target.checked)} /> Solo Vencidos
              </label>
            </div>

            {/* KPIs */}
            <div className="sst-kpis">
              <div className="sst-kpi-card">
                <h2>{metricas.total}</h2><small>Casos (Filtrados)</small>
              </div>
              <div className="sst-kpi-card" style={{borderBottomColor: 'var(--danger)'}}>
                <h2>{metricas.abiertos}</h2><small>Abiertos</small>
              </div>
              <div className="sst-kpi-card" style={{borderBottomColor: 'var(--warning)'}}>
                <h2>{metricas.seguimiento}</h2><small>En Seguimiento</small>
              </div>
              <div className="sst-kpi-card" style={{borderBottomColor: 'var(--success)'}}>
                <h2>{metricas.cerrados}</h2><small>Cerrados</small>
              </div>
            </div>

            {/* PANEL DE GRÁFICOS */}
            <div className="sst-charts-grid">
              
              {/* Gráfico de Estado (Circular) */}
              <div className="sst-chart-card">
                <h4>Estado General</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={datosEstado} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                      {datosEstado.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" wrapperStyle={{fontSize: '12px'}} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <CustomBarChart data={datosIMC} title="Distribución por IMC" />
              <CustomBarChart data={datosSistema} title="Sistemas Afectados" />
              <CustomBarChart data={datosAccion} title="Acciones Frecuentes" />
              <CustomBarChart data={datosEntidad} title="Entidades" />
              <CustomBarChart data={datosGenero} title="Distribución de Género" />
              <CustomBarChart data={datosDiagnostico} title="Top 5 Diagnósticos" />
            </div>

            {/* TABLA PRINCIPAL */}
            <div className="sst-table-section">
              <h3>Listado de Reportes</h3>
              <div className="sst-table-responsive">
                <table className="sst-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Colaborador</th>
                      <th>Estado</th>
                      <th>Última Acción</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportesFiltrados.length === 0 ? (
                      <tr><td colSpan="5" style={{textAlign: 'center', padding: '2rem'}}>No hay resultados que coincidan con los filtros.</td></tr>
                    ) : (
                      reportesFiltrados.map(rep => {
                        const estaVencido = verificarVencimiento(rep.attributes.sstgestions?.data) && rep.attributes.estado !== 'cerrado';
                        const ultGestion = obtenerUltimaGestion(rep);
                        
                        return (
                          <tr key={rep.id} onClick={() => setCasoSeleccionado(rep)}>
                            <td><strong>#{rep.id}</strong></td>
                            <td>
                              <div className="sst-user-cell">
                                <img src={rep.attributes.colaborador_foto} alt="img" />
                                <div>
                                  <span>{rep.attributes.colaborador_nombre}</span><br/>
                                  <small>Doc: {rep.attributes.colaborador_documento}</small>
                                </div>
                              </div>
                            </td>
                            <td>
                              <span style={{ 
                                padding: '4px 10px', borderRadius: '12px', fontSize: '11px', color: 'white', fontWeight: 'bold', textTransform: 'uppercase',
                                backgroundColor: rep.attributes.estado === 'abierto' ? 'var(--danger)' : rep.attributes.estado === 'seguimiento' ? 'var(--warning)' : 'var(--success)'
                              }}>
                                {rep.attributes.estado}
                              </span>
                              {estaVencido && (
                                <span style={{display: 'block', fontSize: '11px', marginTop: '4px', color: 'var(--danger)'}}>⚠️ VENCIDO</span>
                              )}
                            </td>
                            <td>
                              {ultGestion ? (
                                <>
                                  <span>{ultGestion.accion_realizada}</span><br/>
                                  <small style={{color: 'var(--text-muted)'}}>{dayjs(ultGestion.fecha_hora).format('DD/MM/YY')}</small>
                                </>
                              ) : <span style={{color: '#999'}}>Sin gestión</span>}
                            </td>
                            <td><button className="sst-btn-action">Abrir</button></td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {/* MODAL DE GESTIÓN AVANZADA (SLIDE MODAL) */}
{casoSeleccionado && (
  <div className="sst-modal-overlay" onClick={cerrarModal}>
    {/* Evitamos que los clicks dentro del modal lo cierren */}
    <div className="sst-modal-content" onClick={(e) => e.stopPropagation()}>
      
      {/* ================= COLUMNA IZQUIERDA: PERFIL ================= */}
      <div className="sst-modal-sidebar">
        {cargandoCruceBuk ? (
          <p>Consultando datos de Buk...</p>
        ) : datosBukColaborador ? (
          <>
            <img 
              className="sst-sidebar-avatar" 
              src={datosBukColaborador.foto || casoSeleccionado.attributes.colaborador_foto} 
              alt="Colaborador" 
            />
            <h3 className="sst-sidebar-name">{datosBukColaborador.nombre}</h3>
            <p className="sst-sidebar-uid">{datosBukColaborador.document_number}</p>
            <p className="sst-sidebar-gender">{casoSeleccionado.attributes.genero || 'No especificado'}</p>

            {/* Ficha técnica estructurada */}
            <div className="sst-sidebar-card">
              <div className="sst-sidebar-row">
                <span className="sst-row-label">Área<br/>Cargo</span>
                <span className="sst-row-value">
                  {datosBukColaborador.area_nombre}<br/>
                  <strong>{datosBukColaborador.cargo}</strong>
                </span>
              </div>

              <div className="sst-sidebar-row">
                <span className="sst-row-label">Dirección<br/>Departamento</span>
                <span className="sst-row-value">
                  {datosBukColaborador.direction || 'N/A'}<br/>
                  {datosBukColaborador.departamento}
                </span>
              </div>

              <div className="sst-sidebar-row">
                <span className="sst-row-label">Nacimiento</span>
                <span className="sst-row-value">
                  {datosBukColaborador.birthday} ({calcularEdad(datosBukColaborador.birthday)} años)
                </span>
              </div>

              <div className="sst-sidebar-row">
                <span className="sst-row-label">Ingreso</span>
                <span className="sst-row-value">{datosBukColaborador.ingreso || 'N/A'}</span>
              </div>

              <div className="sst-sidebar-row">
                <span className="sst-row-label">Correo<br/>Celular</span>
                <span className="sst-row-value">
                  {datosBukColaborador.correo}<br/>
                  {datosBukColaborador.Celular || 'N/A'}
                </span>
              </div>
            </div>
          </>
        ) : (
          <p>No se pudo cruzar la información con Buk.</p>
        )}
      </div>

      <div className="sst-modal-main">
        
        {/* Cabecera del Reporte */}
        <div className="sst-main-header">
          <div className="sst-header-title-area">
            <h2>Reporte #{casoSeleccionado.id}</h2>
            <span className="sst-badge-estado">
              {casoSeleccionado.attributes.estado}
            </span>
          </div>
          <button className="sst-btn-close-circle" onClick={cerrarModal}>
            <CircleX />
          </button>
        </div>

        {/* Historial de Seguimientos */}
        <div className="sst-main-scrollable">

          <div className="sst-box-descripcion">
            <p style={{ marginBottom: '1rem', color: '#64748b', fontSize: '0.85rem' }}>
              Creado por <strong>{casoSeleccionado.attributes.creador_reporte_nombre}</strong> el {casoSeleccionado.attributes.fecha_creacion_manual || new Date(casoSeleccionado.attributes.createdAt).toLocaleString()}
            </p>
            <p>
              Se registra un reporte de <strong>{casoSeleccionado.attributes.categoria || 'SST'}</strong> para la entidad <strong>{casoSeleccionado.attributes.tipo_entidad} {casoSeleccionado.attributes.nombre_entidad}</strong>.
            </p>
            <p style={{ marginTop: '0.5rem', italic: 'true' }}>
              "{casoSeleccionado.attributes.descripcion}"
            </p>
          </div>

          <h4 className="sst-section-title">Historial de Seguimientos</h4>
          
          {casoSeleccionado.attributes.sstgestions?.data?.length === 0 ? (
            <p className="sst-no-data">No hay seguimientos registrados aún para esta novedad</p>
          ) : (
            <ul className="sst-history-list">
              {casoSeleccionado.attributes.sstgestions?.data?.map((gestion) => {
                const attrs = gestion.attributes;
                const estaVencidoInd = attrs.temporalidad && dayjs().isAfter(dayjs(attrs.temporalidad), 'day');

                return (
                  <li key={gestion.id} className="sst-history-item">
                    <div className="sst-history-main">
                      
                      {/* Cabecera */}
                      <div className="sst-history-header">
                        <span>Creado por <strong>{attrs.creador}</strong> el {dayjs(attrs.fecha_hora).format('DD/MM/YYYY')}</span>
                        <span className="sst-history-status">{attrs.estado_registrado || 'N/A'}</span>
                      </div>

                      {/* Acción */}
                      <div className="sst-history-action">
                        Acción: {attrs.accion_realizada}
                      </div>

                      {/* Métricas (Fondo gris claro) */}
                      <div className="sst-history-metrics">
                        <span><strong>Peso:</strong> {attrs.peso_kg} kg</span>
                        <span><strong>Talla:</strong> {attrs.talla_m} m</span>
                        <span><strong>IMC:</strong> {calcularIMC(attrs.peso_kg, attrs.talla_m)}</span>
                      </div>

                      {/* Diagnóstico */}
                      <div className="sst-history-diagnosis">
                        <strong>Diagnóstico:</strong> {attrs.diagnostico} - {attrs.descripcion}
                      </div>
                      
                      {/* Temporalidad */}
                      {attrs.temporalidad && (
                        <div className={`sst-history-temporalidad ${estaVencidoInd ? 'vencido' : ''}`}>
                          <strong>Temporalidad: </strong> 
                          <span>
                            {dayjs(attrs.temporalidad).format('DD/MM/YYYY')} {estaVencidoInd ? '(¡VENCIDO!)' : ''}
                          </span>
                        </div>
                      )}

                    </div>

                    {/* Botones de acción */}
                    <div className="sst-history-actions">
                      <button 
                        className="sst-btn-history" 
                        onClick={() => handleEditarGestion(gestion)}
                      >
                        Editar
                      </button>
                      <button 
                        className="sst-btn-history delete" 
                        onClick={() => handleEliminarGestion(gestion.id)}
                      >
                        Eliminar
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Agregar Seguimiento */}
        <div className="sst-footer-accordion">
          <div 
            className="sst-accordion-header" 
            onClick={() => {
              setMostrarFormSeguimiento(!mostrarFormSeguimiento);
              if (gestionEnEdicion) { setGestionEnEdicion(null); reset(); }
            }}
          >
            <h4>{gestionEnEdicion ? "Editar Seguimiento" : "Agregar Seguimiento"}</h4>
            <span className="sst-accordion-icon">
              {mostrarFormSeguimiento ? <ArrowDown /> : <ArrowUp /> }
            </span>
          </div>

          {mostrarFormSeguimiento && (
            <div className="sst-form-container">
              <form onSubmit={handleSubmit(onSubmitGestionSST)}>
                <div className="sst-form-grid">
                  <div className="sst-form-group">
                    <label>Fecha Evento:</label>
                    <input type="date" {...register('fechaHistorial')} />
                  </div>
                  <div className="sst-form-group">
                    <label>Temporalidad (Vencimiento):</label>
                    <input type="date" {...register('temporalidad')} />
                  </div>
                  <div className="sst-form-group">
                    <label>Acción Realizada:</label>
                    <select {...register('accion', { required: true })}>
                      <option value="compromiso">Compromiso de autocuidado</option>
                      <option value="acta">Acta de seguimiento</option>
                      <option value="lonchera">Autorización de Lonchera</option>
                      <option value="reincorporacion">Reincorporación laboral</option>
                      <option value="cierre">Cierre de reincorporación</option>
                      <option value="seguimiento">Seguimiento</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="sst-form-group">
                    <label>Sistema Afectado:</label>
                    <select {...register('sistema', { required: true })}>
                      <option value="cardiovascular">Cardiovascular</option>
                      <option value="dermatologica">Dermatológica</option>
                      <option value="gastrointestinal">Gastrointestinal</option>
                      <option value="inmunologica">Inmunológica</option>
                      <option value="neurologica">Neurológica</option>
                      <option value="respiratoria">Respiratoria</option>
                      <option value="alimenticio">Alimenticio</option>
                      <option value="neoplasias">Neoplasias</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>
                  <div className="sst-form-group">
                    <label>Actualizar Estado General:</label>
                    <select {...register('nuevoEstado', { required: true })} defaultValue={casoSeleccionado.attributes.estado}>
                      <option value="seguimiento">En Seguimiento</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </div>
                  <div className="sst-form-group">
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>Peso (Kg):</label>
                        <input type="number" step="0.1" style={{ width: '100%', padding: '0.6rem' }} {...register('pesoKg', { required: true })} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600 }}>Talla (M):</label>
                        <input type="number" step="0.01" style={{ width: '100%', padding: '0.6rem' }} {...register('tallaM', { required: true })} />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="sst-form-group" style={{ marginBottom: '1rem' }}>
                  <label>Diagnóstico Médico:</label>
                  <input type="text" {...register('diagnostico', { required: true })} />
                </div>
                
                <div className="sst-form-group">
                  <label>Evolución / Descripción:</label>
                  <textarea {...register('descripcion', { required: true })} rows="3"></textarea>
                </div>
                
                <button type="submit" className="sst-btn-submit">
                  {gestionEnEdicion ? "Actualizar Gestión" : "Guardar Gestión"}
                </button>
              </form>
            </div>
          )}
        </div>

      </div>

    </div>
  </div>
)}
    </div>
  );
}