import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function VistaSST() {
  const navigate = useNavigate();
  const [sst, setSst] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  
  // Estados para Modal y Cruce de datos con la API de Empleados
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [datosBukColaborador, setDatosBukColaborador] = useState(null);
  const [cargandoCruceBuk, setCargandoCruceBuk] = useState(false);
  const [mostrarFormSeguimiento, setMostrarFormSeguimiento] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  // 1. Cargar sesión analista SST
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

  // 2. Traer todos los reportes de Strapi populando sus gestiones internas
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

  // 3. Ejecutar cruce con la API de empleados al seleccionar un caso de la tabla
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
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
      
      {/* NAVBAR */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#16a085', color: 'white', padding: '10px 20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={sst.foto} alt={sst.nombre} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h4 style={{ margin: 0 }}>{sst.nombre}</h4>
            <small>Analista SST - {sst.ciudad}</small>
          </div>
        </div>
        <button onClick={cerrarSesion} style={{ backgroundColor: '#c0392b', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer' }}>Salir</button>
      </nav>

      {cargandoGlobal ? <p style={{ marginTop: '20px' }}>Cargando métricas y reportes globales...</p> : (
        <>
          {/* CARDS KPIs */}
          <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
              <h2 style={{ margin: 0 }}>{reportes.length}</h2>
              <small style={{ color: '#7f8c8d' }}>Casos Radicados</small>
            </div>
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', borderBottom: '4px solid #e74c3c' }}>
              <h2 style={{ margin: 0, color: '#e74c3c' }}>{kpiAbiertos}</h2>
              <small style={{ color: '#7f8c8d' }}>Abiertos</small>
            </div>
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', borderBottom: '4px solid #f39c12' }}>
              <h2 style={{ margin: 0, color: '#f39c12' }}>{kpiSeguimiento}</h2>
              <small style={{ color: '#7f8c8d' }}>En Seguimiento</small>
            </div>
            <div style={{ flex: 1, backgroundColor: 'white', padding: '20px', borderRadius: '8px', textAlign: 'center', borderBottom: '4px solid #2ecc71' }}>
              <h2 style={{ margin: 0, color: '#2ecc71' }}>{kpiCerrados}</h2>
              <small style={{ color: '#7f8c8d' }}>Cerrados</small>
            </div>
          </div>

          {/* GRÁFICO */}
          <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', textCenter: 'center', color: '#2c3e50' }}>Distribución Porcentual por Estado</h4>
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
          <div style={{ marginTop: '20px', backgroundColor: 'white', padding: '20px', borderRadius: '8px' }}>
            <h3 style={{ color: '#2c3e50', marginTop: 0 }}>Historial General de Reportes (Haga clic para gestionar)</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#ecf0f1' }}>
                  <th style={{ padding: '12px' }}>ID</th>
                  <th style={{ padding: '12px' }}>Colaborador afectado</th>
                  <th style={{ padding: '12px' }}>Estado actual</th>
                  <th style={{ padding: '12px' }}>Categoría</th>
                  <th style={{ padding: '12px' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {reportes.map(rep => (
                  <tr key={rep.id} style={{ borderBottom: '1px solid #ddd', cursor: 'pointer' }} onClick={() => setCasoSeleccionado(rep)}>
                    <td style={{ padding: '12px', fontWeight: 'bold' }}>{rep.id}</td>
                    <td style={{ padding: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={rep.attributes.colaborador_foto} alt="img" style={{ width: '30px', height: '30px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <span>{rep.attributes.colaborador_nombre}</span><br/>
                        <small style={{ color: '#7f8c8d' }}>Doc: {rep.attributes.colaborador_documento}</small>
                      </div>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{ 
                        padding: '4px 8px', borderRadius: '12px', fontSize: '12px', color: 'white', fontWeight: 'bold', textTransform: 'uppercase',
                        backgroundColor: rep.attributes.estado === 'abierto' ? '#e74c3c' : rep.attributes.estado === 'seguimiento' ? '#f39c12' : '#2ecc71'
                      }}>
                        {rep.attributes.estado}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>{rep.attributes.categoria}</td>
                    <td style={{ padding: '12px' }}><button style={{ padding: '5px 10px', cursor: 'pointer' }}>Gestionar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL DE GESTIÓN AVANZADA */}
      {casoSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Caso #{casoSeleccionado.id}</h3>
              <button onClick={() => setCasoSeleccionado(null)} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
            </div>

            {/* SECCIÓN CRUCE DE DATOS EN VIVO DESDE LA API BUK DE CREPES */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              
              <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                {cargandoCruceBuk ? <p>Consultando datos actualizados del empleado en Crepes...</p> : datosBukColaborador ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '1.8' }}>
                    <img src={datosBukColaborador.foto} alt={datosBukColaborador.nombre?.charAt(0)}  style={{ borderRadius: '99px', border: '1px solid #1abc9c', width: "50px" }} />
                    <li>{datosBukColaborador.nombre}</li>
                    <li>{datosBukColaborador.document_number}</li>
                    <li>genero seleccionado por lider: {casoSeleccionado.attributes.genero}</li>
                    <li><strong>Cargo</strong> {datosBukColaborador.cargo}</li>
                    <li><strong>Área</strong> {datosBukColaborador.area_nombre}</li>
                    <li><strong>Dirección</strong> {datosBukColaborador.direction}</li>
                    <li><strong>Departamento </strong> {datosBukColaborador.departamento}</li>
                    <li><strong>Ciudad</strong> {datosBukColaborador.ciudad}</li>
                    <li><strong>Correo</strong> {datosBukColaborador.correo}</li>
                    <li><strong>Celular</strong> {datosBukColaborador.Celular}</li>
                    <li><strong>Edad</strong> {datosBukColaborador.birthday} ({calcularEdad(datosBukColaborador.birthday)} años)</li>
                    <li><strong>Antigüedad</strong> {datosBukColaborador.ingreso} ({calcularAntiguedad(datosBukColaborador.ingreso)} años)</li>
                  </ul>
                ) : <p style={{ color: 'red' }}>No se pudo cruzar la información con la API externa Buk.</p>}
              </div>

              {/* REPORTE ORIGINAL GUARDADO EN STRAPI */}
              <div style={{ backgroundColor: '#e8f6f3', padding: '15px', borderRadius: '8px', border: '1px solid #1abc9c', fontSize: '13px' }}>
                <h4 style={{ marginTop: 0, color: '#16a085' }}>data reporte lider</h4>
                <p>{casoSeleccionado.attributes.creador_reporte_nombre}</p>
                <p><strong>Categoría</strong> {casoSeleccionado.attributes.categoria} </p>
                <p><strong>Entidad</strong> {casoSeleccionado.attributes.tipo_entidad} - {casoSeleccionado.attributes.nombre_entidad}</p>
                <p><strong>Relato del Líder:</strong> {casoSeleccionado.attributes.descripcion}</p>
                <p><strong>Fecha Radicación:</strong> {new Date(casoSeleccionado.attributes.createdAt).toLocaleString()}</p>
              </div>
            </div>

            {/* HISTORIAL DE SEGUIMIENTOS MÉDICOS */}
            <h4 style={{ marginTop: '25px', borderBottom: '1px solid #ddd', paddingBottom: '5px' }}>Seguimientos Realizados</h4>
            <div style={{ maxHeight: '150px', overflowY: 'auto', backgroundColor: '#fff', border: '1px solid #eee', padding: '10px', borderRadius: '5px' }}>
              {casoSeleccionado.attributes.sstgestions?.data?.length === 0 ? (
                <p style={{ color: '#7f8c8d', fontSize: '13px', margin: 0 }}>Este caso no registra evoluciones previas.</p>
              ) : (
                <ul style={{ paddingLeft: '15px', margin: 0, fontSize: '13px' }}>
                  {casoSeleccionado.attributes.sstgestions?.data?.map((gestion) => {
                    const attrs = gestion.attributes;
                    return (
                      <li key={gestion.id} style={{ marginBottom: '10px', borderBottom: '1px dashed #f1f1f1', paddingBottom: '5px' }}>
                        <strong>{new Date(attrs.fecha_hora).toLocaleDateString()} <br /> Realizado por: {attrs.creador}</strong><br />
                        <span>Acción: {attrs.accion_realizada} <br /> Sistema: {attrs.sistema_afectado}</span><br />
                        <span>Peso: {attrs.peso_kg} kg <br /> Talla: {attrs.talla_m} m <br /> <strong>IMC: {calcularIMC(attrs.peso_kg, attrs.talla_m)}</strong></span><br />
                        <span style={{ color: '#2c3e50' }}><strong>Diagnóstico:</strong> {attrs.diagnostico} <br /> {attrs.descripcion}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            {/* BOTÓN DESPLEGABLE NUEVA GESTIÓN */}
            <button 
              onClick={() => setMostrarFormSeguimiento(!mostrarFormSeguimiento)} 
              style={{ marginTop: '15px', backgroundColor: '#3498db', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {mostrarFormSeguimiento ? "Ocultar Formulario" : "Registrar Seguimiento"}
            </button>

            {/* FORMULARIO SEGUIMIENTO */}
            {mostrarFormSeguimiento && (
              <form onSubmit={handleSubmit(onSubmitGestionSST)} style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fafbfc', border: '1px dashed #bdc3c7', borderRadius: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px' }}>
                  
                  <div>
                    <label style={{ fontWeight: 'bold' }}>Fecha Evento (casos antiguos):</label>
                    <input type="datetime-local" {...register('fechaHistorial')} style={{ width: '100%', padding: '6px', marginTop: '4px' }} />
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold' }}>Acción Realizada:</label>
                    <select {...register('accion', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
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
                    <label style={{ fontWeight: 'bold' }}>Sistema Afectado:</label>
                    <select {...register('sistema', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
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
                    <label style={{ fontWeight: 'bold' }}>Actualizar Estado General:</label>
                    <select {...register('nuevoEstado', { required: true })} defaultValue={casoSeleccionado.attributes.estado} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
                      <option value="seguimiento">En Seguimiento</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold' }}>Peso (Kg):</label>
                    <input type="number" step="0.1" {...register('pesoKg', { required: true })} placeholder="Ej: 70" style={{ width: '94%', padding: '6px', marginTop: '4px' }} />
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold' }}>Talla (Metros):</label>
                    <input type="number" step="0.01" {...register('tallaM', { required: true })} placeholder="Ej: 1.70" style={{ width: '94%', padding: '6px', marginTop: '4px' }} />
                  </div>
                </div>

                <div style={{ marginTop: '10px', fontSize: '13px' }}>
                  <label style={{ fontWeight: 'bold' }}>Diagnóstico</label>
                  <input type="text" {...register('diagnostico', { required: true })} placeholder="Escriba el diagnóstico" style={{ width: '98%', padding: '6px', marginTop: '4px' }} />
                </div>

                <div style={{ marginTop: '10px', fontSize: '13px' }}>
                  <label style={{ fontWeight: 'bold' }}>Descripción del Seguimiento:</label>
                  <textarea {...register('descripcion', { required: true })} rows="3" style={{ width: '98%', padding: '6px', marginTop: '4px' }} placeholder="Escriba aquí los compromisos o hallazgos clínicos de este control..."></textarea>
                </div>

                <button type="submit" style={{ marginTop: '15px', backgroundColor: '#2ecc71', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
                  Guardar
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}