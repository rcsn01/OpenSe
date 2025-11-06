import { Image } from 'expo-image';
import { Platform, StyleSheet, View, Button, Linking, Alert, TouchableOpacity } from 'react-native';
import { useEffect, useRef, useState } from 'react';

import { HelloWave } from '@/components/hello-wave';
import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Link } from 'expo-router';
import * as ExpoCamera from 'expo-camera';

export default function HomeScreen() {
  const cameraRef = useRef<any | null>(null);
  // Use simple string values for camera type to avoid relying on runtime
  // exports from the native module during initialization.
  const [cameraType, setCameraType] = useState<any>('back');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [CameraComp, setCameraComp] = useState<any | null>(null);
  // Use the official hook from expo-camera. This matches the docs example:
  // const [permission, requestPermission] = useCameraPermissions();
  const [permission, requestPermission] = (ExpoCamera as any).useCameraPermissions();

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (e) {
      // best-effort; ignore errors
    }
  };

  // Try to resolve a callable Camera component from the package. Some
  // bundler / package configurations expose only the native module object
  // (methods) at the top-level import; in that case we attempt a few
  // candidate import paths to find the actual React component.
  useEffect(() => {
    let mounted = true;

    (async () => {
      const candidates = [
        // preferred: named export from package
        'expo-camera',
        // try direct paths inside package (may differ by package version)
        'expo-camera/build/Camera',
        'expo-camera/Camera',
        'expo-camera/build/CameraView',
        'expo-camera/CameraView',
      ];

      for (const path of candidates) {
        try {
          // dynamic import to avoid bundling issues
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          const mod = await import(path);
          const candidate = mod.Camera ?? mod.CameraView ?? mod.default ?? mod;
          const isCallable = typeof candidate === 'function' || (candidate && (candidate.prototype || candidate.render));
          if (isCallable) {
            if (!mounted) return;
            setCameraComp(candidate);
            console.log(`Loaded Camera component from ${path}`);
            break;
          }
        } catch (e) {
          // ignore and continue to next candidate
        }
      }
    })();

    return () => {
      mounted = false;
    };
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
              // Prefer any dynamically-imported component we found earlier.
              const Candidate = CameraComp ??
                (ExpoCamera as any).Camera ??
                (ExpoCamera as any).CameraView ??
                (ExpoCamera as any).default ??
                (ExpoCamera as any);

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
                  type={cameraType as any}
                  onCameraReady={() => setCameraReady(true)}
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
            {photoUri ? (
              <View style={styles.thumbnail}>
                <Image source={{ uri: photoUri }} style={{ width: '100%', height: '100%' }} />
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <ParallaxScrollView
      headerBackgroundColor={{ light: '#A1CEDC', dark: '#1D3D47' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Welcome!</ThemedText>
        <HelloWave />
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 1: Try it</ThemedText>
        <ThemedText>
          Edit <ThemedText type="defaultSemiBold">app/(tabs)/index.tsx</ThemedText> to see changes.
          Press{' '}
          <ThemedText type="defaultSemiBold">
            {Platform.select({
              ios: 'cmd + d',
              android: 'cmd + m',
              web: 'F12',
            })}
          </ThemedText>{' '}
          to open developer tools.
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <Link href="/modal">
          <Link.Trigger>
            <ThemedText type="subtitle">Step 2: Explore</ThemedText>
          </Link.Trigger>
          <Link.Preview />
          <Link.Menu>
            <Link.MenuAction title="Action" icon="cube" onPress={() => alert('Action pressed')} />
            <Link.MenuAction
              title="Share"
              icon="square.and.arrow.up"
              onPress={() => alert('Share pressed')}
            />
            <Link.Menu title="More" icon="ellipsis">
              <Link.MenuAction
                title="Delete"
                icon="trash"
                destructive
                onPress={() => alert('Delete pressed')}
              />
            </Link.Menu>
          </Link.Menu>
        </Link>

        <ThemedText>
          {`Tap the Explore tab to learn more about what's included in this starter app.`}
        </ThemedText>
      </ThemedView>
      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">Step 3: Get a fresh start</ThemedText>
        <ThemedText>
          {`When you're ready, run `}
          <ThemedText type="defaultSemiBold">npm run reset-project</ThemedText> to get a fresh{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> directory. This will move the current{' '}
          <ThemedText type="defaultSemiBold">app</ThemedText> to{' '}
          <ThemedText type="defaultSemiBold">app-example</ThemedText>.
        </ThemedText>
      </ThemedView>
    </ParallaxScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
  cameraContainer: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
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
});
