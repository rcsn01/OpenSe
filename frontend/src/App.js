import React from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isLoggedIn } = useAuth();
  
  if (!isLoggedIn) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  const { isLoggedIn, logout, user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation Bar */}
      {isLoggedIn && (
        <nav style={{
          backgroundColor: '#2c3e50',
          color: 'white',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>📦 Inventory Tracker</h1>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                Dashboard
              </Link>
              <Link to="/scan" style={{ color: 'white', textDecoration: 'none', padding: '0.5rem 1rem', borderRadius: '4px', backgroundColor: 'rgba(255,255,255,0.1)' }}>
                Scan Product
              </Link>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            {user && <span style={{ fontSize: '0.9rem' }}>👤 {user.username}</span>}
            <button
              onClick={logout}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#e74c3c',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Logout
            </button>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <ScanPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>

      {/* Footer */}
      <footer style={{
        backgroundColor: '#34495e',
        color: 'white',
        padding: '1rem',
        textAlign: 'center',
        fontSize: '0.9rem'
      }}>
        <p>© 2025 Inventory Status Reporting System</p>
      </footer>
    </div>
  );
}

export default App;
