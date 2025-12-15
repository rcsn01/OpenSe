import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { IconSymbol } from '@/components/ui/icon-symbol';

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

  const sortedReports = [...reports]
    .sort((a, b) => {
      const priority: Record<string, number> = { 'empty': 0, 'low': 1, 'in-stock': 2 };
      const pA = priority[a.status] ?? 3;
      const pB = priority[b.status] ?? 3;
      return pA - pB;
    })
    .slice(0, 3);

  return (
    <View style={styles.section}>
      <Link href="/recent-reports-list" asChild>
        <TouchableOpacity style={styles.headerRow}>
          <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Recent Reports</ThemedText>
          <IconSymbol name="chevron.right" size={24} color={textColor} />
        </TouchableOpacity>
      </Link>
      {sortedReports.length === 0 ? (
        <ThemedText style={{ color: mutedText }}>No reports yet.</ThemedText>
      ) : (
        sortedReports.map((report) => (
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
            <View style={styles.detailsRow}>
              <ThemedText style={[styles.cardSubtext, { color: mutedText }]}>
                {report.username} • {new Date(report.created_at).toLocaleDateString()}
              </ThemedText>
              {report.notes ? (
                <ThemedText style={[styles.cardNotes, { color: mutedText }]} numberOfLines={1}>
                  "{report.notes}"
                </ThemedText>
              ) : null}
            </View>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  card: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardSubtext: {
    fontSize: 11,
  },
  cardNotes: {
    fontSize: 11,
    fontStyle: 'italic',
    opacity: 0.8,
    maxWidth: '50%',
    textAlign: 'right',
  },
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusEmpty: { backgroundColor: '#fee2e2' },
  statusLow: { backgroundColor: '#fef3c7' },
  statusInStock: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#000' },
});
