import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

// Idealmente, esto debería estar en una variable de entorno (.env)
const API_URL = 'https://macfer.crepesywaffles.com/api/sstreportes';

export default function VistaLider() {
  const navigate = useNavigate();
  
  // Estados
  const [lider, setLider] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [reporteEnEdicion, setReporteEnEdicion] = useState(null);
  const [colaboradorDetalle, setColaboradorDetalle] = useState(null);

  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm();
  const colaboradorSeleccionadoDoc = watch("colaboradorDoc");

  // Verificación de sesión
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

  // Cargar historial
  const cargarHistorialDesdeStrapi = async (nombreLider) => {
    try {
      setCargandoHistorial(true);
      const url = `${API_URL}?filters[creador_reporte_nombre][$eq]=${encodeURIComponent(nombreLider)}&sort=createdAt:desc`;
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

  // Detalle del colaborador seleccionado
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

  const handleEditar = (reporte) => {
    setReporteEnEdicion(reporte);
    setMostrarFormulario(true);
    const attrs = reporte.attributes;

    setValue("colaboradorDoc", attrs.colaborador_documento);
    setValue("categoria", attrs.categoria);
    setValue("genero", attrs.genero);
    setValue("tipoEntidad", attrs.tipo_entidad);
    setValue("nombreEntidad", attrs.nombre_entidad);
    setValue("descripcion", attrs.descripcion);
  };

  const handleEliminar = async (id) => {
    const confirmar = window.confirm("¿Está seguro de que desea eliminar este reporte de forma permanente?");
    if (confirmar) {
      try {
        await axios.delete(`${API_URL}/${id}`);
        alert("Reporte eliminado correctamente.");
        cargarHistorialDesdeStrapi(lider.nombre);
      } catch (error) {
        console.error("Error al eliminar el reporte:", error);
        alert("No se pudo eliminar el reporte. Verifique si tiene gestiones asociadas.");
      }
    }
  };

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
          creador_reporte_nombre: lider.nombre,
        }
      };

      if (reporteEnEdicion) {
        await axios.put(`${API_URL}/${reporteEnEdicion.id}`, payload);
        alert("Reporte actualizado con éxito.");
      } else {
        payload.data.estado = "abierto";
        payload.data.fecha_creacion_manual = new Date().toISOString();
        await axios.post(API_URL, payload);
        alert("Reporte guardado con éxito en el sistema.");
      }
      
      cancelarFormulario();
      cargarHistorialDesdeStrapi(lider.nombre);
    } catch (error) {
      // Extraemos el detalle específico del error de Strapi v4
      const errorDetalle = error.response?.data?.error;
      
      console.error("Error completo de Strapi:", errorDetalle || error);
      
      if (errorDetalle && errorDetalle.details && errorDetalle.details.errors) {
        // Si hay errores de validación específicos, los mostramos
        const camposFallando = errorDetalle.details.errors.map(e => e.path.join('.')).join(', ');
        alert(`Error de validación en los campos: ${camposFallando}. Revisa la consola.`);
      } else {
        alert(`Error 400: ${errorDetalle?.message || 'Revisa la consola para más detalles'}`);
      }
    }
  };

  const cancelarFormulario = () => {
    setMostrarFormulario(false);
    setReporteEnEdicion(null);
    reset();
  };

  if (!lider) return <p style={{ padding: '20px' }}>Cargando sesión del líder...</p>;

  return (
    <div style={styles.container}>
      {/* NAVBAR */}
      <nav style={styles.nav}>
        <div style={styles.navUser}>
          <img src={lider.foto} alt={lider.nombre} style={styles.avatar} />
          <div>
            <h4 style={{ margin: 0 }}>{lider.nombre}</h4>
            <small style={{ color: '#bdc3c7' }}>{lider.cargo} - {lider.departamento}</small>
          </div>
        </div>
        <button onClick={cerrarSesion} style={styles.btnDanger}>
          Salir
        </button>
      </nav>

      {/* BANNER */}
      <div style={styles.banner}>
        <h3>Gestión de Novedades de Seguridad y Salud</h3>
        <p>Reporte reincorporaciones, recomendaciones o incapacidades recurrentes de su equipo de trabajo asignado.</p>
        <button 
          onClick={mostrarFormulario ? cancelarFormulario : () => setMostrarFormulario(true)} 
          style={styles.btnPrimary}
        >
          {mostrarFormulario ? "Cancelar / Cerrar Formulario" : "Crear Nuevo Reporte"}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <form onSubmit={handleSubmit(onSubmitReporte)} style={styles.formContainer}>
          <h4 style={styles.formTitle}>
            {reporteEnEdicion ? `Editando Reporte #${reporteEnEdicion.id}` : "Formulario de Reporte Obligatorio"}
          </h4>
          
          <div style={styles.gridContainer}>
            <div>
              <label style={styles.label}>Seleccionar Colaborador de su Equipo:</label>
              <select {...register("colaboradorDoc", { required: "Debe seleccionar un colaborador" })} style={styles.input}>
                <option value="">-- Seleccione --</option>
                {lider.equipo.map(colab => (
                  <option key={colab.document_number} value={colab.document_number}>{colab.nombre}</option>
                ))}
              </select>
              {errors.colaboradorDoc && <span style={styles.errorText}>{errors.colaboradorDoc.message}</span>}
              
              {colaboradorDetalle && (
                <div style={styles.colaboradorCard}>
                  <img src={colaboradorDetalle.foto} alt={colaboradorDetalle.nombre} style={styles.avatar} />
                  <div>
                    <strong style={{ display: 'block' }}>{colaboradorDetalle.nombre}</strong>
                    <small>Documento: {colaboradorDetalle.document_number}</small>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label style={styles.label}>Categoría del Evento:</label>
              <select {...register("categoria", { required: "Seleccione una categoría" })} style={styles.input}>
                <option value="">-- Seleccione --</option>
                <option value="reincorporacion">Reincorporación post incapacidad</option>
                <option value="recomendaciones_medicas">Recomendaciones médicas</option>
                <option value="recomendaciones_nutricionales">Recomendaciones nutricionales</option>
                <option value="incapacidades_recurrentes">Incapacidades recurrentes</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Género del colaborador:</label>
              <select {...register("genero", { required: "Seleccione género" })} style={styles.input}>
                <option value="">-- Seleccione --</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Tipo de Entidad:</label>
              <select {...register("tipoEntidad", { required: "Seleccione tipo de entidad" })} style={styles.input}>
                <option value="">-- Seleccione --</option>
                <option value="EPS">EPS</option>
                <option value="ARL">ARL</option>
                <option value="MEDICINA PREPAGADA">Medicina prepagada</option>
              </select>
            </div>

            <div>
              <label style={styles.label}>Nombre de la Entidad:</label>
              <input type="text" {...register("nombreEntidad", { required: "Ingrese nombre" })} placeholder="Ej: Sura, Nueva EPS" style={styles.input} />
            </div>
          </div>

          <div style={{ marginTop: '15px' }}>
            <label style={styles.label}>Descripción de la Novedad:</label>
            <textarea {...register("descripcion", { required: "Describa la situación" })} rows="4" style={styles.textarea} placeholder="Detalle las novedades o recomendaciones médicas observadas..."></textarea>
          </div>

          <button type="submit" style={reporteEnEdicion ? styles.btnWarningBlock : styles.btnSuccessBlock}>
            {reporteEnEdicion ? "Actualizar Reporte" : "Enviar a Seguridad y Salud"}
          </button>
        </form>
      )}

      {/* HISTORIAL LOCAL */}
      <div style={{ marginTop: '30px' }}>
        <h3 style={styles.historyTitle}>Mis Reportes Radicados</h3>
        
        {cargandoHistorial ? <p>Consultando base de datos de Strapi...</p> : (
          <table style={styles.table}>
            <thead>
              <tr style={{ backgroundColor: '#f2f2f2' }}>
                <th style={styles.th}>ID</th>
                <th style={styles.th}>Colaborador</th>
                <th style={styles.th}>Estado</th>
                <th style={styles.th}>Fecha Registro</th>
                <th style={styles.th}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((rep) => (
                <tr key={rep.id} style={{ borderBottom: '1px solid #ddd' }}>
                  <td style={styles.tdBold}>{rep.id}</td>
                  <td style={styles.td}>
                    <div style={styles.tableUser}>
                      <img src={rep.attributes.colaborador_foto} alt="foto" style={styles.tableAvatar} />
                      <div>
                        <span style={{ display: 'block', fontWeight: '500' }}>{rep.attributes.colaborador_nombre}</span>
                        <small style={{ color: '#7f8c8d' }}>Doc: {rep.attributes.colaborador_documento}</small>
                      </div>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <span style={rep.attributes.estado === 'abierto' ? styles.badgeOpen : styles.badgeClosed}>
                      {rep.attributes.estado}
                    </span>
                  </td>
                  <td style={styles.td}>{new Date(rep.attributes.createdAt).toLocaleString()}</td>
                  <td style={styles.td}>
                    <button onClick={() => handleEditar(rep)} style={styles.btnEdit}>Editar</button>
                    <button onClick={() => handleEliminar(rep.id)} style={styles.btnDelete}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {historial.length === 0 && (
                <tr>
                  <td colSpan="5" style={styles.emptyTable}>Usted no ha creado reportes todavía.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

// Objeto de estilos extraído para limpiar el JSX
const styles = {
  container: { padding: '20px' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c3e50', color: 'white', padding: '10px 20px', borderRadius: '8px' },
  navUser: { display: 'flex', alignItems: 'center', gap: '15px' },
  avatar: { width: '45px', height: '45px', borderRadius: '50%', objectFit: 'cover' },
  btnDanger: { backgroundColor: '#e74c3c', color: 'white', border: 'none', padding: '8px 15px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold' },
  banner: { backgroundColor: '#ecf0f1', padding: '20px', borderRadius: '8px', marginTop: '20px', textAlign: 'center', border: '1px solid #bdc3c7' },
  btnPrimary: { backgroundColor: '#3498db', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  formContainer: { backgroundColor: '#fff', border: '1px solid #dee2e6', padding: '25px', borderRadius: '8px', marginTop: '20px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' },
  formTitle: { marginTop: 0, color: '#2c3e50' },
  gridContainer: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' },
  label: { fontWeight: 'bold', display: 'block', marginBottom: '5px' },
  input: { width: '100%', padding: '8px', borderRadius: '4px', boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '8px', borderRadius: '4px', boxSizing: 'border-box' },
  errorText: { color: 'red', fontSize: '12px' },
  colaboradorCard: { display: 'flex', alignItems: 'center', gap: '15px', marginTop: '15px', padding: '10px', backgroundColor: '#f9f9f9', borderRadius: '5px', border: '1px dashed #ccc' },
  btnSuccessBlock: { marginTop: '15px', backgroundColor: '#2ecc71', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  btnWarningBlock: { marginTop: '15px', backgroundColor: '#f39c12', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold', width: '100%' },
  historyTitle: { color: '#2c3e50', borderBottom: '2px solid #ecf0f1', paddingBottom: '10px' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: '15px', textAlign: 'left' },
  th: { padding: '12px' },
  td: { padding: '12px' },
  tdBold: { padding: '12px', fontWeight: 'bold' },
  tableUser: { display: 'flex', alignItems: 'center', gap: '10px' },
  tableAvatar: { width: '35px', height: '35px', borderRadius: '50%', objectFit: 'cover' },
  badgeOpen: { backgroundColor: '#ffeaa7', color: '#d63031', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
  badgeClosed: { backgroundColor: '#dff9fb', color: '#0097e6', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' },
  btnEdit: { marginRight: '5px', padding: '5px 10px', cursor: 'pointer', backgroundColor: '#f39c12', color: 'white', border: 'none', borderRadius: '3px' },
  btnDelete: { padding: '5px 10px', cursor: 'pointer', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '3px' },
  emptyTable: { padding: '20px', textAlign: 'center', color: '#7f8c8d' }
};