import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import './VistaSST.css';

export default function VistaSST() {
  const navigate = useNavigate();
  const [sst, setSst] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [datosBukColaborador, setDatosBukColaborador] = useState(null);
  const [cargandoCruceBuk, setCargandoCruceBuk] = useState(false);
  const [mostrarFormSeguimiento, setMostrarFormSeguimiento] = useState(false);
  const { register, handleSubmit, reset } = useForm();

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
      const response = await axios.get('https://macfer.crepesywaffles.com/api/sstreportes?populate=sstgestions&sort=createdAt:desc');
      setReportes(response.data.data || []);
    } catch (error) {
      console.error("Error al consultar reportes generales:", error);
    } finally {
      setCargandoGlobal(false);
    }
  };

  useEffect(() => {
    if (sst) {
      cargarReportesSST();
    }
  }, [sst]);
  
  useEffect(() => {
    if (casoSeleccionado) {
      const doc = casoSeleccionado.attributes.colaborador_documento;
      setCargandoCruceBuk(true);
      setDatosBukColaborador(null);

      axios.get(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${doc}`)
        .then(res => {
          if (res.data.ok && res.data.data.length > 0) {
            setDatosBukColaborador(res.data.data[0]);
          }
        })
        .catch(err => console.error("Error al cruzar datos del colaborador con Buk:", err))
        .finally(() => setCargandoCruceBuk(false));
    }
  }, [casoSeleccionado]);

  // Funciones de cálculo demográfico
  const calcularEdad = (birthday) => birthday ? dayjs().diff(dayjs(birthday), 'year') : 'N/A';
  const calcularAntiguedad = (ingreso) => ingreso ? dayjs().diff(dayjs(ingreso), 'year') : 'N/A';
  const calcularIMC = (peso, talla) => (peso && talla) ? (peso / (talla * talla)).toFixed(2) : 'N/A';

  // Métricas KPIs calculadas sobre la estructura de atributos de Strapi
  const kpiAbiertos = reportes.filter(r => r.attributes.estado === 'abierto' || r.attributes.estado === 'Abierto').length;
  const kpiSeguimiento = reportes.filter(r => r.attributes.estado === 'seguimiento' || r.attributes.estado === 'En Seguimiento').length;
  const kpiCerrados = reportes.filter(r => r.attributes.estado === 'cerrado' || r.attributes.estado === 'Cerrado').length;

  const datosGraficoPie = [
    { name: 'Abiertos', value: kpiAbiertos, color: '#e74c3c' },
    { name: 'En Seguimiento', value: kpiSeguimiento, color: '#f39c12' },
    { name: 'Cerrados', value: kpiCerrados, color: '#2ecc71' }
  ];

  // 4. Guardar un seguimiento médico (Efectúa POST a Gestiones y PUT a Reporte)
  const onSubmitGestionSST = async (data) => {
    try {
      // Tomamos la fecha del sistema o permitimos edición manual para históricos de Excel
      const fechaFinalIso = data.fechaHistorial ? new Date(data.fechaHistorial).toISOString() : new Date().toISOString();

      // Payload para la tabla Gestions vinculada por ID al reporte correspondiente
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
          sstreporte: casoSeleccionado.id // Relación con el reporte padre
        }
      };

      // Guardamos la nueva gestión
      await axios.post('https://macfer.crepesywaffles.com/api/sstgestions', payloadGestion);

      // Actualizamos el estado del reporte padre si cambió (abierto -> seguimiento / cerrado)
      await axios.put(`https://macfer.crepesywaffles.com/api/sstreportes/${casoSeleccionado.id}`, {
        data: { estado: data.nuevoEstado }
      });

      alert("Seguimiento guardado y estado del reporte actualizado con éxito.");
      setCasoSeleccionado(null); // Cerrar modal
      setMostrarFormSeguimiento(false);
      reset();
      cargarReportesSST(); // Recargar el cuadro de mando
    } catch (error) {
      console.error("Error al procesar el seguimiento en Strapi:", error);
      alert("Hubo un fallo al sincronizar la información.");
    }
  };

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioLogueado');
    navigate('/login');
  };

  if (!sst) return <p style={{ padding: '20px' }}>Cargando panel operacional...</p>;

  return (
  <div className="dashboard-container">
    
    {/* NAVBAR */}
    <nav className="navbar">
      <div className="navbar-profile">
        <img src={sst.foto} alt={sst.nombre} className="profile-img" />
        <div>
          <h5 className="profile-name">{sst.nombre} <br /> {sst.document_number}</h5>
        </div>
      </div>
      <button onClick={cerrarSesion} className="btn-logout">Salir</button>
    </nav>

    {cargandoGlobal ? <p className="loading-text">Cargando métricas y reportes globales...</p> : (
      <>
        {/* CARDS KPIs */}
        <div className="kpi-container">
          <div className="kpi-card kpi-radicados">
            <h2 className="kpi-number">{reportes.length}</h2>
            <small className="kpi-label">Casos Radicados</small>
          </div>
          <div className="kpi-card kpi-abiertos">
            <h2 className="kpi-number text-red">{kpiAbiertos}</h2>
            <small className="kpi-label">Abiertos</small>
          </div>
          <div className="kpi-card kpi-seguimiento">
            <h2 className="kpi-number text-orange">{kpiSeguimiento}</h2>
            <small className="kpi-label">En Seguimiento</small>
          </div>
          <div className="kpi-card kpi-cerrados">
            <h2 className="kpi-number text-green">{kpiCerrados}</h2>
            <small className="kpi-label">Cerrados</small>
          </div>
        </div>

        {/* GRÁFICO */}
        <div className="chart-container">
          <div>
            <h4 className="chart-title">Distribución Porcentual por Estado</h4>
            <PieChart width={320} height={220}>
              <Pie data={datosGraficoPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {datosGraficoPie.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </div>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="table-container">
          <h3 className="table-title">Historial General de Reportes (Haga clic para gestionar)</h3>
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Colaborador afectado</th>
                <th>Estado actual</th>
                <th>Categoría</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reportes.map(rep => (
                <tr key={rep.id} onClick={() => setCasoSeleccionado(rep)}>
                  <td className="table-id-cell">{rep.id}</td>
                  <td className="colab-cell">
                    <img src={rep.attributes.colaborador_foto} alt="img" className="colab-img" />
                    <div>
                      <span>{rep.attributes.colaborador_nombre}</span><br/>
                      <small className="colab-doc">Doc: {rep.attributes.colaborador_documento}</small>
                    </div>
                  </td>
                  <td>
                    <span className={`status-badge status-${rep.attributes.estado}`}>
                      {rep.attributes.estado}
                    </span>
                  </td>
                  <td>{rep.attributes.categoria}</td>
                  <td><button className="btn-manage">Gestionar</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    )}

    {/* MODAL DE GESTIÓN AVANZADA */}
    {casoSeleccionado && (
      <div className="modal-overlay">
        <div className="modal-content">
          
          <div className="modal-header">
            <h3 className="modal-title">Caso #{casoSeleccionado.id} Estado:  </h3>
            <button onClick={() => setCasoSeleccionado(null)} className="btn-close">✖</button>
          </div>

          <div className="modal-layout">
            
            {/* COLUMNA IZQUIERDA: 30% (Data Empleado Buk) */}
            <div className="modal-sidebar">
              <div className="info-block-buk">
                {cargandoCruceBuk ? <p>Consultando datos...</p> : datosBukColaborador ? (
                  <ul className="info-list">
                    <img
                      src={datosBukColaborador.foto}
                      alt="Foto del colaborador"
                    />
                    {datosBukColaborador.nombre}
                    {datosBukColaborador.document_number}
                    <li><strong>Área:</strong> {datosBukColaborador.area_nombre}</li>
                    <li><strong>Cargo:</strong> {datosBukColaborador.cargo}</li>

                    <li><strong>direccion :</strong> {datosBukColaborador.direction}</li>
                    <li><strong>depto :</strong> {datosBukColaborador.departamento}</li>
                    <li><strong>Ciudad:</strong> {datosBukColaborador.ciudad}</li>
                    <li><strong>Celular:</strong> {datosBukColaborador.Celular}</li>
                    <li><strong>correo :</strong> {datosBukColaborador.correo}</li>
                    <li><strong>Edad:</strong> {datosBukColaborador.birthday} {calcularEdad(datosBukColaborador.birthday)} años</li>
                    <li><strong>Antigüedad:</strong> {datosBukColaborador.ingreso} {calcularAntiguedad(datosBukColaborador.ingreso)} años</li>
                  </ul>
                ) : <p className="error-text">No se pudo cruzar la información.</p>}
              </div>
            </div>

            {/* COLUMNA DERECHA: 70% (Reporte, Seguimiento y Formulario) */}
            <div className="modal-main">
              
              <div className="info-block-report">
                <h4 className="info-title-report">Datos del Reporte Original</h4>
                <div className="report-grid-2">
                  <p><strong>Líder Emisor:</strong> {casoSeleccionado.attributes.creador_reporte_nombre}</p>
                  <p><strong>Categoría:</strong> {casoSeleccionado.attributes.categoria}</p>
                  <p><strong>Entidad:</strong> {casoSeleccionado.attributes.nombre_entidad}</p>
                  <p><strong>Fecha:</strong> {new Date(casoSeleccionado.attributes.createdAt).toLocaleString()}</p>
                </div>
                <p className="mt-2"><strong>Relato:</strong> {casoSeleccionado.attributes.descripcion}</p>
              </div>

              <h4 className="history-title">Historial Clínico / Seguimientos</h4>
              <div className="history-container">
                {casoSeleccionado.attributes.sstgestions?.data?.length === 0 ? (
                  <p className="history-empty">Este caso no registra evoluciones previas.</p>
                ) : (
                  <ul className="history-list">
                    {casoSeleccionado.attributes.sstgestions?.data?.map((gestion) => {
                      const attrs = gestion.attributes;
                      return (
                        <li key={gestion.id} className="history-item">
                          <div className="history-header-item">
                            <strong>{new Date(attrs.fecha_hora).toLocaleDateString()}</strong>
                            <span>Por: {attrs.creador}</span>
                          </div>
                          <div className="history-body-item">
                            <span><strong>Acción:</strong> {attrs.accion_realizada} | <strong>Sistema:</strong> {attrs.sistema_afectado}</span>
                            <span><strong>Métricas:</strong> {attrs.peso_kg}kg / {attrs.talla_m}m — IMC: {calcularIMC(attrs.peso_kg, attrs.talla_m)}</span>
                            <p className="mt-1"><strong>Diagnóstico:</strong> {attrs.diagnostico} - {attrs.descripcion}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>

              <button 
                onClick={() => setMostrarFormSeguimiento(!mostrarFormSeguimiento)} 
                className="btn-toggle"
              >
                {mostrarFormSeguimiento ? "Ocultar Formulario" : "+ Registrar Nueva Evolución / Seguimiento"}
              </button>

              {/* FORMULARIO SEGUIMIENTO */}
              {mostrarFormSeguimiento && (
                <form onSubmit={handleSubmit(onSubmitGestionSST)} className="form-container">
                  <div className="form-grid">
                    
                    <div>
                      <label className="form-label">Fecha Evento (Editable para Carga de Excel):</label>
                      <input type="datetime-local" {...register('fechaHistorial')} className="form-control" />
                    </div>

                    <div>
                      <label className="form-label">Acción Realizada:</label>
                      <select {...register('accion', { required: true })} className="form-control">
                        <option value="compromiso">Compromiso de autocuidado</option>
                        <option value="acta">Acta de seguimiento</option>
                        <option value="lonchera">Autorización de Lonchera</option>
                        <option value="reincorporacion">Reincorporación laboral</option>
                        <option value="cierre">Cierre de reincorporación</option>
                        <option value="seguimiento">Seguimiento</option>
                        <option value="otro">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Sistema Afectado:</label>
                      <select {...register('sistema', { required: true })} className="form-control">
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

                    <div>
                      <label className="form-label">Actualizar Estado General:</label>
                      <select {...register('nuevoEstado', { required: true })} defaultValue={casoSeleccionado.attributes.estado} className="form-control">
                        <option value="abierto">Abierto</option>
                        <option value="seguimiento">En Seguimiento</option>
                        <option value="cerrado">Cerrado</option>
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Peso en el control (Kg):</label>
                      <input type="number" step="0.1" {...register('pesoKg', { required: true })} placeholder="Ej: 70" className="form-control" />
                    </div>

                    <div>
                      <label className="form-label">Talla en el control (Metros):</label>
                      <input type="number" step="0.01" {...register('tallaM', { required: true })} placeholder="Ej: 1.70" className="form-control" />
                    </div>
                  </div>

                  <div className="form-group-full">
                    <label className="form-label">Diagnóstico Médico (Código CIE-10 / Concepto):</label>
                    <input type="text" {...register('diagnostico', { required: true })} placeholder="Escriba el diagnóstico oficial" className="form-control" />
                  </div>

                  <div className="form-group-full">
                    <label className="form-label">Evolución / Descripción del Seguimiento:</label>
                    <textarea {...register('descripcion', { required: true })} rows="3" className="form-control" placeholder="Escriba aquí los compromisos o hallazgos clínicos de este control..."></textarea>
                  </div>

                  <button type="submit" className="btn-submit">
                    Guardar Gestión y Actualizar Expediente
                  </button>
                </form>
              )}

            </div>
          </div>
        </div>
      </div>
    )}
  </div>
);
}