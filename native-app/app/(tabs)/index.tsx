import { StyleSheet, View, Button, Linking, TouchableOpacity, TextInput, ScrollView, Alert, StatusBar, Platform, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect, useRef, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { API_BASE_URL } from '@/config/api';

// HomeScreen: Scanner + report submission screen
// - Top half: camera preview and QR scanning (uses expo-camera)
// - Bottom half: simple form to submit stock reports tied to the scanned product
export default function HomeScreen() {
  const { token } = useAuth();
  const cameraRef = useRef<any | null>(null);
  // Camera refs and UI state
  const [cameraType, setCameraType] = useState<any>('back'); // 'back' or 'front'
  const [cameraReady, setCameraReady] = useState(false); // whether camera has initialized
  const [CameraComp, setCameraComp] = useState<any | null>(null); // dynamic camera component

  // Scanning flow state
  const [scannedData, setScannedData] = useState<string | null>(null); // raw QR payload
  const [isScanning, setIsScanning] = useState(false); // true when actively scanning

  // Product lookup / display state
  const [productName, setProductName] = useState<string | null>(null);
  const [productDetails, setProductDetails] = useState<any | null>(null);
  const [productLoading, setProductLoading] = useState(false);

  // Throttle guard to avoid duplicate rapid scans
  const [lastScanTime, setLastScanTime] = useState<number>(0);

  // Camera permissions helper from expo-camera
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

  // Note: This helper opens the OS settings screen so the user can manually grant camera permissions

  useEffect(() => {
    setCameraComp(() => CameraView);
  }, []);

  // Resolve CameraView component once and allow toggling camera facing if needed
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

  // General
  const scheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const themeBackground = useThemeColor({}, 'background');
  const themeText = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');
  const activeTextColor = scheme === 'dark' ? '#000' : '#fff';

  // Backgrounds
  // form and scan-under use the theme background
  const formBackground = useThemeColor({ light: Colors.light.background, dark: Colors.dark.background }, 'background');
  const scanUnderBackground = useThemeColor({ light: Colors.light.background, dark: Colors.dark.background }, 'background');
  const scannedInfoBackground = useThemeColor({ light: Colors.light.tint, dark: Colors.dark.background }, 'background');
  const cameraPlaceholderBackground = useThemeColor({ light: Colors.dark.background, dark: Colors.dark.background }, 'background');
  const optionBg = useThemeColor({ light: Colors.light.mutedBackground, dark: Colors.dark.mutedBackground }, 'background');
  const inactiveBg = useThemeColor({ light: Colors.light.mutedBackground, dark: Colors.dark.mutedBackground }, 'background');

  // Buttons
  const buttonBackgroundDefault = useThemeColor({ light: Colors.light.buttonBackgroundDefault, dark: Colors.dark.buttonBackgroundDefault }, 'background');
  const buttonBackgroundSelected = useThemeColor({ light: Colors.light.buttonBackgroundSelected, dark: Colors.dark.buttonBackgroundSelected }, 'background');
  const buttonTextDefault = useThemeColor({ light: Colors.light.buttonTextDefault, dark: Colors.dark.buttonTextDefault }, 'text');
  const buttonTextSelected = useThemeColor({ light: Colors.light.buttonTextSelected, dark: Colors.dark.buttonTextSelected }, 'text');

  // Inputs & Text variants
  const inputBackground = useThemeColor({ light: Colors.light.background, dark: Colors.dark.background }, 'background');
  const placeholderTextColor = useThemeColor({ light: '#999', dark: '#9ca3af' }, 'text');
  const secondaryText = useThemeColor({ light: Colors.light.mutedText, dark: Colors.dark.mutedText }, 'text');

  // Borders / misc
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');

  // Product Card
  const productCardBackground = useThemeColor({ light: Colors.light.productCardBackground, dark: Colors.dark.productCardBackground }, 'background');
  const productBorderColor = useThemeColor({ light: Colors.light.productCardBorder, dark: Colors.dark.productCardBorder }, 'background');
  const productOptionBg = useThemeColor({ light: Colors.light.productThumbBackground, dark: Colors.dark.productThumbBackground }, 'background');
  const productMutedText = useThemeColor({ light: Colors.light.productMutedText, dark: Colors.dark.productMutedText }, 'text');
  const productTextColor = useThemeColor({}, 'text');

  // When a QR is scanned we set `scannedData` and stop active scanning; another effect
  // (below) will react to `scannedData` and fetch the product details from the backend.
  // Explanation: this effect watches `scannedData`. When a QR is present we call
  // GET /products/:id to resolve the human-readable product name to show in the UI.
  // `mounted` guard prevents state updates after unmount.
  useEffect(() => {
    let mounted = true;
    const fetchProduct = async () => {
      if (!scannedData) return;
      setProductLoading(true);
      setProductName(null);
      setProductDetails(null);
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
        if (mounted) {
          setProductName(data.name ?? 'Unknown Product');
          setProductDetails(data || null);
        }
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

  // handleSubmit: gather the scanned QR code plus status/notes and POST a stock report.
  // The backend expects a multipart form in this flow (FormData). No image is included here.

  return (
    <View style={[styles.container, { backgroundColor: themeBackground }]}>
      <View style={[styles.header, { borderBottomColor: borderColor, paddingTop: Platform.OS === 'ios' ? (insets.top + 12) : 12 }]}> 
        <ThemedText type="title" style={[styles.title, { color: themeText }]}>Scan</ThemedText>
      </View>
      {/* Top Half - Camera */}
      {isScanning ? (
        <View style={[
          styles.cameraSection,
          // Add safe-area padding on iOS so camera content doesn't underlap the Dynamic Island
          Platform.OS === 'android'
            ? { paddingTop: StatusBar.currentHeight || 0 }
            : { paddingTop: insets.top || 12 }
        ]}>
        {permission == null && (
          <View style={[styles.cameraPlaceholder, { backgroundColor: cameraPlaceholderBackground }]}>
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
                <TouchableOpacity style={[styles.permissionButton, styles.buttonShadow, { backgroundColor: buttonBackgroundSelected }]} onPress={handleOpenSettings}>
                <ThemedText style={[styles.permissionButtonText, { color: buttonTextSelected }]}>Open Settings</ThemedText>
              </TouchableOpacity>
                <TouchableOpacity style={[styles.permissionButton, styles.buttonShadow, { backgroundColor: buttonBackgroundSelected }]} onPress={requestPermission}>
                <ThemedText style={[styles.permissionButtonText, { color: buttonTextSelected }]}>Request Permission</ThemedText>
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
                <>
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

                  {/* Close button overlay (bottom-right) while scanning */}
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsScanning(false)}
                    accessibilityLabel="Close scanning"
                  >
                    <ThemedText style={styles.closeButtonText}>Close</ThemedText>
                  </TouchableOpacity>
                </>
              );
            })() : (
              <View style={styles.cameraPlaceholder}>
                        {scannedData ? (
                                    // Show product info inside the camera area. Add top margin on iOS to avoid
                                    // being covered by the Dynamic Island / notch.
                                    <View style={[
                                      styles.productInfoContainer,
                                      Platform.OS === 'ios' ? { marginTop: insets.top + 4 } : {},
                                      { backgroundColor: productCardBackground, borderColor: productBorderColor, borderWidth: 1, padding: 12, borderRadius: 12 }
                                    ]}>
                                      <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
                                          <View style={{ flex: 1, paddingRight: 8 }}>
                                            <ThemedText style={[styles.productNameText, { color: productTextColor }]}> 
                                              {productLoading ? 'Loading…' : (productDetails?.name ?? productName ?? 'Unknown Product')}
                                            </ThemedText>

                                            {productDetails?.description ? (
                                              <ThemedText style={[styles.placeholderSubtext, { marginTop: 8, color: productMutedText }]}>{productDetails.description}</ThemedText>
                                            ) : null}

                                            {productDetails?.latestStatus ? (
                                              <View style={[styles.statusBadgeSmall, productDetails.latestStatus === 'empty' && styles.statusEmptySmall, productDetails.latestStatus === 'low' && styles.statusLowSmall, productDetails.latestStatus === 'in-stock' && styles.statusInStockSmall]}>
                                                <ThemedText style={[styles.statusTextSmall, { color: productMutedText }]}>{productDetails.latestStatus === 'empty' ? 'Empty' : productDetails.latestStatus === 'low' ? 'Low' : 'In Stock'}</ThemedText>
                                              </View>
                                            ) : null}

                                            <ThemedText style={[styles.placeholderSubtext, { marginTop: 8, color: productMutedText }]}>{scannedData}</ThemedText>
                                          </View>

                                          {/* Meta column: category / qty / location */}
                                          <View style={styles.productMetaColumn}>
                                            {productDetails?.category ? (
                                              <ThemedText style={[styles.placeholderSubtext, { color: productMutedText }]}>Category: {productDetails.category}</ThemedText>
                                            ) : null}

                                            {productDetails?.quantity != null ? (
                                              <ThemedText style={[styles.placeholderSubtext, { color: productMutedText, marginTop: 6 }]}>Qty: {productDetails.quantity}</ThemedText>
                                            ) : null}

                                            {productDetails?.location ? (
                                              <ThemedText style={[styles.placeholderSubtext, { color: productMutedText, marginTop: 6 }]}>{productDetails.location}</ThemedText>
                                            ) : null}
                                          </View>
                                        </View>

                                        {productDetails?.image_url ? (
                                          <Image source={{ uri: `${API_BASE_URL}${productDetails.image_url}` }} style={[styles.productDetailImage, { backgroundColor: productOptionBg, marginLeft: 12 }]} />
                                        ) : null}
                                      </View>
                                    </View>
                          ) : (
                  <>
                    <ThemedText style={styles.placeholderText}>📷</ThemedText>
                    <ThemedText style={styles.placeholderSubtext}>
                      {'Ready to scan'}
                    </ThemedText>

                    {/* Scan button moved below the camera section */}
                  </>
                )}
              </View>
            )}

            {/* Scanning indicator removed to hide the "Scanning..." text while active */}
          </>
        ) : null}
        </View>
      ) : null}

      {/* Scan button under the camera area when idle and permission granted */}
      {permission && (permission?.granted ?? permission?.status === 'granted') && (
        // Place the scan button at the same location as the Products add button
        <View style={[styles.scanButtonBottom, { backgroundColor: scanUnderBackground }]}> 
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.buttonShadow,
              { backgroundColor: buttonBackgroundSelected, paddingVertical: 16, borderRadius: 12, width: '100%' },
              isScanning && styles.buttonDisabled,
            ]}
            onPress={startScanning}
            disabled={isScanning}
            accessibilityState={{ disabled: isScanning }}
          >
            <ThemedText type="defaultSemiBold" style={[styles.primaryButtonText, { color: buttonTextSelected }]}> 
              {isScanning ? 'Scanning...' : (scannedData ? 'Rescan' : 'Scan QR Code')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      )}

      {/* Bottom Half - Form */}
  <ScrollView style={[styles.formSection, { backgroundColor: formBackground }]} contentContainerStyle={styles.formContent}>
        {/* If a product was scanned, show its name and QR here (camera section is hidden after scan) */}
        {scannedData && (
          <View style={[
              styles.scannedInfo,
              { backgroundColor: productDetails ? productCardBackground : scannedInfoBackground, paddingTop: 12, marginTop: Platform.OS === 'ios' ? (insets.top + 4) : 0, borderColor: productDetails ? productBorderColor : borderColor, borderWidth: productDetails ? 1 : 0, borderRadius: productDetails ? 12 : undefined }
            ]}> 
              {productLoading ? (
                <ThemedText style={styles.qrCodeText}>Loading…</ThemedText>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <ThemedText style={[styles.qrCodeText, { fontWeight: '700', color: productTextColor }]}>{productDetails?.name ?? productName ?? scannedData}</ThemedText>

                      {productDetails?.description ? (
                        <ThemedText style={[styles.placeholderSubtext, { marginTop: 6, color: productMutedText }]}>Description: {productDetails.description}</ThemedText>
                      ) : null}

                      {productDetails?.category ? (
                        <ThemedText style={[styles.placeholderSubtext, { color: productMutedText }]}>Category: {productDetails.category}</ThemedText>
                      ) : null}

                      {productDetails?.quantity != null ? (
                        <ThemedText style={[styles.placeholderSubtext, { color: productMutedText}]}>Quantity: {productDetails.quantity}</ThemedText>
                      ) : null}

                      {productDetails?.location ? (
                        <ThemedText style={[styles.placeholderSubtext, { color: productMutedText}]}>Location: {productDetails.location}</ThemedText>
                      ) : null}

                      {productDetails?.latestStatus ? (
                        <View style={[styles.statusBadgeSmall, productDetails.latestStatus === 'empty' && styles.statusEmptySmall, productDetails.latestStatus === 'low' && styles.statusLowSmall, productDetails.latestStatus === 'in-stock' && styles.statusInStockSmall]}>
                          <ThemedText style={[styles.statusTextSmall, { color: productMutedText }]}>{productDetails.latestStatus === 'empty' ? 'Empty' : productDetails.latestStatus === 'low' ? 'Low' : 'In Stock'}</ThemedText>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  {productDetails?.image_url ? (
                    <Image source={{ uri: `${API_BASE_URL}${productDetails.image_url}` }} style={[styles.productDetailImage, { backgroundColor: productOptionBg, marginLeft: 5 }]} />
                  ) : null}
                </View>
              )}
            </View>
        )}

        <View style={styles.formGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Stock Status</ThemedText>
          <View style={styles.statusButtons}>
            <TouchableOpacity
              style={[styles.statusButton, styles.buttonShadow, { backgroundColor: status === 'empty' ? buttonBackgroundSelected : buttonBackgroundDefault }]}
              onPress={() => setStatus('empty')}
            >
              <ThemedText style={[styles.statusButtonText, { color: status === 'empty' ? buttonTextSelected : buttonTextDefault }]}> 
                Empty
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, styles.buttonShadow, { backgroundColor: status === 'low' ? buttonBackgroundSelected : buttonBackgroundDefault }]}
              onPress={() => setStatus('low')}
            >
              <ThemedText style={[styles.statusButtonText, { color: status === 'low' ? buttonTextSelected : buttonTextDefault }]}> 
                Low Stock
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.statusButton, styles.buttonShadow, { backgroundColor: status === 'in-stock' ? buttonBackgroundSelected : buttonBackgroundDefault }]}
              onPress={() => setStatus('in-stock')}
            >
              <ThemedText style={[styles.statusButtonText, { color: status === 'in-stock' ? buttonTextSelected : buttonTextDefault }]}> 
                In Stock
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.formGroup}>
          <ThemedText type="defaultSemiBold" style={styles.label}>Notes</ThemedText>
          <TextInput
            style={[styles.notesInput, { backgroundColor: inputBackground, color: themeText }]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add notes about the stock condition..."
            placeholderTextColor={placeholderTextColor}
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Image upload removed per request */}

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              styles.buttonShadow,
              { backgroundColor: scannedData ? buttonBackgroundSelected : buttonBackgroundDefault },
              (isSubmitting || !scannedData) && styles.buttonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={!scannedData || isSubmitting}
          >
            <ThemedText
              type="defaultSemiBold"
              style={[styles.primaryButtonText, { color: scannedData ? buttonTextSelected : buttonTextDefault }]}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Report'}
            </ThemedText>
          </TouchableOpacity>
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
    fontSize: 20,
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
  buttonShadow: {
    // cross-platform shadow: iOS (shadow*), Android (elevation)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  previewScanButton: {
    marginTop: 12,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  productNameText: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 8,
  },
  productInfoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    gap: 8,
  },
  closeButton: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: '600',
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
  scanUnderContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#f9fafb',
    // Add extra top margin on iOS to avoid the Dynamic Island / notch overlap
    marginTop: Platform.OS === 'ios' ? 28 : 12,
  },
  scanButtonBottom: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 20,
    alignItems: 'center',
    zIndex: 20,
    backgroundColor: 'transparent',
  },
  productDetailImage: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginBottom: 8,
  },
  productMetaColumn: {
    width: 128,
    paddingLeft: 8,
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  statusBadgeSmall: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusEmptySmall: {
    backgroundColor: '#fee2e2',
  },
  statusLowSmall: {
    backgroundColor: '#fef3c7',
  },
  statusInStockSmall: {
    backgroundColor: '#d1fae5',
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
});
