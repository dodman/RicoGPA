import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();

  const token = localStorage.getItem("ricotoken");

  function logout() {
    localStorage.removeItem("ricotoken");
    navigate("/login");
  }

  // a small helper to highlight the active page
  function active(path) {
    return location.pathname === path ? { fontWeight: "bold" } : {};
  }

  return (
    <nav
      style={{
        width: "100%",
        background: "#0a4dad",
        padding: "15px",
        color: "white",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center"
      }}
    >
      <div style={{ fontSize: "22px", fontWeight: "bold" }}>
        <Link to="/" style={{ color: "white", textDecoration: "none" }}>
          RicoGPA
        </Link>
      </div>

      <div style={{ display: "flex", gap: "20px" }}>
        <Link to="/" style={{ color: "white", ...active("/") }}>
          Dashboard
        </Link>

        <Link to="/add" style={{ color: "white", ...active("/add") }}>
          Add Course
        </Link>

        {!token && (
          <>
            <Link to="/login" style={{ color: "white", ...active("/login") }}>
              Login
            </Link>

            <Link
              to="/register"
              style={{ color: "white", ...active("/register") }}
            >
              Register
            </Link>
          </>
        )}

        {token && (
          <button
            onClick={logout}
            style={{
              background: "white",
              color: "#0a4dad",
              border: "none",
              borderRadius: "4px",
              padding: "5px 10px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
          >
            Logout
          </button>
        )}
      </div>
    </nav>
  );
}