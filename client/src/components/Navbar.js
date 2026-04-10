import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="nav-brand">RICOGPA</Link>
      <div className="nav-links">
        {user ? (
          <>
            <Link to="/">Dashboard</Link>
            <Link to="/add-course">Add Course</Link>
            <Link to="/courses">Courses</Link>
            <Link to="/forecast">Forecast</Link>
            {user?.role === 'admin' && <Link to="/admin" className="nav-admin">Admin</Link>}
            <button onClick={handleLogout} className="btn-link">Logout</button>
          </>
        ) : (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </div>
    </nav>
  );
}
