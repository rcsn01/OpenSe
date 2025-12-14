import { useEffect, useState } from 'react';
import { StyleSheet, View, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { StockReport } from '@/components/recent-reports';

export default function RecentReportsListScreen() {
  const { token, logout } = useAuth();
  const [reports, setReports] = useState<StockReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  const backgroundColor = useThemeColor({ light: '#f9fafb', dark: '#000' }, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const fetchReports = async () => {
    if (!token) return;
    setError('');
    try {
      const response = await fetch(API_ENDPOINTS.reports, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (response.status === 401) {
        await logout();
        return;
      }

      if (!response.ok) throw new Error('Failed to fetch reports');
      const data: StockReport[] = await response.json();
      
      // Sort by date descending
      const sorted = data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setReports(sorted);
    } catch (e) {
      setError('Failed to load reports');
      console.error(e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, [token]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchReports();
  };

  const renderItem = ({ item }: { item: StockReport }) => (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.cardHeader}>
        <ThemedText type="defaultSemiBold">{item.product_name}</ThemedText>
        <View style={[
          styles.statusBadge,
          item.status === 'empty' ? styles.statusEmpty :
          item.status === 'low' ? styles.statusLow : styles.statusInStock
        ]}>
          <ThemedText style={styles.statusText}>{item.status.toUpperCase()}</ThemedText>
        </View>
      </View>
      <View style={styles.detailsRow}>
        <ThemedText style={[styles.cardSubtext, { color: mutedText }]}>
          {item.username} • {new Date(item.created_at).toLocaleString()}
        </ThemedText>
        {item.notes ? (
          <ThemedText style={[styles.cardNotes, { color: mutedText }]} numberOfLines={2}>
            "{item.notes}"
          </ThemedText>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Stack.Screen options={{ title: 'All Reports', headerBackTitle: 'Back' }} />
      
      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={reports}
          renderItem={renderItem}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.center}>
              <ThemedText style={{ color: mutedText }}>No reports found.</ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  card: {
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailsRow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  cardSubtext: {
    fontSize: 12,
  },
  cardNotes: {
    fontSize: 12,
    fontStyle: 'italic',
    opacity: 0.9,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusEmpty: { backgroundColor: '#fee2e2' },
  statusLow: { backgroundColor: '#fef3c7' },
  statusInStock: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 10, fontWeight: '700', color: '#000' },
});
