import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API } from '../api';
import { useAuth } from '../AuthContext';

function UpdateCard({ u }) {
  return (
    <div style={{ border: '1px solid #ddd', padding: 12, borderRadius: 6 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {u.image_url && (
          <a href={u.image_url} target="_blank" rel="noreferrer">
            <img src={u.image_url} alt="upload" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 4 }} />
          </a>
        )}
        <div style={{ flex: 1 }}>
          <div><strong>{u.product?.name || u.product?.code}</strong></div>
          <div>Status: {u.status}</div>
          {u.notes && <div>Notes: {u.notes}</div>}
          <div style={{ color: '#666', fontSize: 12 }}>
            by {u.user?.email || u.user_id} at {new Date(u.created_at).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { token } = useAuth();
  const [updates, setUpdates] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await API.getUpdates(token);
        if (mounted) setUpdates(data);
      } catch (err) {
        if (mounted) setError(err.message);
      }
    })();
    return () => { mounted = false; };
  }, [token]);

  const socket = useMemo(() => io('/', { transports: ['websocket'] }), []);
  useEffect(() => {
    socket.on('connect', () => {
      // connected
    });
    socket.on('update_created', (payload) => {
      setUpdates(prev => [payload, ...prev]);
    });
    return () => {
      socket.disconnect();
    };
  }, [socket]);

  return (
    <div style={{ maxWidth: 900, margin: '20px auto', display: 'grid', gap: 12 }}>
      <h2>Live Dashboard</h2>
      {error && <div style={{ color: 'red' }}>{String(error)}</div>}
      {updates.map(u => (
        <UpdateCard key={u.id} u={u} />
      ))}
      {!updates.length && <div>No updates yet</div>}
    </div>
  );
}
