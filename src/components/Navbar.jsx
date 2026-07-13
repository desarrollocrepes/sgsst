import Avatar from "./Avatar";

export default function Navbar({ user, onLogout }) {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span>SG-SST</span>
      </div>
      <div className="navbar-user">
        <div className="navbar-user-info">
          <div className="navbar-user-name">{user?.nombre}</div>
          <div className="navbar-user-role">{user?.departamento}</div>
        </div>
        {user?.foto ? (
          <img src={user.foto} alt={user.nombre} className="navbar-avatar" onError={e => e.target.style.display = "none"} />
        ) : (
          <Avatar name={user?.nombre} size={38} />
        )}
        <button className="logout-btn" onClick={onLogout}>Salir</button>
      </div>
    </nav>
  );
}