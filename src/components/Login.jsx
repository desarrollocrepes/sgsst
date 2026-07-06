import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Shield } from "lucide-react";
import axios from 'axios';
import './Login.css';

export default function Login() {
  const { register, handleSubmit, formState: { errors }, setError } = useForm();
  const navigate = useNavigate();
  const onSubmit = async (data) => {
    try {
      const url = `https://apialohav2.crepesywaffles.com/buk/empleados3?documento=${data.documento}`;
      const response = await axios.get(url);

      if (response.data.ok && response.data.data && response.data.data.length > 0) {
        const empleado = response.data.data[0];

        if (empleado.status !== "activo") {
          setError('documento', { type: 'manual', message: 'Colaborador inactivo' });
          return;
        }

        localStorage.setItem('usuarioLogueado', JSON.stringify(empleado));

        if (empleado.departamento === "Seguridad y Salud en el Trabajo") {
          navigate('/sst');
        } else if (empleado.lider === 1) {
          navigate('/lider');
        } else {
          setError('documento', { type: 'manual', message: 'Acceso no autorizado' });
        }

      } else {
        setError('documento', { type: 'manual', message: 'Documento no encontrado' });
      }

    } catch (error) {
      setError('documento', { type: 'manual', message: 'No fue posible conectar con el servidor' });
    }
  };

  return (
    <div className="login-container">
      
      <h2 className="title"><Shield /> SG-SST</h2>
      
      <form onSubmit={handleSubmit(onSubmit)} className="login-form">
        <div>
          <label>Documento de Identidad:</label>
          <input 
            type="text" 
            {...register('documento', { required: 'El documento es requerido' })} 
            placeholder="Ingrese su identificación"
          />
          {errors.documento && (
            <span className="error-message">
              {errors.documento.message}
            </span>
          )}
        </div>

        <button type="submit">
          Ingresar al Sistema
        </button>
      </form>
    </div>
  );
}