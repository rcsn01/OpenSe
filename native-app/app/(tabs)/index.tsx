import { Image } from 'expo-image';
import { StyleSheet, View, Button, Linking, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { ThemedText } from '@/components/themed-text';
import { CameraView, useCameraPermissions } from 'expo-camera';

export default function HomeScreen() {
  const cameraRef = useRef<any | null>(null);
  const [cameraType, setCameraType] = useState<any>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [CameraComp, setCameraComp] = useState<any | null>(null);
  const [scannedData, setScannedData] = useState<string | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

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

  const takePhoto = async () => {
    try {
      const cam = cameraRef.current;
      if (!cam || typeof cam.takePictureAsync !== 'function') return;
      if (!cameraReady) return; // follow docs: wait for onCameraReady
      const photo = await cam.takePictureAsync({ quality: 0.7 });
      setPhotoUri(photo.uri ?? null);
    } catch (e) {
      console.warn('takePhoto error', e);
    }
  };

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    setScannedData(data);
    console.log('Scanned QR code:', type, data);
  };

  return (
    <>
      <View style={styles.cameraContainer}>
        {permission == null && <ThemedText>Requesting camera permission...</ThemedText>}
        {!(permission?.granted ?? permission?.status === 'granted') && permission != null && (
          <View style={styles.permissionDeniedContainer}>
            <ThemedText type="subtitle">Camera permission denied</ThemedText>
            <ThemedText>
              Please enable the Camera permission for this app in iOS Settings or re-request
              permission below.
            </ThemedText>
            <View style={styles.permissionButtons}>
              <View style={styles.buttonWrapper}>
                <Button title="Open Settings" onPress={handleOpenSettings} />
              </View>
              <View style={styles.buttonWrapper}>
                <Button title="Request Permission" onPress={requestPermission} />
              </View>
            </View>
          </View>
        )}
        {permission && (permission?.granted ?? permission?.status === 'granted') ? (
          <>
            {(() => {
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
            })()}

            <View style={styles.controlsContainer} pointerEvents="box-none">
              <TouchableOpacity style={styles.toggleButton} onPress={toggleCameraType}>
                <ThemedText type="defaultSemiBold">Flip</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <ThemedText type="defaultSemiBold">Capture</ThemedText>
              </TouchableOpacity>
            </View>
            {scannedData && (
              <View style={styles.scannedDataContainer}>
                <ThemedText type="defaultSemiBold" style={styles.scannedLabel}>QR Code:</ThemedText>
                <ThemedText style={styles.scannedText}>{scannedData}</ThemedText>
              </View>
            )}
            {photoUri ? (
              <View style={styles.thumbnail}>
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
              </View>
            ) : null}
          </>
        ) : null}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  cameraContainer: {
    flex: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  camera: {
    width: '100%',
    height: '100%',
  },
  permissionDeniedContainer: {
    padding: 12,
    alignItems: 'center',
    gap: 8,
  },
  permissionButtons: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  buttonWrapper: {
    flex: 1,
    marginHorizontal: 4,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    pointerEvents: 'box-none',
  },
  toggleButton: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 10,
    borderRadius: 8,
  },
  captureButton: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 24,
  },
  thumbnail: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
  },
  scannedDataContainer: {
    position: 'absolute',
    bottom: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  scannedLabel: {
    color: '#fff',
    marginBottom: 4,
  },
  scannedText: {
    color: '#fff',
    fontSize: 12,
  },
});
