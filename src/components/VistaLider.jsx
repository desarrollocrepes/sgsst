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

  const [reporteEnEdicion, setReporteEnEdicion] = useState(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm();
  const colaboradorSeleccionadoDoc = watch("colaboradorDoc");
  const [colaboradorDetalle, setColaboradorDetalle] = useState(null);

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

  const cargarHistorialDesdeStrapi = async (nombreLider) => {
    try {
      setCargandoHistorial(true);
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

  const onSubmitReporte = async (data) => {
    if (!colaboradorDetalle) {
      alert("No se pudo obtener el detalle del colaborador. Seleccione un colaborador nuevamente.");
      return;
    }

    try {
      const payloadData = {
        colaborador_documento: Number(colaboradorDetalle.document_number),
        colaborador_nombre: colaboradorDetalle.nombre,
        colaborador_foto: colaboradorDetalle.foto,
        genero: data.genero,
        categoria: data.categoria,
        tipo_entidad: data.tipoEntidad,
        nombre_entidad: data.nombreEntidad,
        descripcion: data.descripcion,
        creador_reporte_nombre: lider.nombre,
      };

      const formData = new FormData();

      if (reporteEnEdicion) {
        formData.append('data', JSON.stringify(payloadData));
        
        if (data.archivo && data.archivo.length > 0) {
          formData.append('files.archivo', data.archivo[0]);
        }

        await axios.put(`https://macfer.crepesywaffles.com/api/sstreportes/${reporteEnEdicion.id}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Reporte actualizado con éxito.");
      } else {
        payloadData.estado = "abierto";
        payloadData.fecha_creacion_manual = data.fechaCreacionManual 
          ? new Date(data.fechaCreacionManual).toISOString() 
          : new Date().toISOString();
        
        formData.append('data', JSON.stringify(payloadData));
        
        if (data.archivo && data.archivo.length > 0) {
          formData.append('files.archivo', data.archivo[0]);
        }

        await axios.post('https://macfer.crepesywaffles.com/api/sstreportes', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        alert("Reporte guardado con éxito en el sistema.");
      }
      
      setMostrarFormulario(false);
      setReporteEnEdicion(null);
      reset();
      cargarHistorialDesdeStrapi(lider.nombre);
    } catch (error) {
      console.error("Status:", error.response?.status); 
    }
  };

  const cancelarFormulario = () => {
    setMostrarFormulario(false);
    setReporteEnEdicion(null);
    reset();
  };

  if (!lider) return <p style={{ padding: '20px' }}>Cargando...</p>;

  return (
    <div style={{ fontFamily: 'Arial, sans-serif', padding: '20px', margin: '0 ', padding: "0" }}>
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#3c1f1c', color: 'white', padding: '10px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <img src={lider.foto} alt={lider.nombre} style={{ width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' }} />
          <div>
            <h4>{lider.nombre}</h4>
            <h4>{lider.departamento}</h4>
          </div>
        </div>
        <button onClick={cerrarSesion} style={{ backgroundColor: '#ffffff', color: '#3c1f1c', border: 'none', padding: '8px 15px', borderRadius: '99px', cursor: 'pointer' }}>Salir</button>
      </nav>

      <div style={{ padding: '20px', borderRadius: '8px', margin: '1rem', textAlign: 'center', border: '1px solid #bdc3c7' }}>
        <h3>Reporte de Novedades de SST</h3><br />
        <button 
          onClick={mostrarFormulario ? cancelarFormulario : () => setMostrarFormulario(true)} 
          style={{ backgroundColor: '#3c1f1c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '99px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          {mostrarFormulario ? "Cancelar" : "Crear Nuevo Reporte"}
        </button>
      </div>

      {mostrarFormulario && (
        <form onSubmit={handleSubmit(onSubmitReporte)} style={{ border: '1px solid #dee2e6', padding: '25px', borderRadius: '8px', margin: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Seleccionar colaborador</label>
              <select {...register("colaboradorDoc", { required: "Debe seleccionar un colaborador" })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">-- Seleccione --</option>
                {lider.equipo && lider.equipo.map(colab => (
                  <option key={colab.document_number} value={colab.document_number}>{colab.document_number} {colab.nombre}</option>
                ))}
              </select>
              {errors.colaboradorDoc && <span style={{ color: 'red', fontSize: '12px' }}>{errors.colaboradorDoc.message}</span>}
              
              {colaboradorDetalle && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px', padding: '10px', borderRadius: '5px', border: '1px dashed #ccc' }}>
                  <img src={colaboradorDetalle.foto} alt={colaboradorDetalle.nombre} style={{ width: '50px', height: '50px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <h1 style={{ display: 'block' }}>{colaboradorDetalle.nombre}</h1>
                    <h1 style={{ display: 'block' }}>{colaboradorDetalle.document_number}</h1>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '1rem' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>
                  Fecha de creación (Casos antiguos)
                </label>
                <input 
                  type="date" 
                  {...register("fechaCreacionManual")} 
                  style={{ width: '96%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} 
                />
              </div>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Categoría del Evento:</label>
              <select {...register("categoria", { required: "Seleccione una categoría" })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">-- Seleccione --</option>
                <option value="reincorporacion">Reincorporación post incapacidad</option>
                <option value="medicas">Recomendaciones médicas</option>
                <option value="nutricionales">Recomendaciones nutricionales</option>
                <option value="recurrentes">Incapacidades recurrentes</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Género del colaborador:</label>
              <select {...register("genero", { required: "Seleccione género" })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}>
                <option value="">-- Seleccione --</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Tipo de Entidad:</label>
              <select {...register("tipoEntidad", { required: "Seleccione tipo de entidad" })} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: "1px solid #ccc" }}>
                <option value="">-- Seleccione --</option>
                <option value="eps">EPS</option>
                <option value="arl">ARL</option>
                <option value="prepagada">Medicina prepagada</option>
              </select>
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Nombre de la Entidad:</label>
              <input type="text" {...register("nombreEntidad", { required: "Ingrese nombre" })} placeholder="Ej: Sura, Nueva EPS" style={{ width: '96%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Adjuntar Soporte (Opcional):</label>
              <input 
                type="file" 
                {...register("archivo")} 
                style={{ width: '96%', padding: '8px', borderRadius: '4px', border: '1px dashed #ccc' }} 
                accept=".pdf,.jpg,.jpeg,.png"
              />
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Descripción de la Novedad:</label>
            <textarea {...register("descripcion", { required: "Describa la situación" })} rows="4" style={{ width: '98%', padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }} placeholder="Detalle las novedades o recomendaciones médicas observadas..."></textarea>
          </div>

          <button type="submit" style={{ marginTop: '15px', backgroundColor: reporteEnEdicion ? '#3c1f1c' : '#3c1f1c', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '99px', cursor: 'pointer', fontWeight: 'bold', width: '100%' }}>
            {reporteEnEdicion ? "Actualizar" : "Enviar"}
          </button>
        </form>
      )}

      <div style={{ margin: '1rem', border: "1px solid #ddd", borderRadius: "8px", }}>
        {cargandoHistorial ? <p>Cargando...</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
            <thead>
              <tr style={{ backgroundColor: '#3c1f1c', color: "#ffffff" }}>
                <th style={{ padding: '0.5rem' }}>ID reporte</th>
                <th style={{ padding: '0.5rem' }}>Colaborador</th>
                <th style={{ padding: '0.5rem' }}>Estado</th>
                <th style={{ padding: '0.5rem' }}>Fecha y hora reporte</th>
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
                  <td colSpan="5" style={{ padding: '20px', textAlign: 'center', color: '#7f8c8d' }}>Usted no ha creado reportes todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}