import React, { useState, useEffect } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { API } from '../api';
import { useAuth } from '../AuthContext';
import {
  Box,
  Paper,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  Alert,
  Card,
  CardContent,
  IconButton,
  Chip,
} from '@mui/material';
import {
  QrCodeScanner as ScanIcon,
  Close as CloseIcon,
  PhotoCamera as CameraIcon,
} from '@mui/icons-material';

const STATUSES = [
  'Out of Stock',
  'Near Out of Stock',
  'Ordered',
  'Restocked',
];

const STATUS_COLORS = {
  'Out of Stock': 'error',
  'Near Out of Stock': 'warning',
  'Ordered': 'info',
  'Restocked': 'success',
};

export default function ScanPage() {
  const { token } = useAuth();
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [status, setStatus] = useState(STATUSES[0]);
  const [notes, setNotes] = useState('');
  const [image, setImage] = useState(null);
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState(null);

  useEffect(() => {
    if (scanning) {
      const html5QrcodeScanner = new Html5QrcodeScanner(
        'qr-reader',
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        false
      );

      html5QrcodeScanner.render(
        (decodedText) => {
          setProductCode(decodedText);
          html5QrcodeScanner.clear().catch(() => {});
          setScanning(false);
        },
        (error) => {
          // Ignore errors during scanning
        }
      );

      setScanner(html5QrcodeScanner);

      return () => {
        html5QrcodeScanner.clear().catch(() => {});
      };
    } else if (scanner) {
      // Clean up scanner when scanning is turned off
      scanner.clear().catch(() => {});
      setScanner(null);
    }
  }, [scanning]);

  const onSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setError(null);
    try {
      const res = await API.createUpdate(token, {
        product_code: productCode,
        product_name: productName,
        status,
        notes,
        image,
      });
      setMsg(`Saved update #${res.id} for ${res.product?.code}`);
      setProductCode('');
      setProductName('');
      setNotes('');
      setImage(null);
      setStatus(STATUSES[0]);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleStartScan = () => {
    setScanning(true);
    setError(null);
  };

  const handleStopScan = () => {
    setScanning(false);
    if (scanner) {
      scanner.clear().catch(() => {});
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <ScanIcon fontSize="large" />
        Scan & Report Status
      </Typography>

      {scanning ? (
        <Paper elevation={3} sx={{ p: 3, mb: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Scanning QR Code...</Typography>
            <IconButton onClick={handleStopScan} color="error">
              <CloseIcon />
            </IconButton>
          </Box>
          <Box id="qr-reader" sx={{ maxWidth: 500, mx: 'auto' }}></Box>
        </Paper>
      ) : (
        <Button
          variant="contained"
          size="large"
          startIcon={<ScanIcon />}
          onClick={handleStartScan}
          sx={{ mb: 3 }}
        >
          Start QR Scanner
        </Button>
      )}

      <Paper elevation={3} sx={{ p: 3 }}>
        <form onSubmit={onSubmit}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <TextField
              label="Product Code (QR)"
              value={productCode}
              onChange={(e) => setProductCode(e.target.value)}
              required
              fullWidth
              variant="outlined"
              helperText="Scan a QR code or enter manually"
            />

            <TextField
              label="Product Name"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              fullWidth
              variant="outlined"
              helperText="Optional - helps identify the product"
            />

            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    <Chip 
                      label={s} 
                      color={STATUS_COLORS[s]} 
                      size="small" 
                      sx={{ mr: 1 }}
                    />
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={3}
              fullWidth
              variant="outlined"
              helperText="Additional information about this update"
            />

            <Box>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CameraIcon />}
              >
                Upload Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files?.[0] || null)}
                />
              </Button>
              {image && (
                <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>
                  Selected: {image.name}
                </Typography>
              )}
            </Box>

            <Button
              type="submit"
              variant="contained"
              size="large"
              color="primary"
            >
              Submit Update
            </Button>

            {msg && (
              <Alert severity="success" onClose={() => setMsg(null)}>
                {msg}
              </Alert>
            )}
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {String(error)}
              </Alert>
            )}
          </Box>
        </form>
      </Paper>
    </Box>
  );
}
