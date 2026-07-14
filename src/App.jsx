import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar"; // Asegúrate de extraer este componente
import Login from "./views/Login";
import Lider from "./views/Lider";
import SST from "./views/STT";
import "./App.css";

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Al cargar la app, busca si ya hay un usuario guardado
    const savedUser = localStorage.getItem("userSession");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("userSession");
    setUser(null);
  };

  // Lógica de roles
  const isSST = user?.departamento === "Seguridad y Salud en el Trabajo";
  const isLider = user?.lider === 1;

  return (
    <BrowserRouter>
      {/* Si hay usuario, mostramos el Navbar en todas las rutas privadas */}
      {user && <Navbar user={user} onLogout={() => setUser(null)} />}

      <Routes>
        {/* Ruta Raíz: Redirige según el rol del usuario */}
        <Route 
          path="/" 
          element={
            !user ? <Navigate to="/login" replace /> :
            isSST ? <Navigate to="/sst" replace /> :
            isLider ? <Navigate to="/lider" replace /> :
            <div className="page"><div className="empty-state">Sin acceso.</div></div>
          } 
        />

        {/* Ruta Login */}
        <Route 
          path="/login" 
          element={
            user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />
          } 
        />

        {/* Ruta Líder (Protegida) */}
        <Route 
          path="/lider" 
          element={
            !user ? <Navigate to="/login" replace /> :
            !isLider ? <Navigate to="/" replace /> :
            <Lider user={user} />
          } 
        />

        {/* Ruta SST (Protegida) */}
        <Route 
          path="/sst" 
          element={
            !user ? <Navigate to="/login" replace /> :
            !isSST ? <Navigate to="/" replace /> :
            <SST user={user} />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}