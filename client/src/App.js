import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Signup from './components/Signup';
import Dashboard from './components/Dashboard';
import Scanner from './components/Scanner';
import Reports from './components/Reports';
import Products from './components/Products';
import ProductDetail from './components/ProductDetail';
import Navbar from './components/Navbar';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const handleLogin = (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <div className="App">
        {token && <Navbar user={user} onLogout={handleLogout} />}
        <div className="container">
          <Routes>
            <Route
              path="/login"
              element={!token ? <Login onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/signup"
              element={!token ? <Signup onLogin={handleLogin} /> : <Navigate to="/dashboard" />}
            />
            <Route
              path="/dashboard"
              element={token ? <Dashboard token={token} /> : <Navigate to="/login" />}
            />
            <Route
              path="/scanner"
              element={token ? <Scanner token={token} /> : <Navigate to="/login" />}
            />
            <Route
              path="/products"
              element={token ? <Products token={token} /> : <Navigate to="/login" />}
            />
            <Route
              path="/product/:qrCode"
              element={token ? <ProductDetail token={token} /> : <Navigate to="/login" />}
            />
            <Route
              path="/reports"
              element={token ? <Reports token={token} /> : <Navigate to="/login" />}
            />
            <Route path="/" element={<Navigate to={token ? "/dashboard" : "/login"} />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
