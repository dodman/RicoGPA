import React, { useEffect, useState, useContext } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Link,
  Navigate,
  useLocation
} from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddCourse from './pages/AddCourse';
import Courses from './pages/Courses';
import Admin from './pages/Admin';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AuthContext from './AuthContext';

const STORAGE_KEY = 'ricogpa_auth';

function RequireAuth({ children, adminOnly = false }) {
  const { auth } = useContext(AuthContext);
  const location = useLocation();

  if (!auth || !auth.token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && !auth.user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppInner() {
  const [auth, setAuth] = useState({ user: null, token: null });

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.token) {
          setAuth(parsed);
        }
      }
    } catch (e) {
      console.error('Failed to read auth from storage', e);
    }
  }, []);

  useEffect(() => {
    try {
      if (auth && auth.token) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (e) {
      console.error('Failed to write auth to storage', e);
    }
  }, [auth]);

  const logout = () => {
    setAuth({ user: null, token: null });
  };

  return (
    <AuthContext.Provider value={{ auth, setAuth, logout }}>
      <nav className="topnav">
        <h1>RicoGPA</h1>

        <div className="nav-right">
          {auth && auth.token ? (
            <>
              <div className="nav-links-row">
                <Link to="/">Dashboard</Link>
                <Link to="/add">Add Course</Link>
                <Link to="/courses">Courses</Link>
                {auth.user?.isAdmin && <Link to="/admin">Admin</Link>}
                <button className="link-button" onClick={logout}>
                  Logout
                </button>
              </div>

              <div className="nav-welcome">Hi, {auth.user?.name}</div>
            </>
          ) : (
            <div className="nav-links-row">
              <Link to="/login">Login</Link>
              <Link to="/register">Register</Link>
            </div>
          )}
        </div>
      </nav>

      <Routes>
        <Route
          path="/"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/add"
          element={
            <RequireAuth>
              <AddCourse />
            </RequireAuth>
          }
        />
        <Route
          path="/courses"
          element={
            <RequireAuth>
              <Courses />
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAuth adminOnly>
              <Admin />
            </RequireAuth>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset/:token" element={<ResetPassword />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  );
}