import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import axios from 'axios';
import { PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function VistaSST() {
  const navigate = useNavigate();

  // 1. ESTADOS
  const [sst, setSst] = useState(null);
  const [reportes, setReportes] = useState([]);
  const [cargandoGlobal, setCargandoGlobal] = useState(true);
  const [casoSeleccionado, setCasoSeleccionado] = useState(null);
  const [datosBukColaborador, setDatosBukColaborador] = useState(null);
  const [cargandoCruceBuk, setCargandoCruceBuk] = useState(false);
  const [mostrarFormSeguimiento, setMostrarFormSeguimiento] = useState(false);
  const [gestionEnEdicion, setGestionEnEdicion] = useState(null);
  const { register, handleSubmit, reset, setValue } = useForm();
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState([]);

  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroEntidad, setFiltroEntidad] = useState("");
  const [busquedaTabla, setBusquedaTabla] = useState("");

  // 2. FUNCIONES AUXILIARES
  const calcularEdad = (birthday) => birthday ? dayjs().diff(dayjs(birthday), 'year') : 'N/A';
  const calcularAntiguedad = (ingreso) => ingreso ? dayjs().diff(dayjs(ingreso), 'year') : 'N/A';
  const calcularIMC = (peso, talla) => (peso && talla > 0) ? (peso / (talla * talla)).toFixed(2) : 'N/A';

  const verificarVencimiento = (gestionesData) => {
    if (!gestionesData || gestionesData.length === 0) return false;
    return gestionesData.some(g => g.attributes.temporalidad && dayjs().isAfter(dayjs(g.attributes.temporalidad), 'day'));
  };

  const cerrarModal = () => {
    setCasoSeleccionado(null);
    setDatosBukColaborador(null);
    setMostrarFormSeguimiento(false);
    setGestionEnEdicion(null);
    setBusqueda("");
    reset();
  };

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioLogueado');
    navigate('/login');
  };

  const buscarCie = async (texto) => {
    if (texto.length < 2) {
      setResultados([]);
      return;
    }
    try {
      const res = await axios.get(
        `https://macfer.crepesywaffles.com/api/sstcie10s?filters[$or][0][codigo][$containsi]=${texto}&filters[$or][1][descripcion][$containsi]=${texto}&pagination[pageSize]=10`
      );
      setResultados(res.data.data);
    } catch (error) {
      console.error("Error buscando CIE 10:", error);
    }
  };

  // 3. CÁLCULOS PARA GRÁFICOS Y FILTROS
  const kpiAbiertos = reportes.filter(r => r.attributes.estado === 'abierto').length;
  const kpiSeguimiento = reportes.filter(r => r.attributes.estado === 'seguimiento').length;
  const kpiCerrados = reportes.filter(r => r.attributes.estado === 'cerrado').length;

  const datosGraficoPie = [
    { name: 'Abiertos', value: kpiAbiertos, color: '#e74c3c' },
    { name: 'En Seguimiento', value: kpiSeguimiento, color: '#f39c12' },
    { name: 'Cerrados', value: kpiCerrados, color: '#2ecc71' }
  ];

  const conteoEntidades = reportes.reduce((acc, rep) => {
    const entidad = rep.attributes.tipo_entidad || 'Sin Entidad';
    acc[entidad] = (acc[entidad] || 0) + 1;
    return acc;
  }, {});
  const datosEntidad = Object.keys(conteoEntidades).map(key => ({ name: key, value: conteoEntidades[key] }));

  const conteoGenero = reportes.reduce((acc, rep) => {
    const gen = rep.attributes.genero || 'N/A';
    acc[gen] = (acc[gen] || 0) + 1;
    return acc;
  }, {});
  const datosGenero = Object.keys(conteoGenero).map(k => ({ name: k, value: conteoGenero[k] }));

  let imcBajo = 0, imcNormal = 0, imcSobrepeso = 0, imcObesidad = 0;
  const conteoSistemas = {};
  const conteoAcciones = {};

  reportes.forEach(rep => {
    const gestiones = rep.attributes.sstgestions?.data;
    if (gestiones && gestiones.length > 0) {
      const ultimaGestion = gestiones[gestiones.length - 1].attributes;
      if (ultimaGestion.peso_kg > 0 && ultimaGestion.talla_m > 0) {
        const imc = ultimaGestion.peso_kg / (ultimaGestion.talla_m * ultimaGestion.talla_m);
        if (imc < 18.5) imcBajo++;
        else if (imc < 25) imcNormal++;
        else if (imc < 30) imcSobrepeso++;
        else imcObesidad++;
      }

      gestiones.forEach(g => {
        const sistema = g.attributes.sistema_afectado || 'Otro';
        const accion = g.attributes.accion_realizada || 'Otro';
        conteoSistemas[sistema] = (conteoSistemas[sistema] || 0) + 1;
        conteoAcciones[accion] = (conteoAcciones[accion] || 0) + 1;
      });
    }
  });

  const datosIMC = [
    { name: 'Bajo Peso', value: imcBajo, color: '#f1c40f' },
    { name: 'Normal', value: imcNormal, color: '#2ecc71' },
    { name: 'Sobrepeso', value: imcSobrepeso, color: '#e67e22' },
    { name: 'Obesidad', value: imcObesidad, color: '#e74c3c' }
  ];
  const datosSistemas = Object.keys(conteoSistemas).map(key => ({ name: key, value: conteoSistemas[key] }));
  const datosAccionesArray = Object.keys(conteoAcciones).map(key => ({ name: key, value: conteoAcciones[key] }));

  const reportesFiltrados = reportes.filter(rep => {
    const matchEstado = filtroEstado ? rep.attributes.estado === filtroEstado : true;
    const matchEntidad = filtroEntidad ? rep.attributes.tipo_entidad === filtroEntidad : true;
    const matchBusqueda = busquedaTabla 
      ? rep.attributes.colaborador_nombre.toLowerCase().includes(busquedaTabla.toLowerCase()) || 
        rep.attributes.colaborador_documento.includes(busquedaTabla)
      : true;
    return matchEstado && matchEntidad && matchBusqueda;
  });

  // 4. FUNCIONES DE BASE DE DATOS
  const cargarReportesSST = async () => {
    try {
      setCargandoGlobal(true);
      const response = await axios.get('https://macfer.crepesywaffles.com/api/sstreportes?populate=sstgestions,archivo&sort=createdAt:desc');
      setReportes(response.data.data || []);
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

  const handleEditarGestion = (gestion) => {
    setGestionEnEdicion(gestion);
    setMostrarFormSeguimiento(true);
    const attrs = gestion.attributes;
    const fechaHoraFormateada = attrs.fecha_hora ? dayjs(attrs.fecha_hora).format('YYYY-MM-DDTHH:mm') : '';

    setValue('fechaHistorial', fechaHoraFormateada);
    setValue('accion', attrs.accion_realizada);
    setValue('sistema', attrs.sistema_afectado);
    setValue('nuevoEstado', attrs.estado_registrado || casoSeleccionado.attributes.estado);
    setValue('pesoKg', attrs.peso_kg);
    setValue('tallaM', attrs.talla_m);
    setValue('diagnostico', attrs.diagnostico);
    setValue('descripcion', attrs.descripcion);
    setValue('temporalidad', attrs.temporalidad ? dayjs(attrs.temporalidad).format('YYYY-MM-DD') : '');
    setValue('categoria_cie', attrs.categoria_cie || '');
    setBusqueda(attrs.categoria_cie ? `${attrs.categoria_cie} - ${attrs.diagnostico}` : '');
  };

  const handleEliminarGestion = async (id) => {
    if (window.confirm("¿Seguro que desea eliminar este seguimiento?")) {
      try {
        await axios.delete(`https://macfer.crepesywaffles.com/api/sstgestions/${id}`);
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
          sstreporte: casoSeleccionado.id,
          categoria_cie: data.categoria_cie
        }
      };

      if (gestionEnEdicion) {
        await axios.put(`https://macfer.crepesywaffles.com/api/sstgestions/${gestionEnEdicion.id}`, payloadGestion);
      } else {
        await axios.post('https://macfer.crepesywaffles.com/api/sstgestions', payloadGestion);
      }

      if (casoSeleccionado.attributes.estado !== data.nuevoEstado) {
        await axios.put(`https://macfer.crepesywaffles.com/api/sstreportes/${casoSeleccionado.id}`, {
          data: { estado: data.nuevoEstado }
        });
      }

      alert(gestionEnEdicion ? "Seguimiento actualizado" : "Seguimiento guardado exitosamente");
      setMostrarFormSeguimiento(false);
      setGestionEnEdicion(null);
      setBusqueda("");
      reset();
      cargarReportesSST();
    } catch (error) {
      console.error("Error al procesar el seguimiento en Strapi:", error);
      alert("Hubo un fallo al sincronizar la información.");
    }
  };

  // 5. USE EFFECTS
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

  // Bloqueo de render si no ha cargado el usuario
  if (!sst) return <p>Cargando...</p>;

  // 6. RENDER (HTML/JSX)
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', margin: "0", padding: "0" }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3c1f1c', color: 'white', padding: '10px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={sst.foto} alt={sst.nombre} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h4>{sst.nombre}</h4>
            <h4>{sst.departamento}</h4>
          </div>
        </div>
        <button onClick={cerrarSesion} style={{ backgroundColor: '#ffffff', color: '#3c1f1c', border: 'none', padding: '8px 15px', borderRadius: '99px', cursor: 'pointer' }}>Salir</button>
      </nav>
      {cargandoGlobal ? <p style={{ marginTop: '20px' }}>Cargando...</p> : (
        <>
          {/* CUADROS SUPERIORES NUMÉRICOS */}
          <div style={{ display: 'flex', margin: "1rem", borderRadius: '8px', border: "1px solid #3c1f1c" }}>
            <div style={{ flex: 1, padding: '20px', textAlign: 'center', borderRight: "1px solid #3c1f1c" }}>
              <h2>{reportes.length}</h2>
              <h2>Casos</h2>
            </div>
            <div style={{ flex: 1, padding: '20px', textAlign: 'center', borderRight: "1px solid #3c1f1c" }}>
              <h2>{kpiAbiertos}</h2>
              <h2>Abiertos</h2>
            </div>
            <div style={{ flex: 1, padding: '20px', textAlign: 'center', borderRight: "1px solid #3c1f1c" }}>
              <h2>{kpiSeguimiento}</h2>
              <h2>En Seguimiento</h2>
            </div>
            <div style={{ flex: 1, padding: '20px', textAlign: 'center' }}>
              <h2>{kpiCerrados}</h2>
              <h2>Cerrados</h2>
            </div>
          </div>

          {/* SECCIÓN DE GRÁFICOS (DASHBOARD) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', margin: "1rem", border: "1px solid #3c1f1c", borderRadius: '8px', padding: '10px' }}>
            
            <div style={{ borderRight: "1px solid #3c1f1c", borderBottom: "1px solid #3c1f1c" }}>
              <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#3c1f1c' }}>Estado General</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={datosGraficoPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                    {datosGraficoPie.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ borderRight: "1px solid #3c1f1c", borderBottom: "1px solid #3c1f1c" }}>
              <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#3c1f1c' }}>Distribución de IMC</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={datosIMC} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} label>
                    {datosIMC.map((entry, idx) => <Cell key={`cell-${idx}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ borderRight: "1px solid #3c1f1c", borderBottom: "1px solid #3c1f1c" }}>
              <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#3c1f1c' }}>Casos por Entidad</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={datosEntidad} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} fill="#8884d8">
                    {datosEntidad.map((entry, idx) => <Cell key={`cell-${idx}`} fill={['#3498db', '#9b59b6', '#34495e', '#16a085'][idx % 4]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ borderBottom: "1px solid #3c1f1c"}}>
              <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#3c1f1c' }}>Sistemas Afectados</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosSistemas} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{fontSize: 10}} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#e74c3c" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ borderRight: "1px solid #3c1f1c" }}>
              <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#3c1f1c' }}>Acciones Realizadas</h4>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={datosAccionesArray} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" tick={{fontSize: 10}} width={80} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#2980b9" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div>
              <h4 style={{ margin: '0 0 10px 0', textAlign: 'center', color: '#3c1f1c' }}>Por Género</h4>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={datosGenero} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                    {datosGenero.map((entry, idx) => <Cell key={`cell-${idx}`} fill={['#9b59b6', '#34495e'][idx % 2]} />)}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* BARRA DE FILTROS Y TABLA */}
          <div style={{ margin: '1rem', borderRadius: '8px', border: "1px solid #3c1f1c", overflow: 'hidden' }}>
            
            <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderBottom: '1px solid #ddd', display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
              <input 
                type="text" 
                placeholder="Buscar por cédula o nombre..." 
                value={busquedaTabla} 
                onChange={(e) => setBusquedaTabla(e.target.value)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc', flex: 1, minWidth: '200px' }}
              />
              <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">Todos los Estados</option>
                <option value="abierto">Abierto</option>
                <option value="seguimiento">En Seguimiento</option>
                <option value="cerrado">Cerrado</option>
              </select>
              <select value={filtroEntidad} onChange={(e) => setFiltroEntidad(e.target.value)} style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">Todas las Entidades</option>
                <option value="EPS">EPS</option>
                <option value="ARL">ARL</option>
                <option value="Medicina Prepagada">Medicina Prepagada</option>
                <option value="Particular">Particular</option>
              </select>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
              <thead>
                <tr style={{ backgroundColor: '#3c1f1c', color: "#ffffff" }}>
                  <th style={{ padding: '0.5rem' }}>ID</th>
                  <th style={{ padding: '0.5rem' }}>Colaborador</th>
                  <th style={{ padding: '0.5rem' }}>Estado</th>
                  <th style={{ padding: '0.5rem' }}>Categoría</th>
                </tr>
              </thead>
              <tbody>
                {reportesFiltrados.map(rep => {
                  const estaVencido = verificarVencimiento(rep.attributes.sstgestions?.data) && rep.attributes.estado !== 'cerrado';

                  return (
                    <tr key={rep.id} style={{ borderBottom: '1px solid #ddd', cursor: 'pointer', backgroundColor: estaVencido ? '#fff3f3' : 'transparent' }} onClick={() => setCasoSeleccionado(rep)}>
                      <td>{rep.id}</td>
                      <td style={{ padding: '12px', display: 'flex', alignItems: 'center', textAlign: 'left', gap: '10px' }}>
                        <img src={rep.attributes.colaborador_foto} alt="img" style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }} />
                        <div>
                          <span>{rep.attributes.colaborador_nombre} {estaVencido && (
                          <span style={{ marginLeft: '10px', border: '1px solid #c0392b', color: '#c0392b', fontSize: '12px', padding: '4px 8px', borderRadius: '99px' }}>Vencido</span>
                        )}</span><br />
                          <span>{rep.attributes.colaborador_documento}</span>
                        </div>
                      </td>
                      <td>
                        <span style={{padding: '4px 8px', borderRadius: '99px', fontSize: '12px', color: 'white', textTransform: 'capitalize', backgroundColor: rep.attributes.estado === 'abierto' ? '#e74c3c' : rep.attributes.estado === 'seguimiento' ? '#f39c12' : '#2ecc71'
                        }}>
                          {rep.attributes.estado}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>{rep.attributes.categoria}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* MODAL DEL CASO SELECCIONADO */}
      {casoSeleccionado && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', maxHeight: '100%', backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'right', alignItems: 'center', zIndex: 1000 }}>
          
          <div style={{ backgroundColor: 'white', padding: '1rem', width: '100%', maxWidth: '900px', height: '100vh', display: 'flex', flexDirection: 'column' }}> 
            
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', flexShrink: 0 }}>
              <h3 style={{textTransform: "capitalize"}}>Caso {casoSeleccionado.id} - Estado {casoSeleccionado.attributes.estado}</h3>
              <button onClick={cerrarModal} style={{ cursor: 'pointer' }}>X</button>
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', flex: 1, minHeight: 0 }}>
              
              {/* COLUMNA IZQUIERDA */}
              <div style={{ padding: '1rem', borderRadius: '8px', border: '1px solid #ddd', overflowY: 'auto' }}>
                {cargandoCruceBuk ? <p>Cargando...</p> : datosBukColaborador ? (
                  <ul>
                    <div style={{marginBottom: "0.5rem", justifyContent: "center", alignItems: "center", display: "flex",  flexDirection: "column"}}>
                      <img src={datosBukColaborador.foto} alt="" width={100} style={{borderRadius: "99px", justifyContent: "center", marginBottom: "0.5rem"}} />
                      <li>{datosBukColaborador.nombre}</li>
                      <li>{datosBukColaborador.document_number}</li>
                    </div>
                    <div style={{border: "1px solid #ddd", borderRadius: "8px", padding: "0.3rem 0.5rem"}}>
                      <li style={{borderBottom: "1px solid #ddd", padding: "0.3rem 0.5rem"}}>
                        <strong>Cargo</strong> {datosBukColaborador.cargo} <br />
                        <strong>Área</strong> {datosBukColaborador.area_nombre} <br />
                        <strong>Departamento</strong> {datosBukColaborador.departamento} <br />
                        <strong>Dirección</strong> {datosBukColaborador.direction} <br />
                        <strong>Ciudad</strong> {datosBukColaborador.ciudad}
                      </li>
                      <li style={{borderBottom: "1px solid #ddd", padding: "0.3rem 0.5rem"}}>
                        <strong>Celular</strong> {datosBukColaborador.Celular} <br />
                        <strong>Correo</strong> {datosBukColaborador.correo}
                      </li>
                      <li style={{borderBottom: "1px solid #ddd", padding: "0.3rem 0.5rem"}}>
                        <strong>Edad</strong> {datosBukColaborador.birthday} ({calcularEdad(datosBukColaborador.birthday)} años) <br />
                        <strong>Antigüedad</strong> {datosBukColaborador.ingreso} ({calcularAntiguedad(datosBukColaborador.ingreso)} años)
                      </li>
                      <li style={{padding: "0.3rem 0.5rem", textTransform: "capitalize"}}>
                        <strong>Género</strong> {casoSeleccionado.attributes.genero}
                      </li>
                    </div>
                  </ul>
                ) : <p style={{ color: 'red' }}>No cargó la información</p>}
              </div>

              {/* COLUMNA DERECHA */}
              <div style={{ overflowY: 'auto', paddingRight: '10px' }}>
                <p>
                  <strong>{casoSeleccionado.attributes.creador_reporte_nombre}</strong> creó este reporte el <strong>{casoSeleccionado.attributes.fecha_creacion_manual} </strong>
                  en la categoría <strong>{casoSeleccionado.attributes.categoria}</strong> dirigido a <strong>{casoSeleccionado.attributes.tipo_entidad} {casoSeleccionado.attributes.nombre_entidad}</strong>.
                  El mensaje registrado fue: <strong>{casoSeleccionado.attributes.descripcion}</strong>
                </p>
                {casoSeleccionado.attributes.archivo?.data && (
                  (() => {
                    const dataArchivo = casoSeleccionado.attributes.archivo.data;
                    const urlAdjunto = Array.isArray(dataArchivo)
                      ? dataArchivo[0]?.attributes?.url
                      : dataArchivo?.attributes?.url;
                    if (!urlAdjunto) return null;
                    const hrefFinal = urlAdjunto.startsWith('http')
                      ? urlAdjunto
                      : `https://macfer.crepesywaffles.com${urlAdjunto}`;
                    return (
                      <div >
                        <a
                          href={hrefFinal}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#16a085', textDecoration: 'underline', fontWeight: 'bold', display: 'flex', alignItems: 'center', marginTop: '5px' }}
                        >
                          Ver documento adjunto
                        </a>
                      </div>
                    );
                  })()
                )}

                <div>
                  {casoSeleccionado.attributes.sstgestions?.data && casoSeleccionado.attributes.sstgestions.data.length > 0 ? (
                    <ul>
                      {casoSeleccionado.attributes.sstgestions.data.map((gestion) => {
                        const attrs = gestion.attributes;
                        const estaVencidoInd = attrs.temporalidad && dayjs().isAfter(dayjs(attrs.temporalidad), 'day');
                        return (
                          <li key={gestion.id}>
                            <div>
                              <div style={{ marginTop: '20px', padding: '15px', borderRadius: '8px', border: '1px solid #ddd' }}>
                                <span><strong>{attrs.creador}</strong> creó este seguimiento el <strong>{attrs.fecha_hora}</strong></span><br />
                                <span><strong>{attrs.descripcion}</strong></span><br />
                                <span>Acción realizada <strong>{attrs.accion_realizada}</strong></span><br />
                                <span>Sistema afectado <strong>{attrs.sistema_afectado}</strong></span><br />
                                <span>Peso <strong>{attrs.peso_kg} kg</strong>{" "}Talla <strong>{attrs.talla_m} m</strong>{" "}IMC{" "}<strong>{attrs.peso_kg > 0 && attrs.talla_m > 0 ? (attrs.peso_kg / (attrs.talla_m * attrs.talla_m)).toFixed(2): "-"}</strong></span><br />
                                <span>Estado <strong style={{textTransform: "capitalize"}}>{attrs.estado_registrado}</strong></span><br />
                                <span>Código CIE-10 <strong>{attrs.categoria_cie} {attrs.diagnostico}</strong></span><br />
                                {attrs.temporalidad && (
                                  <div>
                                    <strong>Vencimiento </strong>
                                    <span style={{ color: estaVencidoInd ? '#c0392b' : '#27ae60', fontWeight: 'bold' }}>
                                      {dayjs(attrs.temporalidad).format('DD/MM/YYYY')} {estaVencidoInd ? '' : ''}
                                    </span>
                                  </div>
                                )}

                                <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                                  <button onClick={() => handleEditarGestion(gestion)} style={{ padding: '0 8px', color: '#f39c12', border: '1px solid #f39c12', borderRadius: '99px', cursor: 'pointer' }}>Editar</button>
                                  <button onClick={() => handleEliminarGestion(gestion.id)} style={{ padding: '0 8px', color: '#e74c3c', border: '1px solid #e74c3c', borderRadius: '99px', cursor: 'pointer' }}>Eliminar</button>
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p style={{ color: '#7f8c8d' }}>No hay seguimientos registrados aún</p>
                  )}
                </div>
                
                <button 
                  onClick={() => {
                    setMostrarFormSeguimiento(!mostrarFormSeguimiento);
                    if (gestionEnEdicion) { setGestionEnEdicion(null); reset(); }
                  }} 
                  style={{ marginTop: '15px', border: '1px solid #3c1f1c', color: '#3c1f1c', padding: '4px 8px', borderRadius: '99px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  {mostrarFormSeguimiento ? "Ocultar Formulario" : "Registrar Seguimiento"}
                </button>

                {/* FORMULARIO DE SEGUIMIENTO */}
                {mostrarFormSeguimiento && (
                  <form onSubmit={handleSubmit(onSubmitGestionSST)} style={{ marginTop: '15px', padding: '15px', border: '1px dashed #bdc3c7', borderRadius: '8px' }}>
                    <h4 style={{ marginTop: 0, color: gestionEnEdicion ? '#d35400' : '#000' }}>
                    </h4>

                    {/* INPUT OCULTO PARA EL CÓDIGO CIE */}
                    <input type="hidden" {...register('categoria_cie')} />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', fontSize: '13px' }}>
                      <div>
                        <label style={{ fontWeight: 'bold' }}>Fecha de creación (Casos antiguos)</label>
                        <input type="date" {...register('fechaHistorial')} style={{ width: '100%', padding: '6px', marginTop: '4px', border: "1px solid #ddd", borderRadius: "8px" }} />
                      </div>

                      <div>
                        <label style={{ fontWeight: 'bold' }}>Temporalidad (Vencimiento):</label>
                        <input type="date" {...register('temporalidad')} style={{ width: '100%', padding: '6px', marginTop: '4px', border: "1px solid #ddd", borderRadius: "8px" }} />
                      </div>

                      <div>
                        <label style={{ fontWeight: 'bold' }}>Acción realizada:</label>
                        <select {...register('accion', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px', border: "1px solid #ddd", borderRadius: "8px" }}>
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
                        <label style={{ fontWeight: 'bold' }}>Sistema afectado:</label>
                        <select {...register('sistema', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px', border: "1px solid #ddd", borderRadius: "8px" }}>
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
                        <label style={{ fontWeight: 'bold' }}>Actualizar estado</label>
                        <select {...register('nuevoEstado', { required: true })} defaultValue={casoSeleccionado.attributes.estado} style={{ width: '100%', padding: '6px', marginTop: '4px', border: "1px solid #ddd", borderRadius: "8px" }}>
                          <option value="seguimiento">En Seguimiento</option>
                          <option value="cerrado">Cerrado</option>
                        </select>
                      </div>

                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontWeight: 'bold' }}>Peso (Kg):</label>
                          <input type="number" step="0.1" {...register('pesoKg', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px', border: "1px solid #ddd", borderRadius: "8px" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ fontWeight: 'bold' }}>Talla (M):</label>
                          <input type="number" step="0.01" {...register('tallaM', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px', border: "1px solid #ddd", borderRadius: "8px" }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: '10px' }}>
                      <label style={{ fontWeight: 'bold', fontSize: '13px' }}>Código CIE-10</label>
                      <input
                          value={busqueda}
                          onChange={(e)=>{
                              setBusqueda(e.target.value);
                              buscarCie(e.target.value);
                          }}
                          style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', border: "1px solid #ddd", borderRadius: "8px" }}
                      />
                      
                      {resultados.length > 0 && (
                        <div style={{ border: '1px solid #ccc', borderRadius: '4px', marginTop: '2px', backgroundColor: 'white', maxHeight: '150px', overflowY: 'auto' }}>
                          {resultados.map(item => {
                            const { codigo, descripcion: descCie } = item.attributes; 
                            return (
                              <div
                                  key={item.id}
                                  onClick={()=>{
                                      setValue("categoria_cie", codigo, { shouldValidate: true, shouldDirty: true });
                                      setValue("diagnostico", descCie, { shouldValidate: true, shouldDirty: true });
                                      
                                      setBusqueda(`${codigo} - ${descCie}`);
                                      setResultados([]);
                                  }}
                                  style={{ padding: '8px', cursor: 'pointer', borderBottom: '1px solid #eee', fontSize: '13px' }}
                              >
                                {codigo} - {descCie}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div style={{ marginTop: '10px', fontSize: '13px' }}>
                      <label style={{ fontWeight: 'bold' }}>Diagnóstico</label>
                      <input type="text" disabled {...register('diagnostico', { required: true })} style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', border: "1px solid #ddd", borderRadius: "8px" }} />
                    </div>
                    
                    <div style={{ marginTop: '10px', fontSize: '13px' }}>
                      <label style={{ fontWeight: 'bold' }}>Descripción</label>
                      <textarea {...register('descripcion', { required: true })} rows="3" style={{ width: '100%', padding: '6px', marginTop: '4px', boxSizing: 'border-box', border: "1px solid #ddd", borderRadius: "8px" }}></textarea>
                    </div>

                    <button type="submit" style={{ marginTop: '15px', border: '1px solid #3c1f1c', color: '#3c1f1c', padding: '4px 8px', borderRadius: '99px', cursor: 'pointer' }}>
                      {gestionEnEdicion ? "Actualizar Gestión" : "Guardar Gestión"}
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