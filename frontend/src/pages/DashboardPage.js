import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { API } from '../api';
import { useAuth } from '../AuthContext';
import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Chip,
  Grid,
  Alert,
  Paper,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
} from '@mui/icons-material';

const STATUS_COLORS = {
  'Out of Stock': 'error',
  'Near Out of Stock': 'warning',
  'Ordered': 'info',
  'Restocked': 'success',
};

function UpdateCard({ u }) {
  return (
    <Card elevation={2} sx={{ height: '100%' }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          {u.image_url ? (
            <CardMedia
              component="a"
              href={u.image_url}
              target="_blank"
              rel="noreferrer"
              sx={{
                width: 120,
                height: 120,
                borderRadius: 1,
                flexShrink: 0,
                cursor: 'pointer',
                '&:hover': { opacity: 0.8 },
              }}
            >
              <img
                src={u.image_url}
                alt="Product"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  borderRadius: 4,
                }}
              />
            </CardMedia>
          ) : (
            <Avatar
              sx={{
                width: 120,
                height: 120,
                bgcolor: 'primary.light',
              }}
            >
              <InventoryIcon sx={{ fontSize: 60 }} />
            </Avatar>
          )}

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h6" gutterBottom noWrap>
              {u.product?.name || u.product?.code}
            </Typography>

            <Chip
              label={u.status}
              color={STATUS_COLORS[u.status] || 'default'}
              size="small"
              sx={{ mb: 1 }}
            />

            {u.notes && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {u.notes}
              </Typography>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2 }}>
              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {u.user?.email || `User #${u.user_id}`}
              </Typography>
            </Box>

            <Typography variant="caption" color="text.secondary" display="block">
              {new Date(u.created_at).toLocaleString()}
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
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
    return () => {
      mounted = false;
    };
  }, [token]);

  const socket = useMemo(() => {
    const newSocket = io('/', { transports: ['websocket'] });
    return newSocket;
  }, []);
  
  useEffect(() => {
    socket.on('connect', () => {
      console.log('Socket connected');
    });
    socket.on('update_created', (payload) => {
      setUpdates((prev) => [payload, ...prev]);
    });
    return () => {
      socket.off('connect');
      socket.off('update_created');
      socket.disconnect();
    };
  }, [socket]);

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <DashboardIcon fontSize="large" color="primary" />
        <Typography variant="h4">Live Dashboard</Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {String(error)}
        </Alert>
      )}

      {updates.length === 0 && !error && (
        <Paper elevation={1} sx={{ p: 4, textAlign: 'center' }}>
          <InventoryIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No updates yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start scanning products to see them here!
          </Typography>
        </Paper>
      )}

      <Grid container spacing={3}>
        {updates.map((u) => (
          <Grid item xs={12} sm={6} md={4} key={u.id}>
            <UpdateCard u={u} />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
