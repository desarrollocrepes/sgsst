// src/components/Login.jsx
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // Importamos axios
import "../App.css"

export default function Login() {
  const { register, handleSubmit, formState: { errors }, setError } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      // Petición real a la API con el documento ingresado
      const url = `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${data.documento}`;
      const response = await axios.get(url);

      // Validar si la API respondió correctamente y si el arreglo 'data' contiene elementos
      if (response.data.ok && response.data.data && response.data.data.length > 0) {
        const empleado = response.data.data[0];

        // 1. Validar si el estado es activo
        if (empleado.status !== "activo") {
          setError('documento', { type: 'manual', message: 'El colaborador no se encuentra activo.' });
          return;
        }

        // Guardar la sesión en localStorage para usar el nombre/foto en el Navbar
        localStorage.setItem('usuarioLogueado', JSON.stringify(empleado));

        // 2. Enrutamiento por Roles según las condiciones exactas
        if (empleado.departamento === "Seguridad y Salud en el Trabajo") {
          navigate('/sst');
        } else if (empleado.lider === 1) {
          navigate('/lider');
        } else {
          setError('documento', { type: 'manual', message: 'El documento existe, pero no cuenta con rol de Líder ni SST.' });
        }

      } else {
        setError('documento', { type: 'manual', message: 'Documento de identidad no encontrado.' });
      }

    } catch (error) {
      console.error("Error al conectar con la API de empleados:", error);
      setError('documento', { type: 'manual', message: 'Error de conexión con el servidor de empleados.' });
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '100px auto', fontFamily: 'Arial, sans-serif', padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
      <h2 style={{ textAlign: 'center', color: '#2c3e50' }}>SG-SST</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        <div>
          <label style={{ fontWeight: 'bold' }}>Documento de Identidad:</label>
          <input 
            type="text" 
            {...register('documento', { required: 'El documento es requerido' })} 
            placeholder="Ingrese su identificación"
            style={{ width: '100%', padding: '10px', marginTop: '5px', borderRadius: '4px', border: '1px solid #ccc', boxSizing: 'border-box' }}
          />
          {errors.documento && (
            <span style={{ color: '#e74c3c', fontSize: '14px', display: 'block', marginTop: '5px' }}>
              {errors.documento.message}
            </span>
          )}
        </div>

        <button type="submit" style={{ padding: '10px', backgroundColor: '#2c3e50', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' }}>
          Ingresar al Sistema
        </button>
      </form>
    </div>
  );
}