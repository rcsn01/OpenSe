import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { API } from '../api';
import { useAuth } from '../AuthContext';

export default function LoginPage() {
  const nav = useNavigate();
  const loc = useLocation();
  const { setToken, setUser } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login');
  const [error, setError] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const fn = mode === 'login' ? API.login : API.register;
      const res = await fn(email, password);
      setToken(res.access_token);
      setUser(res.user);
      const dest = loc.state?.from?.pathname || '/dashboard';
      nav(dest, { replace: true });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div style={{ maxWidth: 420, margin: '40px auto' }}>
      <h2>{mode === 'login' ? 'Login' : 'Register'}</h2>
      <form onSubmit={onSubmit}>
        <div style={{ marginBottom: 12 }}>
          <label>Email</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%' }} />
        </div>
        <div style={{ marginBottom: 12 }}>
          <label>Password</label>
          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%' }} />
        </div>
        {error && <div style={{ color: 'red', marginBottom: 12 }}>{String(error)}</div>}
        <button type="submit">{mode === 'login' ? 'Login' : 'Create account'}</button>
        <button type="button" style={{ marginLeft: 12 }} onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account?' : 'Have an account?'}
        </button>
      </form>
    </div>
  );
}
