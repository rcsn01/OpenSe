import React from 'react';
import { useNavigate } from 'react-router-dom';

function Navbar({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <div className="navbar">
      <h1>📦 Fill The Shelf</h1>
      <div className="navbar-actions">
        <button className="btn btn-secondary" onClick={() => navigate('/dashboard')}>
          Dashboard
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/scanner')}>
          Scan QR Code
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/reports')}>
          Reports
        </button>
        <button className="btn btn-danger" onClick={onLogout}>
          Logout ({user?.username})
        </button>
      </div>
    </div>
  );
}

export default Navbar;
