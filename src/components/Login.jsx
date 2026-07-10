import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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
          setError('documento', { type: 'manual', message: 'Documento inactivo' });
          return;
        }

        localStorage.setItem('usuarioLogueado', JSON.stringify(empleado));

        if (empleado.departamento === "Seguridad y Salud en el Trabajo") {
          navigate('/sst');
        } else if (empleado.lider === 1) {
          navigate('/lider');
        } else {
          setError('documento', { type: 'manual', message: 'Documento no cuenta pemisos' });
        }
      } else {
        setError('documento', { type: 'manual', message: 'Documento no encontrado' });
      }
    } catch (error) {
      setError('documento', { type: 'manual', message: 'Error' });
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Arial, sans-serif' }}>
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', width: '100%', maxWidth: '420px', textAlign: 'center' }}>
        
        <h2 style={{ color: '#4a2c2a', marginBottom: '10px', fontSize: '24px' }}>SG-SST</h2>
        <p style={{ color: '#7f8c8d', marginBottom: '10px', fontSize: '14px' }}>Ingrese su número de documento para acceder</p>
        
        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '20px', textAlign: 'left' }}>
          <div>
            <input 
              type="text" 
              {...register('documento', { required: 'El documento es requerido' })} 
              placeholder="Ej: 1234567890"
              style={{ width: '100%', padding: '12px 15px', marginTop: '8px', borderRadius: '8px', border: '1px solid #e0e0e0', boxSizing: 'border-box', fontSize: '15px', outline: 'none' }}
              onFocus={(e) => e.target.style.borderColor = '#4a2c2a'}
              onBlur={(e) => e.target.style.borderColor = '#e0e0e0'}
            />
            {errors.documento && (
              <span style={{ color: '#e74c3c', fontSize: '13px', display: 'block', marginTop: '5px' }}>
                {errors.documento.message}
              </span>
            )}
          </div>

          <button type="submit" style={{ padding: '14px', backgroundColor: '#4a2c2a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', transition: 'background-color 0.2s' }}>
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}