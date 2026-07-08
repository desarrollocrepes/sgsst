import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowUp, ArrowDown } from "lucide-react";
import "./VistaLider.css";

// mover a (.env)
const API_URL = 'https://macfer.crepesywaffles.com/api/sstreportes';

export default function VistaLider() {
  const navigate = useNavigate();
  const [lider, setLider] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [historial, setHistorial] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(true);
  const [reporteEnEdicion, setReporteEnEdicion] = useState(null);
  const [colaboradorDetalle, setColaboradorDetalle] = useState(null);
  const { register, handleSubmit, watch, reset, setValue, formState: { errors } } = useForm();
  const colaboradorSeleccionadoDoc = watch("colaboradorDoc");

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
      const url = `${API_URL}?filters[creador_reporte_nombre][$eq]=${encodeURIComponent(nombreLider)}&sort=createdAt:desc`;
      const response = await axios.get(url);
      setHistorial(response.data.data || []);
    } catch (error) {
      console.error("Error historial:", error);
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

  const handleEditar = (reporte) => {
    setReporteEnEdicion(reporte);
    setMostrarFormulario(true);
    const attrs = reporte.attributes;

    setValue("colaboradorDoc", attrs.colaborador_documento);
    
    // Ajuste de formato de fecha para el input
    let fechaFormateada = attrs.fecha_creacion_manual;
    if (fechaFormateada && fechaFormateada.includes('T')) {
      fechaFormateada = fechaFormateada.split('T')[0];
    }
    setValue("fecha_creacion_manual", fechaFormateada);

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
        alert("Reporte eliminado correctamente");
        cargarHistorialDesdeStrapi(lider.nombre);
      } catch (error) {
        console.error("Error eliminar reporte:", error);
        alert("No se pudo eliminar el reporte.");
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
          fecha_creacion_manual: data.fecha_creacion_manual || null,
        }
      };

      if (reporteEnEdicion) {
        await axios.put(`${API_URL}/${reporteEnEdicion.id}`, payload);
        alert("Reporte actualizado con éxito");
      } else {
        payload.data.estado = "abierto";
        if (!payload.data.fecha_creacion_manual) {
          payload.data.fecha_creacion_manual = new Date().toISOString();
        }
        await axios.post(API_URL, payload);
        alert("Reporte guardado con éxito en el sistema");
      }
      
      cancelarFormulario();
      cargarHistorialDesdeStrapi(lider.nombre);
    } catch (error) {
      const errorDetalle = error.response?.data?.error;
      if (errorDetalle && errorDetalle.details && errorDetalle.details.errors) {
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

  if (!lider) return <p style={{ padding: "20px" }}>Cargando...</p>;

  return (
    <div className="vista-lider-container">
      {/* NAVBAR */}
      <nav className="navbar">
        <div className="nav-user">
          <img src={lider.foto} alt={lider.nombre} className="avatar" />
          <div className="nav-user-info">
            <h4>{lider.nombre}</h4>
            <small>{lider.cargo} - {lider.departamento}</small>
          </div>
        </div>
        <button onClick={cerrarSesion} className="btn btn-danger">
          Salir
        </button>
      </nav>

      {/* BANNER */}
      <div className="banner">
        <h3>Gestión de Novedades de Seguridad y Salud</h3>
        <p>Reporte reincorporaciones, recomendaciones o incapacidades recurrentes de su equipo de trabajo asignado.</p>
        <button 
          className="btn btn-primary"
          onClick={mostrarFormulario ? cancelarFormulario : () => setMostrarFormulario(true)}
        >
          {mostrarFormulario ? (
            <>
              Cancelar / Cerrar Formulario
              <ArrowUp size={18} />
            </>
          ) : (
            <>
              Crear Nuevo Reporte
              <ArrowDown size={18} />
            </>
          )}
        </button>
      </div>

      {/* FORMULARIO */}
      {mostrarFormulario && (
        <form className="form-container" onSubmit={handleSubmit(onSubmitReporte)}>
          <h4 className="form-title">
            {reporteEnEdicion ? `Editando Reporte #${reporteEnEdicion.id}` : "Formulario de Reporte Obligatorio"}
          </h4>
          
          <div className="form-grid">
            <div className="form-group">
              <label>Seleccionar colaborador</label>
              <select className="form-control" {...register("colaboradorDoc", { required: "Debe seleccionar un colaborador" })}>
                <option value="">-- Seleccione --</option>
                {lider.equipo.map(colab => (
                  <option key={colab.document_number} value={colab.document_number}>{colab.nombre}</option>
                ))}
              </select>
              {errors.colaboradorDoc && <span className="error-text">{errors.colaboradorDoc.message}</span>}
              
              {colaboradorDetalle && (
                <div className="colaborador-card">
                  <img src={colaboradorDetalle.foto} alt={colaboradorDetalle.nombre} className="avatar" />
                  <div>
                    <strong style={{display: 'block'}}>{colaboradorDetalle.nombre}</strong>
                    <small>{colaboradorDetalle.document_number}</small>
                  </div>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Fecha creación</label>
              <input type="date" className="form-control" {...register('fecha_creacion_manual')} />
            </div>

            <div className="form-group">
              <label>Categoría del Evento:</label>
              <select className="form-control" {...register("categoria", { required: "Seleccione una categoría" })}>
                <option value="">-- Seleccione --</option>
                <option value="reincorporacion">Reincorporación post incapacidad</option>
                <option value="medicas">Recomendaciones médicas</option>
                <option value="nutricionales">Recomendaciones nutricionales</option>
                <option value="recurrentes">Incapacidades recurrentes</option>
                <option value="otro">Otro</option>
              </select>
            </div>

            <div className="form-group">
              <label>Género del colaborador:</label>
              <select className="form-control" {...register("genero", { required: "Seleccione género" })}>
                <option value="">-- Seleccione --</option>
                <option value="hombre">Hombre</option>
                <option value="mujer">Mujer</option>
              </select>
            </div>

            <div className="form-group">
              <label>Tipo de Entidad:</label>
              <select className="form-control" {...register("tipoEntidad", { required: "Seleccione tipo de entidad" })}>
                <option value="">-- Seleccione --</option>
                <option value="EPS">EPS</option>
                <option value="ARL">ARL</option>
                <option value="MEDICINA PREPAGADA">Medicina prepagada</option>
              </select>
            </div>

            <div className="form-group">
              <label>Nombre de la Entidad:</label>
              <input type="text" className="form-control" {...register("nombreEntidad", { required: "Ingrese nombre" })} placeholder="Ej: Sura, Nueva EPS" />
            </div>
          </div>
          
          <div className="form-group" style={{ marginTop: '20px' }}>
            <label>Descripción de la Novedad:</label>
            <textarea className="form-control" {...register("descripcion", { required: "Describa la situación" })} rows="4" placeholder="Detalle las novedades o recomendaciones médicas observadas..."></textarea>
          </div>

          <button type="submit" className={`btn ${reporteEnEdicion ? 'btn-warning' : 'btn-success'}`}>
            {reporteEnEdicion ? "Actualizar Reporte" : "Enviar a Seguridad y Salud"}
          </button>
        </form>
      )}

      {/* HISTORIAL LOCAL */}
      <div className="historial-section">
        <h3 className="historial-title">Mis Reportes Radicados</h3>
        
        {cargandoHistorial ? <p>Consultando base de datos de Strapi...</p> : (
          <div className="table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Colaborador</th>
                  <th>Estado</th>
                  <th>Fecha Registro</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {historial.map((rep) => (
                  <tr key={rep.id}>
                    <td><strong>{rep.id}</strong></td>
                    <td>
                      <div className="table-user">
                        <img src={rep.attributes.colaborador_foto} alt="foto" className="table-avatar" />
                        <div>
                          <span style={{display: 'block', fontWeight: '500'}}>{rep.attributes.colaborador_nombre}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${rep.attributes.estado === 'abierto' ? 'badge-open' : 'badge-closed'}`}>
                        {rep.attributes.estado}
                      </span>
                    </td>
                    <td>
                      {rep.attributes.fecha_creacion_manual?.split("-").reverse().join("/")}
                    </td>
                    <td>
                      <button className="btn-sm btn-edit" onClick={() => handleEditar(rep)}>Editar</button>
                      <button className="btn-sm btn-delete" onClick={() => handleEliminar(rep.id)}>Eliminar</button>
                    </td>
                  </tr>
                ))}
                {historial.length === 0 && (
                  <tr>
                    <td colSpan="5" className="empty-state">Usted no ha creado reportes todavía</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}