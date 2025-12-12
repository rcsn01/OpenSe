import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface StockReport {
  id: number;
  product_id: string;
  user_id: number;
  status: string;
  notes: string;
  image_url: string | null;
  created_at: string;
  product_name: string;
  username: string;
}

interface Props {
  reports: StockReport[];
}

export function RecentReports({ reports }: Props) {
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const textColor = useThemeColor({}, 'text');

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Recent Reports</ThemedText>
      {reports.length === 0 ? (
        <ThemedText style={{ color: mutedText }}>No reports yet.</ThemedText>
      ) : (
        reports.map((report) => (
          <View key={report.id} style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="defaultSemiBold">{report.product_name}</ThemedText>
              <View style={[
                styles.statusBadge,
                report.status === 'empty' ? styles.statusEmpty :
                report.status === 'low' ? styles.statusLow : styles.statusInStock
              ]}>
                <ThemedText style={styles.statusText}>{report.status.toUpperCase()}</ThemedText>
              </View>
            </View>
            <ThemedText style={[styles.cardSubtext, { color: mutedText }]}>
              By {report.username} • {new Date(report.created_at).toLocaleDateString()}
            </ThemedText>
            {report.notes ? <ThemedText style={styles.cardNotes}>"{report.notes}"</ThemedText> : null}
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cardSubtext: {
    fontSize: 12,
    marginBottom: 4,
  },
  cardNotes: {
    fontSize: 13,
    fontStyle: 'italic',
    opacity: 0.8,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusEmpty: { backgroundColor: '#fee2e2' },
  statusLow: { backgroundColor: '#fef3c7' },
  statusInStock: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#000' },
});
