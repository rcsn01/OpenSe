import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

interface User {
  id: number;
  username: string;
  email: string;
}

interface Props {
  user: User | null;
}

export function AccountInfo({ user }: Props) {
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const separatorColor = useThemeColor({ light: '#f3f4f6', dark: '#111827' }, 'background');

  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Account Information
      </ThemedText>
      <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}> 
        <View style={[styles.infoItem, { borderBottomColor: separatorColor }]}>
          <ThemedText style={styles.infoLabel}>User ID</ThemedText>
          <ThemedText style={styles.infoValue}>{user?.id}</ThemedText>
        </View>
        <View style={[styles.infoItem, { borderBottomColor: separatorColor }]}>
          <ThemedText style={styles.infoLabel}>Username</ThemedText>
          <ThemedText style={styles.infoValue}>{user?.username}</ThemedText>
        </View>
        <View style={[styles.infoItem, { borderBottomColor: separatorColor }]}>
          <ThemedText style={styles.infoLabel}>Email</ThemedText>
          <ThemedText style={styles.infoValue}>{user?.email}</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  infoLabel: {
    opacity: 0.6,
    fontSize: 14,
  },
  infoValue: {
    fontWeight: '600',
    fontSize: 14,
  },
});
