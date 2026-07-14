import { useState } from "react";
import { Clipboard } from "lucide-react";
import { API_EMPLEADOS } from "../config/api";

export default function Login({ onLogin }) {
  const [doc, setDoc] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin() {
    if (!doc.trim()) { setError("Ingresa tu número de documento"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API_EMPLEADOS}?documento=${doc.trim()}`);
      const json = await res.json();
      
      if (!json.ok || !json.data?.length) { 
        setError("Documento no encontrado"); setLoading(false); return; 
      }
      
      const emp = json.data[0];
      if (emp.status !== "activo") { 
        setError("Tu cuenta no está activa"); setLoading(false); return; 
      }
      
      const isSST = emp.departamento === "Seguridad y Salud en el Trabajo";
      const isLider = emp.lider === 1;
      
      if (!isSST && !isLider) { 
        setError("No tienes permiso para acceder"); setLoading(false); return; 
      }
      
      // GUARDAR SESIÓN AQUÍ (dentro del try, cuando ya validamos todo)
      localStorage.setItem("userSession", JSON.stringify(emp));
      onLogin(emp);
      
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    }
    setLoading(false);
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-logo"><Clipboard /></div>
        <div className="login-title">SG-SST</div>
        <input
          className="login-input"
          type="number"
          placeholder="Ingresa tu cédula"
          value={doc}
          onChange={e => setDoc(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleLogin()}
          autoFocus
        />
        {error && <div className="login-error">{error}</div>}
        <button className="login-btn" onClick={handleLogin} disabled={loading}>
          {loading ? <><span className="spinner" />Validando...</> : "Ingresar"}
        </button>
      </div>
    </div>
  );
}