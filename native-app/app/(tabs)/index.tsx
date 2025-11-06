import { StyleSheet, View, Button, Linking, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/config/api';

export default function HomeScreen() {
  const { token } = useAuth();
  const cameraRef = useRef<any | null>(null);
  const [cameraType, setCameraType] = useState<any>('back');
  const [cameraReady, setCameraReady] = useState(false);
  const [CameraComp, setCameraComp] = useState<any | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [productName, setProductName] = useState<string | null>(null);
  const [productLoading, setProductLoading] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [permission, requestPermission] = useCameraPermissions();
  
  // Form state
  const [status, setStatus] = useState<'empty' | 'low' | 'in-stock'>('empty');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      // best-effort; ignore errors
    }
  };

  useEffect(() => {
    setCameraComp(() => CameraView);
  }, []);

  const toggleCameraType = () => setCameraType((c: any) => (c === 'back' ? 'front' : 'back'));


  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    // Prevent scanning too frequently (throttle to once per second)
    const now = Date.now();
    if (now - lastScanTime < 1000) {
      return;
    }
    
    setLastScanTime(now);
    setScannedData(data);
    setIsScanning(false); // Stop scanning after successful scan
    console.log('Scanned QR code:', type, data);
  };

  const startScanning = () => {
    setScannedData(null);
    setStatus('empty');
    setNotes('');
    setIsScanning(true);
  };

  // When a QR code is scanned, fetch product details (requires auth token)
  useEffect(() => {
    let mounted = true;
    const fetchProduct = async () => {
      if (!scannedData) return;
      setProductLoading(true);
      setProductName(null);
      try {
        const res = await fetch(`${API_ENDPOINTS.products}/${scannedData}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Accept': 'application/json',
          },
        });

        if (!res.ok) {
          // Show fallback name
          if (mounted) setProductName('Unknown Product');
          return;
        }

        const data = await res.json();
        if (mounted) setProductName(data.name ?? 'Unknown Product');
      } catch (err) {
        if (mounted) setProductName('Unknown Product');
      } finally {
        if (mounted) setProductLoading(false);
      }
    };

    fetchProduct();
    return () => { mounted = false; };
  }, [scannedData, token]);

  const handleSubmit = async () => {
    if (!scannedData) {
      Alert.alert('Error', 'Please scan a QR code first');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.append('qrCode', scannedData);
      formData.append('status', status);
      formData.append('notes', notes);

      // No image attachment in this flow

      const response = await fetch(API_ENDPOINTS.reports, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit report');
      }

      Alert.alert('Success', 'Report submitted successfully!', [
        { text: 'OK', onPress: startScanning }
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Half - Camera */}
      <View style={styles.cameraSection}>
        {permission == null && (
          <View style={styles.cameraPlaceholder}>
            <ThemedText style={styles.placeholderText}>Requesting camera permission...</ThemedText>
          </View>
        )}
        {!(permission?.granted ?? permission?.status === 'granted') && permission != null && (
          <View style={styles.permissionDeniedContainer}>
            <ThemedText type="subtitle">Camera permission denied</ThemedText>
            <ThemedText style={styles.permissionText}>
              Please enable camera permission
            </ThemedText>
            <View style={styles.permissionButtons}>
              <TouchableOpacity style={styles.permissionButton} onPress={handleOpenSettings}>
                <ThemedText style={styles.permissionButtonText}>Open Settings</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                <ThemedText style={styles.permissionButtonText}>Request Permission</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}
        {permission && (permission?.granted ?? permission?.status === 'granted') ? (
          <>
            {isScanning ? (() => {
              // Prefer a static CameraView import or the CameraComp set earlier.
              const Candidate = CameraComp ?? CameraView ?? null;

              const isCallableComponent =
                typeof Candidate === 'function' ||
                (typeof Candidate === 'object' && Candidate !== null && ('render' in Candidate || Candidate.prototype));

              if (!isCallableComponent) {
                console.warn('Resolved Camera is not a component:', Candidate);
                return <ThemedText>Camera component unavailable on this build.</ThemedText>;
              }

              const CamComp: any = Candidate;
              return (
                <CamComp
                  ref={cameraRef}
                  style={styles.camera}
                  facing={cameraType as any}
                  onCameraReady={() => setCameraReady(true)}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
              );
            })() : (
              <View style={styles.cameraPlaceholder}>
                {scannedData ? (
                  // Show product name and Rescan button inside the camera area
                  <>
                    <ThemedText style={styles.productNameText}>
                      {productLoading ? 'Loading…' : (productName ?? 'Unknown Product')}
                    </ThemedText>
                    <View style={{ flex: 1 }} />
                    <TouchableOpacity style={[styles.primaryButton, styles.previewScanButton]} onPress={startScanning}>
                      <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>Rescan</ThemedText>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <ThemedText style={styles.placeholderText}>📷</ThemedText>
                    <ThemedText style={styles.placeholderSubtext}>
                      {'Ready to scan'}
                    </ThemedText>

                    {/* When ready (not scanning and no scannedData), offer a Scan button in the preview */}
                    {!isScanning && !scannedData && (
                      <TouchableOpacity style={[styles.primaryButton, styles.previewScanButton]} onPress={startScanning}>
                        <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>Scan QR Code</ThemedText>
                      </TouchableOpacity>
                    )}
                  </>
                )}
              </View>
            )}

            {isScanning && (
              <View style={styles.scanningIndicator}>
                <ThemedText type="defaultSemiBold" style={styles.scanningText}>
                  Scanning...
                </ThemedText>
              </View>
            )}
          </>
        ) : null}
      </View>

      {/* Bottom Half - Form */}
      <ScrollView style={styles.formSection} contentContainerStyle={styles.formContent}>
        {scannedData && (
          <View style={styles.scannedInfo}>
            <ThemedText type="defaultSemiBold">Product QR Code:</ThemedText>
            <ThemedText style={styles.qrCodeText}>{scannedData}</ThemedText>
          </View>
        )}

        <View style={styles.formGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Stock Status</ThemedText>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, status === 'empty' && styles.statusButtonActive]}
              onPress={() => setStatus('empty')}
            >
              <ThemedText style={[styles.statusButtonText, status === 'empty' && styles.statusButtonTextActive]}>
                Empty
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, status === 'low' && styles.statusButtonActive]}
              onPress={() => setStatus('low')}
            >
              <ThemedText style={[styles.statusButtonText, status === 'low' && styles.statusButtonTextActive]}>
                Low Stock
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, status === 'in-stock' && styles.statusButtonActive]}
              onPress={() => setStatus('in-stock')}
            >
              <ThemedText style={[styles.statusButtonText, status === 'in-stock' && styles.statusButtonTextActive]}>
                In Stock
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Notes</ThemedText>
          <TextInput
            style={styles.notesInput}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about the stock condition..."
            placeholderTextColor="#999"
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Image upload removed per request */}

        <View style={styles.actionButtons}>
          {scannedData ? (
            <>
              <TouchableOpacity 
                style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]} 
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                <ThemedText type="defaultSemiBold" style={styles.primaryButtonText}>
                  {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.secondaryButton} onPress={startScanning}>
                <ThemedText type="defaultSemiBold" style={styles.secondaryButtonText}>
                  Rescan
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  cameraSection: {
    height: '40%',
    backgroundColor: '#000',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
  },
  placeholderText: {
    fontSize: 64,
    marginBottom: 8,
    color: '#fff',
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.7,
  },
  permissionDeniedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#1a1a1a',
  },
  permissionText: {
    color: '#fff',
    textAlign: 'center',
    marginVertical: 12,
  },
  permissionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  permissionButton: {
    backgroundColor: '#667eea',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scanningIndicator: {
    position: 'absolute',
    top: 12,
    left: 12,
    right: 12,
    backgroundColor: 'rgba(102, 126, 234, 0.9)',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  scanningText: {
    color: '#fff',
    fontSize: 14,
  },
  formSection: {
    height: '60%',
    backgroundColor: '#f9fafb',
  },
  formContent: {
    padding: 20,
  },
  scannedInfo: {
    backgroundColor: '#e0e7ff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  qrCodeText: {
    marginTop: 4,
    fontSize: 12,
    fontFamily: 'monospace',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 8,
    fontSize: 14,
  },
  statusButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  statusButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
    alignItems: 'center',
  },
  statusButtonActive: {
    backgroundColor: '#667eea',
  },
  statusButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
  },
  statusButtonTextActive: {
    color: '#fff',
  },
  notesInput: {
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    backgroundColor: '#fff',
    color: '#000',
    textAlignVertical: 'top',
    minHeight: 100,
  },
  imageButton: {
    borderWidth: 2,
    borderColor: '#667eea',
    borderRadius: 8,
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
  },
  imageButtonText: {
    color: '#667eea',
    fontWeight: '600',
  },
  imagePreview: {
    marginTop: 12,
    borderRadius: 8,
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    height: 200,
  },
  actionButtons: {
    gap: 12,
    marginTop: 8,
  },
  primaryButton: {
    backgroundColor: '#667eea',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  previewScanButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  productNameText: {
    fontSize: 28,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontSize: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
