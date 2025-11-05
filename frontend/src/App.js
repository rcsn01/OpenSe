import React from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';

function RequireAuth({ children }) {
  const { token } = useAuth();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

function Nav() {
  const { token, setToken, setUser } = useAuth();
  return (
    <nav style={{ display: 'flex', gap: 12, padding: 12, borderBottom: '1px solid #ddd' }}>
      <Link to="/dashboard">Dashboard</Link>
      <Link to="/scan">Scan</Link>
      <span style={{ marginLeft: 'auto' }}>
        {token ? (
          <button onClick={() => { setToken(null); setUser(null); }}>Logout</button>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </span>
    </nav>
  );
}

export default function App() {
  return (
    <div>
      <Nav />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/scan" element={<RequireAuth><ScanPage /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </div>
  );
}
