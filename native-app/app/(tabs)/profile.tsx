import { StyleSheet, View, TouchableOpacity, Alert, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { AccountInfo } from '@/components/profile/account-info';
import { SettingsSection } from '@/components/profile/settings-section';

export default function TabFourScreen() {
  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [pref, setPref] = useState<'light'|'dark'|'system'>('system');

  // theme-aware colors for this screen
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: Colors.light.mutedText, dark: Colors.dark.mutedText }, 'text');
  
  // button theme tokens
  const buttonBackgroundSelected = useThemeColor({ light: Colors.light.buttonBackgroundSelected, dark: Colors.dark.buttonBackgroundSelected }, 'background');
  const buttonTextSelected = useThemeColor({ light: Colors.light.buttonTextSelected, dark: Colors.dark.buttonTextSelected }, 'text');

  useEffect(() => {
    (async () => {
      try {
        const v = await AsyncStorage.getItem('themePreference');
        if (v === 'light' || v === 'dark' || v === 'system') setPref(v as 'light'|'dark'|'system');
      } catch (e) {
        // ignore
      }
    })();
  }, []);

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (confirm('Are you sure you want to logout?')) {
        logout();
      }
    } else {
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
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* single header container (removed nested header to avoid double background/card) */}
      <View style={[styles.header, { backgroundColor: cardBackground, borderBottomColor: borderColor, paddingTop: Platform.OS === 'ios' ? (insets.top + 12) : 20 }]}> 
        <ThemedText type="title" style={styles.title}>Profile</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedText }]}>Account & Settings</ThemedText>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={[styles.profileCard, { backgroundColor: cardBackground, borderColor }]}> 
          <View style={styles.avatarContainer}>
            <ThemedText style={styles.avatarText}>
              {user?.username?.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <ThemedText type="subtitle" style={styles.welcomeText}>
            {user?.username}
          </ThemedText>
          <ThemedText style={[styles.emailText, { color: mutedText }]}>{user?.email}</ThemedText>
        </View>

        <AccountInfo user={user} />

        <SettingsSection 
          pref={pref} 
          setPref={setPref} 
        />

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: buttonBackgroundSelected }]} onPress={handleLogout}>
          <ThemedText type="defaultSemiBold" style={[styles.logoutButtonText, { color: buttonTextSelected }]}> 
            Logout
          </ThemedText>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#667eea',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
  },
  welcomeText: {
    marginBottom: 4,
    fontSize: 20,
  },
  emailText: {
    opacity: 0.6,
    fontSize: 14,
  },
  logoutButton: {
    backgroundColor: '#ef4444',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
  },
});
