import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ui/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface UserStat {
  id: number;
  username: string;
  report_count: string;
}

interface Props {
  teamStats: UserStat[];
}

export function TeamActivity({ teamStats }: Props) {
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Team Activity</ThemedText>
      {teamStats.length === 0 ? (
        <ThemedText style={{ color: mutedText }}>No team data.</ThemedText>
      ) : (
        teamStats.map((user) => (
          <View key={user.id} style={[styles.card, { backgroundColor: cardBackground, borderColor, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={[styles.avatarPlaceholder, { backgroundColor: tint }]}>
                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>{user.username.charAt(0).toUpperCase()}</ThemedText>
              </View>
              <ThemedText type="defaultSemiBold">{user.username}</ThemedText>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <ThemedText type="defaultSemiBold" style={{ fontSize: 18 }}>{user.report_count}</ThemedText>
              <ThemedText style={{ fontSize: 10, color: mutedText }}>REPORTS</ThemedText>
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 20,
    fontWeight: '700',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
