import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import api from '../api';

function DashboardPage() {
  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  // Fetch initial updates
  useEffect(() => {
    fetchUpdates();
  }, []);

  // Setup Socket.IO for real-time updates
  useEffect(() => {
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Connected to server');
    });

    socket.on('new_update', (newUpdate) => {
      console.log('Received new update:', newUpdate);
      setUpdates((prevUpdates) => [newUpdate, ...prevUpdates]);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchUpdates = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/updates');
      setUpdates(response.data.updates || []);
    } catch (err) {
      setError(
        err.response?.data?.error || 
        'Failed to fetch updates. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Out of Stock':
        return '#e74c3c';
      case 'Near Out of Stock':
        return '#f39c12';
      case 'Ordered':
        return '#3498db';
      case 'Restocked':
        return '#27ae60';
      default:
        return '#95a5a6';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Out of Stock':
        return '❌';
      case 'Near Out of Stock':
        return '⚠️';
      case 'Ordered':
        return '📦';
      case 'Restocked':
        return '✅';
      default:
        return '📋';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const filteredUpdates = filter === 'all' 
    ? updates 
    : updates.filter(update => update.status === filter);

  return (
    <div style={{
      minHeight: 'calc(100vh - 120px)',
      padding: '2rem',
      backgroundColor: '#ecf0f1'
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <h2 style={{ color: '#2c3e50', margin: 0 }}>
            Live Inventory Dashboard
          </h2>
          
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilter('all')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: filter === 'all' ? '#3498db' : 'white',
                color: filter === 'all' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              All ({updates.length})
            </button>
            <button
              onClick={() => setFilter('Out of Stock')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: filter === 'Out of Stock' ? '#e74c3c' : 'white',
                color: filter === 'Out of Stock' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Out of Stock
            </button>
            <button
              onClick={() => setFilter('Near Out of Stock')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: filter === 'Near Out of Stock' ? '#f39c12' : 'white',
                color: filter === 'Near Out of Stock' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Near Out
            </button>
            <button
              onClick={() => setFilter('Ordered')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: filter === 'Ordered' ? '#3498db' : 'white',
                color: filter === 'Ordered' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Ordered
            </button>
            <button
              onClick={() => setFilter('Restocked')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: filter === 'Restocked' ? '#27ae60' : 'white',
                color: filter === 'Restocked' ? 'white' : '#333',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '0.9rem'
              }}
            >
              Restocked
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            padding: '1rem',
            marginBottom: '1rem',
            backgroundColor: '#fee',
            color: '#c33',
            borderRadius: '4px'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '1.1rem', color: '#777' }}>Loading updates...</p>
          </div>
        ) : filteredUpdates.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            <p style={{ fontSize: '1.1rem', color: '#777' }}>
              {filter === 'all' 
                ? 'No updates yet. Start by scanning a product!' 
                : `No updates with status "${filter}"`}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filteredUpdates.map((update) => (
              <div
                key={update.id}
                style={{
                  backgroundColor: 'white',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                  borderLeft: `4px solid ${getStatusColor(update.status)}`
                }}
              >
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: update.image_url ? '1fr auto' : '1fr',
                  gap: '1rem'
                }}>
                  <div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginBottom: '0.5rem'
                    }}>
                      <span style={{ fontSize: '1.5rem' }}>
                        {getStatusIcon(update.status)}
                      </span>
                      <h3 style={{
                        margin: 0,
                        color: '#2c3e50',
                        fontSize: '1.2rem'
                      }}>
                        {update.product?.name || 'Unknown Product'}
                      </h3>
                      <span
                        style={{
                          padding: '0.25rem 0.75rem',
                          backgroundColor: getStatusColor(update.status),
                          color: 'white',
                          borderRadius: '12px',
                          fontSize: '0.85rem',
                          fontWeight: 'bold'
                        }}
                      >
                        {update.status}
                      </span>
                    </div>

                    {update.notes && (
                      <p style={{
                        margin: '0.5rem 0',
                        color: '#555',
                        fontSize: '0.95rem'
                      }}>
                        {update.notes}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      gap: '1.5rem',
                      marginTop: '0.75rem',
                      fontSize: '0.85rem',
                      color: '#777'
                    }}>
                      <span>👤 {update.user?.username || 'Unknown'}</span>
                      <span>🕒 {formatTimestamp(update.timestamp)}</span>
                      <span>🔖 {update.product?.qr_identifier || 'N/A'}</span>
                    </div>
                  </div>

                  {update.image_url && (
                    <div>
                      <img
                        src={update.image_url}
                        alt="Product"
                        style={{
                          maxWidth: '200px',
                          maxHeight: '150px',
                          borderRadius: '4px',
                          objectFit: 'cover',
                          border: '1px solid #ddd'
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardPage;
