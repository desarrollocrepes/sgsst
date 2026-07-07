import "./Navbar.css";

export default function Navbar({ usuario, rol, cerrarSesion }) {
  return (
    <nav className="navbar">
      <div className="navbar-user">
        <img
          src={usuario.foto}
          alt={usuario.nombre}
          className="navbar-avatar"
        />

        <div>
          <h4>{usuario.nombre}</h4>

          <small>
            {usuario.cargo} - {usuario.departamento}
          </small>
        </div>
      </div>

      <button className="navbar-logout" onClick={cerrarSesion}>
        Salir
      </button>
    </nav>
  );
}