import { StyleSheet, View, TouchableOpacity, Alert, ScrollView } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setPreferredColorScheme, useColorScheme } from '@/hooks/use-color-scheme';
import { useThemeColor } from '@/hooks/use-theme-color';

export default function TabFourScreen() {
  const { user, logout } = useAuth();
  const [pref, setPref] = useState<'light'|'dark'|'system'>('system');

  // theme-aware colors for this screen
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const optionBg = useThemeColor({ light: '#f3f4f6', dark: '#111827' }, 'background');

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
    <View style={[styles.container, { backgroundColor: background }]}>
      {/* single header container (removed nested header to avoid double background/card) */}
      <View style={[styles.header, { backgroundColor: cardBackground, borderBottomColor: borderColor }]}> 
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

        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Account Information
          </ThemedText>
          <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}> 
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>User ID</ThemedText>
              <ThemedText style={styles.infoValue}>{user?.id}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Username</ThemedText>
              <ThemedText style={styles.infoValue}>{user?.username}</ThemedText>
            </View>
            <View style={styles.infoItem}>
              <ThemedText style={styles.infoLabel}>Email</ThemedText>
              <ThemedText style={styles.infoValue}>{user?.email}</ThemedText>
            </View>
          </View>
        </View>

        {/* Settings section - lets user pick light/dark theme */}
        <View style={styles.section}>
          <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
            Settings
          </ThemedText>

          <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}> 
            <View style={[styles.infoItem, { borderBottomColor: useThemeColor({ light: '#f3f4f6', dark: '#111827' }, 'background') }]}>
              <ThemedText style={styles.infoLabel}>Theme</ThemedText>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  style={[styles.themeOption, styles.themeOptionLeft, { backgroundColor: pref === 'light' ? tint : optionBg }]}
                  onPress={async () => { await setPreferredColorScheme('light'); setPref('light'); }}
                >
                  <ThemedText style={[styles.themeOptionText, pref === 'light' ? { color: '#fff' } : { color: mutedText } ]}>{'Light'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, styles.themeOptionRight, { backgroundColor: pref === 'dark' ? tint : optionBg }]}
                  onPress={async () => { await setPreferredColorScheme('dark'); setPref('dark'); }}
                >
                  <ThemedText style={[styles.themeOptionText, pref === 'dark' ? { color: '#fff' } : { color: mutedText } ]}>{'Dark'}</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.themeOption, styles.themeOptionRight, { backgroundColor: pref === 'system' ? tint : optionBg }]}
                  onPress={async () => { await setPreferredColorScheme('system'); setPref('system'); }}
                >
                  <ThemedText style={[styles.themeOptionText, pref === 'system' ? { color: '#fff' } : { color: mutedText } ]}>{'System'}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity style={[styles.logoutButton, { backgroundColor: tint }]} onPress={handleLogout}>
          <ThemedText type="defaultSemiBold" style={styles.logoutButtonText}>
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
    paddingTop: 60,
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
  },
  infoCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  infoLabel: {
    opacity: 0.6,
    fontSize: 14,
  },
  infoValue: {
    fontWeight: '600',
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
  themeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionLeft: {
    // reserved for potential left-specific styling
  },
  themeOptionRight: {
    // reserved for potential right-specific styling
  },
  themeOptionText: {
    fontSize: 14,
    color: '#111827',
  },
});
