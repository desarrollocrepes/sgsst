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
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [datosBukColaborador, setDatosBukColaborador] = useState(null);
  const [cargandoCruceBuk, setCargandoCruceBuk] = useState(false);
  
  const [mostrarFormSeguimiento, setMostrarFormSeguimiento] = useState(false);
  // Estado para saber si editamos una gestión existente
  const [gestionEnEdicion, setGestionEnEdicion] = useState(null);

  const { register, handleSubmit, reset, setValue } = useForm();

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
      // Actualizamos la consulta para que Strapi nos devuelva el archivo adjunto (populate=sstgestions,archivo)
      const response = await axios.get('https://macfer.crepesywaffles.com/api/sstreportes?populate=sstgestions,archivo&sort=createdAt:desc');
      setReportes(response.data.data || []);
      
      // Si hay un caso abierto en el modal, actualizar sus datos para ver las gestiones nuevas/editadas
      if (casoSeleccionado) {
        const casoActualizado = response.data.data.find(r => r.id === casoSeleccionado.id);
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
      axios.get(`https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${doc}`)
        .then(res => {
          if (res.data.ok && res.data.data.length > 0) setDatosBukColaborador(res.data.data[0]);
        })
        .catch(err => console.error("Error Buk:", err))
        .finally(() => setCargandoCruceBuk(false));
    }
  }, [casoSeleccionado]);

  const calcularEdad = (birthday) => birthday ? dayjs().diff(dayjs(birthday), 'year') : 'N/A';
  const calcularAntiguedad = (ingreso) => ingreso ? dayjs().diff(dayjs(ingreso), 'year') : 'N/A';
  const calcularIMC = (peso, talla) => (peso && talla > 0) ? (peso / (talla * talla)).toFixed(2) : 'N/A';

  // Función para determinar si un reporte está VENCIDO (basado en la última gestión con temporalidad)
  const verificarVencimiento = (gestionesData) => {
    if (!gestionesData || gestionesData.length === 0) return false;
    // Buscar si alguna gestión tiene temporalidad vencida y no está cerrado
    const hayVencidos = gestionesData.some(g => {
      const temp = g.attributes.temporalidad;
      return temp && dayjs().isAfter(dayjs(temp), 'day'); 
    });
    return hayVencidos;
  };

  const kpiAbiertos = reportes.filter(r => r.attributes.estado === 'abierto').length;
  const kpiSeguimiento = reportes.filter(r => r.attributes.estado === 'seguimiento').length;
  const kpiCerrados = reportes.filter(r => r.attributes.estado === 'cerrado').length;

  const datosGraficoPie = [
    { name: 'Abiertos', value: kpiAbiertos, color: '#e74c3c' },
    { name: 'En Seguimiento', value: kpiSeguimiento, color: '#f39c12' },
    { name: 'Cerrados', value: kpiCerrados, color: '#2ecc71' }
  ];

  // --- NUEVO: Editar y Eliminar Gestiones ---
  const handleEditarGestion = (gestion) => {
    setGestionEnEdicion(gestion);
    setMostrarFormSeguimiento(true);
    const attrs = gestion.attributes;
    
    // Si hay fecha historial se formatea para el input datetime-local
    const fechaHoraFormateada = attrs.fecha_hora ? dayjs(attrs.fecha_hora).format('YYYY-MM-DDTHH:mm') : '';
    
    setValue('fechaHistorial', fechaHoraFormateada);
    setValue('accion', attrs.accion_realizada);
    setValue('sistema', attrs.sistema_afectado);
    setValue('nuevoEstado', attrs.estado_registrado || casoSeleccionado.attributes.estado);
    setValue('pesoKg', attrs.peso_kg);
    setValue('tallaM', attrs.talla_m);
    setValue('diagnostico', attrs.diagnostico);
    setValue('categoria_cie', attrs.categoria_cie);
    setValue('descripcion', attrs.descripcion);
    setValue('temporalidad', attrs.temporalidad ? dayjs(attrs.temporalidad).format('YYYY-MM-DD') : '');
  };

  const handleEliminarGestion = async (id) => {
    if (window.confirm("¿Seguro que desea eliminar este seguimiento?")) {
      try {
        await axios.delete(`https://macfer.crepesywaffles.com/api/sstgestions/${id}`);
        alert("Seguimiento eliminado");
        cargarReportesSST(); // Recarga la info general y actualiza el modal
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
          categoria_cie: data.categoria_cie,
          descripcion: data.descripcion,
          temporalidad: temporalidadIso,
          estado_registrado: data.nuevoEstado,
          sstreporte: casoSeleccionado.id
        }
      };

      if (gestionEnEdicion) {
        // PUT para actualizar gestión
        await axios.put(`https://macfer.crepesywaffles.com/api/sstgestions/${gestionEnEdicion.id}`, payloadGestion);
      } else {
        // POST para crear nueva gestión
        await axios.post('https://macfer.crepesywaffles.com/api/sstgestions', payloadGestion);
      }

      // Siempre actualizamos el estado del reporte general por si cambió
      if (casoSeleccionado.attributes.estado !== data.nuevoEstado) {
        await axios.put(`https://macfer.crepesywaffles.com/api/sstreportes/${casoSeleccionado.id}`, {
          data: { estado: data.nuevoEstado }
        });
      }

      alert(gestionEnEdicion ? "Seguimiento actualizado" : "Seguimiento guardado exitosamente");
      setMostrarFormSeguimiento(false);
      setGestionEnEdicion(null);
      reset();
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

          <div style={{ display: 'flex', justifyContent: 'center', backgroundColor: 'white', padding: '20px', borderRadius: '8px', marginTop: '20px' }}>
            <div>
              <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#2c3e50' }}>Distribución Porcentual por Estado</h4>
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
            <h3 style={{ color: '#2c3e50', marginTop: 0 }}>Historial General de Reportes</h3>
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
                {reportes.map(rep => {
                  const estaVencido = verificarVencimiento(rep.attributes.sstgestions?.data) && rep.attributes.estado !== 'cerrado';
                  
                  return (
                    <tr key={rep.id} style={{ borderBottom: '1px solid #ddd', cursor: 'pointer', backgroundColor: estaVencido ? '#fff3f3' : 'transparent' }} onClick={() => setCasoSeleccionado(rep)}>
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
                        {estaVencido && (
                          <span style={{ marginLeft: '10px', backgroundColor: '#c0392b', color: 'white', fontSize: '10px', padding: '2px 5px', borderRadius: '5px' }}>⚠️ VENCIDO</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>{rep.attributes.categoria}</td>
                      <td style={{ padding: '12px' }}><button style={{ padding: '5px 10px', cursor: 'pointer' }}>Gestionar</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL DE GESTIÓN AVANZADA */}
      {casoSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '8px', width: '90%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px' }}>
              <h3 style={{ margin: 0, color: '#2c3e50' }}>Gestión de Expediente #{casoSeleccionado.id}</h3>
              <button onClick={cerrarModal} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer' }}>✖</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
              <div style={{ backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                {cargandoCruceBuk ? <p>Consultando datos actualizados...</p> : datosBukColaborador ? (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '13px', lineHeight: '1.8' }}>
                    
                    <img src={datosBukColaborador.foto} alt="" width={100} />
                    <li><strong>Nombre:</strong> {datosBukColaborador.nombre}</li>
                    <li><strong>docuemento:</strong> {datosBukColaborador.document_number}</li>
                    <li><strong>Cargo:</strong> {datosBukColaborador.cargo}</li>
                    <li><strong>Área:</strong> {datosBukColaborador.area_nombre}</li>
                    <li><strong>Departamento:</strong> {datosBukColaborador.departamento}</li>
                    <li><strong>Dirección:</strong> {datosBukColaborador.direction}</li>
                    <li><strong>Ciudad:</strong> {datosBukColaborador.ciudad}</li>
                    <li><strong>Celular:</strong> {datosBukColaborador.Celular}</li>
                    <li><strong>Correo:</strong> {datosBukColaborador.correo}</li>
                    <li><strong>Edad:</strong> {datosBukColaborador.birthday} ({calcularEdad(datosBukColaborador.birthday)} años)</li>
                    <li><strong>Antigüedad:</strong> {datosBukColaborador.ingreso} ({calcularAntiguedad(datosBukColaborador.ingreso)} años)</li>
                  </ul>
                ) : <p style={{ color: 'red' }}>No se pudo cruzar la información.</p>}
              </div>

              <div style={{ backgroundColor: '#e8f6f3', padding: '15px', borderRadius: '8px', border: '1px solid #1abc9c', fontSize: '13px' }}>
                <p><strong>Emisor:</strong> {casoSeleccionado.attributes.creador_reporte_nombre}</p>
                <p><strong>Categoría:</strong> {casoSeleccionado.attributes.categoria}</p>
                <p><strong>Entidad:</strong> {casoSeleccionado.attributes.tipo_entidad} {casoSeleccionado.attributes.nombre_entidad}</p>
                <p><strong>Relato:</strong> {casoSeleccionado.attributes.descripcion}</p>
                <p><strong>genero:</strong> {casoSeleccionado.attributes.genero}</p>
                <p><strong>fecha:</strong> {casoSeleccionado.attributes.fecha_creacion_manual}</p>

                
                {/* NUEVO: Mostrar el enlace para ver el archivo adjunto si el líder subió uno */}
                {casoSeleccionado.attributes.archivo?.data && (
                  (() => {
                    // Validamos si Strapi envía un array (múltiples archivos) o un objeto (un solo archivo)
                    const dataArchivo = casoSeleccionado.attributes.archivo.data;
                    const urlAdjunto = Array.isArray(dataArchivo) 
                      ? dataArchivo[0]?.attributes?.url 
                      : dataArchivo?.attributes?.url;

                    // Si por alguna razón la URL viene vacía, no intentamos renderizar el botón
                    if (!urlAdjunto) return null;

                    // Armamos el enlace final verificando si ya trae el dominio o si es relativo
                    const hrefFinal = urlAdjunto.startsWith('http') 
                      ? urlAdjunto 
                      : `https://macfer.crepesywaffles.com${urlAdjunto}`;

                    return (
                      <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#d1f2eb', borderRadius: '5px' }}>
                        <strong>Adjunto:</strong> <br/>
                        <a 
                          href={hrefFinal} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={{ color: '#16a085', textDecoration: 'underline', fontWeight: 'bold', display: 'flex', alignItems: 'center', marginTop: '5px' }}
                        >
                          Clic aquí para ver el documento
                        </a>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

            {/* HISTORIAL DE EVOLUCIONES */}
            <div style={{ marginTop: '20px', backgroundColor: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #ddd', gridColumn: '1 / -1' }}>
              <h4 style={{ marginTop: 0, color: '#2c3e50' }}>Historial de Evoluciones</h4>
              
              {casoSeleccionado.attributes.sstgestions?.data && casoSeleccionado.attributes.sstgestions.data.length > 0 ? (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {casoSeleccionado.attributes.sstgestions.data.map((gestion) => {
                    const attrs = gestion.attributes;
                    // Definimos si la gestión iterada está vencida
                    const estaVencidoInd = attrs.temporalidad && dayjs().isAfter(dayjs(attrs.temporalidad), 'day');

                    return (
                      <li key={gestion.id} style={{ borderBottom: '1px solid #ccc', paddingBottom: '10px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ color: '#2c3e50' }}><strong>Diagnóstico:</strong> {attrs.diagnostico} descripcion {attrs.descripcion}</span>
                            <span style={{ color: '#2c3e50' }}><strong>creador:</strong> {attrs.creador} fecha {attrs.fecha_hora}</span>
                            <span style={{ color: '#2c3e50' }}><strong>accion realizada:</strong> {attrs.accion_realizada} sitema afectado {attrs.sistema_afectado}</span>
                            <span style={{ color: '#2c3e50' }}><strong>peso:</strong> {attrs.peso_kg} talla: - {attrs.talla_m}</span>
                            <span style={{ color: '#2c3e50' }}><strong>temporalidad:</strong> {attrs.temporalidad} estado registrado: - {attrs.estado_registrado}</span>
                            <span style={{ color: '#2c3e50' }}><strong>categiria cie:</strong> {attrs.categoria_cie}</span>

                            
                            {/* Mostrar alerta de temporalidad si existe */}
                            {attrs.temporalidad && (
                              <div style={{ marginTop: '5px' }}>
                                <strong>Vencimiento: </strong> 
                                <span style={{ color: estaVencidoInd ? '#c0392b' : '#27ae60', fontWeight: 'bold' }}>
                                  {dayjs(attrs.temporalidad).format('DD/MM/YYYY')} {estaVencidoInd ? '(¡VENCIDO!)' : ''}
                                </span>
                              </div>
                            )}
                            
                            {/* Mostrar Código CIE-10 si existe */}
                            {attrs.categoria_cie && (
                              <div style={{ marginTop: '2px' }}>
                                <strong>CIE-10: </strong> <span style={{ backgroundColor: '#ecf0f1', padding: '2px 5px', borderRadius: '3px', fontSize: '11px' }}>{attrs.categoria_cie}</span>
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <button onClick={() => handleEditarGestion(gestion)} style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>Editar</button>
                            <button onClick={() => handleEliminarGestion(gestion.id)} style={{ padding: '3px 8px', fontSize: '11px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}>X</button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p style={{ color: '#7f8c8d', fontSize: '13px' }}>No hay gestiones o seguimientos registrados aún.</p>
              )}
            </div>

            <button 
              onClick={() => {
                setMostrarFormSeguimiento(!mostrarFormSeguimiento);
                if (gestionEnEdicion) { setGestionEnEdicion(null); reset(); }
              }} 
              style={{ marginTop: '15px', backgroundColor: '#3498db', color: 'white', padding: '8px 15px', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              {mostrarFormSeguimiento ? "Ocultar Formulario" : "+ Registrar Nuevo Seguimiento"}
            </button>

            {/* FORMULARIO DE SEGUIMIENTO Y EDICIÓN */}
            {mostrarFormSeguimiento && (
              <form onSubmit={handleSubmit(onSubmitGestionSST)} style={{ marginTop: '15px', padding: '15px', backgroundColor: gestionEnEdicion ? '#fff9e6' : '#fafbfc', border: '1px dashed #bdc3c7', borderRadius: '8px' }}>
                <h4 style={{ marginTop: 0, color: gestionEnEdicion ? '#d35400' : '#2c3e50' }}>
                  {gestionEnEdicion ? "Editando Seguimiento" : "Nuevo Seguimiento"}
                </h4>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', fontSize: '13px' }}>
                  <div>
                    <label style={{ fontWeight: 'bold' }}>Fecha Evento:</label>
                    <input type="datetime-local" {...register('fechaHistorial')} style={{ width: '100%', padding: '6px', marginTop: '4px' }} />
                  </div>

                  <div>
                    <label style={{ fontWeight: 'bold' }}>Temporalidad (Vencimiento, ej. fin incapacidad):</label>
                    <input type="date" {...register('temporalidad')} style={{ width: '100%', padding: '6px', marginTop: '4px' }} />
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
                    <label style={{ fontWeight: 'bold' }}>Actualizar Estado General del Caso:</label>
                    <select {...register('nuevoEstado', { required: true })} defaultValue={casoSeleccionado.attributes.estado} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
                      <option value="seguimiento">En Seguimiento</option>
                      <option value="cerrado">Cerrado</option>
                    </select>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: 'bold' }}>Peso (Kg):</label>
                      <input type="number" step="0.1" {...register('pesoKg', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontWeight: 'bold' }}>Talla (M):</label>
                      <input type="number" step="0.01" {...register('tallaM', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px' }} />
                    </div>
                  </div>
                </div>

                <div>
                    <label style={{ fontWeight: 'bold' }}>Código CIE-10</label>
                    <select {...register('categoria_cie', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px' }}>
                      <option value="">-- Seleccione un código CIE-10 --</option>
                      <option value="M545">M545 - Lumbago no especificado</option>
                    </select>
                  </div>

                <div style={{ marginTop: '10px', fontSize: '13px' }}>
                  <label style={{ fontWeight: 'bold' }}>Diagnóstico / Evolución:</label>
                  <input type="text" {...register('diagnostico', { required: true })} style={{ width: '98%', padding: '6px', marginTop: '4px' }} />
                </div>

                
      

                <div style={{ marginTop: '10px', fontSize: '13px' }}>
                  <label style={{ fontWeight: 'bold' }}>Descripción Detallada:</label>
                  <textarea {...register('descripcion', { required: true })} rows="3" style={{ width: '98%', padding: '6px', marginTop: '4px' }}></textarea>
                </div>

                <button type="submit" style={{ marginTop: '15px', backgroundColor: gestionEnEdicion ? '#f39c12' : '#2ecc71', color: 'white', padding: '10px 20px', border: 'none', borderRadius: '5px', cursor: 'pointer', width: '100%', fontWeight: 'bold' }}>
                  {gestionEnEdicion ? "Actualizar Gestión" : "Guardar Gestión"}
                </button>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}