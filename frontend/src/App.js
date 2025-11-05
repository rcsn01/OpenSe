import React from 'react';
import { Navigate, Route, Routes, useLocation, Link as RouterLink } from 'react-router-dom';
import { useAuth } from './AuthContext';
import LoginPage from './pages/LoginPage';
import ScanPage from './pages/ScanPage';
import DashboardPage from './pages/DashboardPage';
import {
  AppBar,
  Box,
  Toolbar,
  Typography,
  Button,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  QrCodeScanner as ScanIcon,
  Logout as LogoutIcon,
  Login as LoginIcon,
} from '@mui/icons-material';

const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

function RequireAuth({ children }) {
  const { token } = useAuth();
  const loc = useLocation();
  if (!token) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

function Nav() {
  const { token, setToken, setUser } = useAuth();
  
  const handleLogout = () => {
    setToken(null);
    setUser(null);
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
          Fill The Shelf
        </Typography>
        {token && (
          <Box sx={{ display: 'flex', gap: 2, flexGrow: 1 }}>
            <Button
              color="inherit"
              component={RouterLink}
              to="/dashboard"
              startIcon={<DashboardIcon />}
            >
              Dashboard
            </Button>
            <Button
              color="inherit"
              component={RouterLink}
              to="/scan"
              startIcon={<ScanIcon />}
            >
              Scan
            </Button>
          </Box>
        )}
        <Box sx={{ ml: 'auto' }}>
          {token ? (
            <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>
              Logout
            </Button>
          ) : (
            <Button color="inherit" component={RouterLink} to="/login" startIcon={<LoginIcon />}>
              Login
            </Button>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        <Nav />
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/scan" element={<RequireAuth><ScanPage /></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth><DashboardPage /></RequireAuth>} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
