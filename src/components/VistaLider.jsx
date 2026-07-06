// src/components/VistaLider.jsx
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

export default function VistaLider() {
  const navigate = useNavigate();
  const [lider, setLider] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  
  const { register, handleSubmit, watch, reset, formState: { errors } } = useForm();
  const colaboradorSeleccionadoDoc = watch("colaboradorDoc");
  const [colaboradorDetalle, setColaboradorDetalle] = useState(null);

  // 1. Cargar sesión del líder
  useEffect(() => {
    const usuario = localStorage.getItem('usuarioLogueado');
    if (usuario) {
      const userParsed = JSON.parse(usuario);
      if (userParsed.lider === 1) {
        setLider(userParsed);
      } else {
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
  }, [navigate]);

  // 2. Traer el historial de reportes creados por este líder desde Strapi
  const cargarHistorialDesdeStrapi = async (nombreLider) => {
    try {
      setCargandoHistorial(true);
      // Filtramos en Strapi por el nombre del creador del reporte
      const url = `https://macfer.crepesywaffles.com/api/sstreportes?filters[creador_reporte_nombre][$eq]=${encodeURIComponent(nombreLider)}&sort=createdAt:desc`;
      const response = await axios.get(url);
      setHistorial(response.data.data || []);
    } catch (error) {
      console.error("Error al cargar historial de Strapi:", error);
    } finally {
      setCargandoHistorial(false);
    }
  };

  useEffect(() => {
    if (lider) {
      cargarHistorialDesdeStrapi(lider.nombre);
    }
  }, [lider]);

  // 3. Detectar cambio de colaborador en el select para mostrar foto y nombre
  useEffect(() => {
    if (lider && colaboradorSeleccionadoDoc) {
      const encontrado = lider.equipo.find(emp => emp.document_number === Number(colaboradorSeleccionadoDoc));
      setColaboradorDetalle(encontrado || null);
    } else {
      setColaboradorDetalle(null);
    }
  }, [colaboradorSeleccionadoDoc, lider]);

  const cerrarSesion = () => {
    localStorage.removeItem('usuarioLogueado');
    navigate('/login');
  };

  // 4. Enviar reporte a Strapi
  const onSubmitReporte = async (data) => {
    try {
      const payload = {
        data: {
          colaborador_documento: Number(colaboradorDetalle.document_number),
          colaborador_nombre: colaboradorDetalle.nombre,
          colaborador_foto: colaboradorDetalle.foto,
          genero: data.genero,
          categoria: data.categoria,
          tipo_entidad: data.tipoEntidad,
          nombre_entidad: data.nombreEntidad,
          descripcion: data.descripcion,
          estado: "abierto", // Todo caso inicia abierto
          creador_reporte_nombre: lider.nombre,
          fecha_creacion_manual: new Date().toISOString()
        }
      };

      await axios.post('https://macfer.crepesywaffles.com/api/sstreportes', payload);
      
      alert("Reporte guardado con éxito en el sistema.");
      setMostrarFormulario(false);
      reset();
      // Recargar la tabla con el nuevo registro
      cargarHistorialDesdeStrapi(lider.nombre);
    } catch (error) {
      console.error("Error al guardar el reporte en Strapi:", error);
      alert("Hubo un error al guardar el reporte. Intente nuevamente.");
    }
  };

  if (!lider) return <p style={{ padding: '20px' }}>Cargando sesión del líder...</p>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* NAVBAR */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c3e50', color: 'white', padding: '10px 20px', borderRadius: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={lider.foto} alt={lider.nombre} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h4 style={{ margin: 0 }}>{lider.nombre}</h4>
            <small style={{ color: '#bdc3c7' }}>{lider.cargo} - {lider.departamento}</small>
          </div>
        </div>
        <button onClick={cerrarSesion} style={{ backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' }}>
          Salir
        </button>
      </nav>

      {/* BANNER */}
      <div style={{ backgroundColor: '#ecf0f1', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'center', border: '1px solid #bdc3c7' }}>
        <h3>Gestión de Novedades de Seguridad y Salud</h3>
        <p>Reporte reincorporaciones, recomendaciones o incapacidades recurrentes de su equipo de trabajo asignado.</p>
        <button 
          onClick={() => setMostrarFormulario(!mostrarFormulario)} 
          style={{ backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}
        >
          {mostrarFormulario ? "Cancelar" : "Crear Nuevo Reporte"}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <form onSubmit={handleSubmit(onSubmitReporte)} style={{ backgroundColor: '#fff', border: '1px solid #dee2e6', padding: '25px', borderRadius: '8px', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
          <h4 style={{ marginTop: 0, color: '#2c3e50' }}>Formulario de Reporte Obligatorio</h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Seleccionar Colaborador de su Equipo:</label>
              <select {...register("colaboradorDoc", { required: "Debe seleccionar un colaborador" })} style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Seleccione --</option>
                {lider.equipo.map(colab => (
                  <option key={colab.document_number} value={colab.document_number}>{colab.nombre}</option>
                ))}
              </select>
              {errors.colaboradorDoc && <span style={{ color: 'red', fontSize: '12px' }}>{errors.colaboradorDoc.message}</span>}
              
              {colaboradorDetalle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px', border: '1px dashed #ccc' }}>
                  <img src={colaboradorDetalle.foto} alt={colaboradorDetalle.nombre.split(" ")[0]} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <strong style={{ display: 'block' }}>{colaboradorDetalle.nombre}</strong>
                    <small>Documento: {colaboradorDetalle.document_number}</small>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Categoría del Evento:</label>
              <select {...register("categoria", { required: "Seleccione una categoría" })} style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Seleccione --</option>
                <option value="reincorporacion">Reincorporación post incapacidad</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Género del colaborador:</label>
              <select {...register("genero", { required: "Seleccione género" })} style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Seleccione --</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Tipo de Entidad:</label>
              <select {...register("tipoEntidad", { required: "Seleccione tipo de entidad" })} style={{ width: '100%', padding: '8px', borderRadius: '4px' }}>
                <option value="">-- Seleccione --</option>
                <option value="eps">EPS</option>
                <option value="arl">ARL</option>
                <option value="prepagada">Medicina prepagada</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Nombre de la Entidad:</label>
              <input type="text" {...register("nombreEntidad", { required: "Ingrese nombre" })} placeholder="Ej: Sura, Nueva EPS" style={{ width: '96%', padding: '8px', borderRadius: '4px' }} />
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Descripción de la Novedad:</label>
            <textarea {...register("descripcion", { required: "Describa la situación" })} rows="4" style={{ width: '98%', padding: '8px', borderRadius: '4px' }} placeholder="Detalle las novedades o recomendaciones médicas observadas..."></textarea>
          </div>

          <button type="submit" style={{ marginTop: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
            Enviar a Seguridad y Salud
          </button>
        </form>
      )}

      {/* HISTORIAL LOCAL */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={{ color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px' }}>Mis Reportes Radicados</h3>
        
        {cargandoHistorial ? <p>Consultando base de datos de Strapi...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={{ padding: '12px' }}>ID</th>
                <th style={{ padding: '12px' }}>Colaborador</th>
                <th style={{ padding: '12px' }}>Estado</th>
                <th style={{ padding: '12px' }}>Fecha Registro</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((rep) => (
                <tr key={rep.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '12px', fontWeight: 'bold' }}>{rep.id}</td>
                  <td style={{ padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <img src={rep.attributes.colaborador_foto} alt="foto" style={{ width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <span style={{ display: 'block', fontWeight: '500' }}>{rep.attributes.colaborador_nombre}</span>
                        <small style={{ color: '#7f8c8d' }}>Doc: {rep.attributes.colaborador_documento}</small>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '12px' }}>
                    <span style={{ 
                      backgroundColor: rep.attributes.estado === 'abierto' ? '#ffeaa7' : '#dff9fb', 
                      color: rep.attributes.estado === 'abierto' ? '#d63031' : '#0097e6', 
                      padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' 
                    }}>
                      {rep.attributes.estado}
                    </span>
                  </td>
                  <td style={{ padding: '12px' }}>{new Date(rep.attributes.createdAt).toLocaleString()}</td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>Usted no ha creado reportes todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

    </div>
  );
}