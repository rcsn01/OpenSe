import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';

import ParallaxScrollView from '@/components/parallax-scroll-view';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { useAuth } from '@/contexts/AuthContext';

export default function TabFourScreen() {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#D0D0D0', dark: '#353636' }}
      headerImage={
        <IconSymbol
          size={310}
          color="#808080"
          name="chevron.left.forwardslash.chevron.right"
          style={styles.headerImage}
        />
      }>
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Profile</ThemedText>
      </ThemedView>

      <ThemedView style={styles.profileCard}>
        <ThemedText type="subtitle" style={styles.welcomeText}>
          Welcome, {user?.username}!
        </ThemedText>
        <ThemedText style={styles.emailText}>{user?.email}</ThemedText>
      </ThemedView>

      <ThemedView style={styles.section}>
        <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
          Account Information
        </ThemedText>
        <ThemedView style={styles.infoItem}>
          <ThemedText style={styles.infoLabel}>User ID:</ThemedText>
          <ThemedText style={styles.infoValue}>{user?.id}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.infoItem}>
          <ThemedText style={styles.infoLabel}>Username:</ThemedText>
          <ThemedText style={styles.infoValue}>{user?.username}</ThemedText>
        </ThemedView>
        <ThemedView style={styles.infoItem}>
          <ThemedText style={styles.infoLabel}>Email:</ThemedText>
          <ThemedText style={styles.infoValue}>{user?.email}</ThemedText>
        </ThemedView>
      </ThemedView>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <ThemedText type="defaultSemiBold" style={styles.logoutButtonText}>
          Logout
        </ThemedText>
      </TouchableOpacity>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  headerImage: {
    color: '#808080',
    bottom: -90,
    left: -35,
    position: 'absolute',
  },
  titleContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  profileCard: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: '#f0f0f0',
    marginBottom: 20,
  },
  welcomeText: {
    marginBottom: 8,
  },
  emailText: {
    opacity: 0.7,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  infoLabel: {
    opacity: 0.7,
  },
  infoValue: {
    fontWeight: '600',
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
