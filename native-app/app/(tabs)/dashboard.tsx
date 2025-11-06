import { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, RefreshControl, ScrollView, Modal, TouchableOpacity, FlatList } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import ProductQrModal from '@/components/product-qr-modal';

interface StockReport {
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

interface StockStats {
  empty: number;
  low: number;
  inStock: number;
  total: number;
}

export default function DashboardScreen() {
  const { token } = useAuth();
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const buttonBackgroundSelected = useThemeColor({ light: Colors.light.buttonBackgroundSelected, dark: Colors.dark.buttonBackgroundSelected }, 'background');
  const buttonTextSelected = useThemeColor({ light: Colors.light.buttonTextSelected, dark: Colors.dark.buttonTextSelected }, 'text');
  const [stats, setStats] = useState<StockStats>({ empty: 0, low: 0, inStock: 0, total: 0 });
  const [recentReports, setRecentReports] = useState<StockReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // QR modal visibility
  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      const response = await fetch(API_ENDPOINTS.reports, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      const reports: StockReport[] = await response.json();
      
      // Calculate statistics from the latest report for each product
      const latestReportsByProduct = new Map<string, StockReport>();
      reports.forEach(report => {
        const key = String(report.product_id);
        const existing = latestReportsByProduct.get(key);
        if (!existing || new Date(report.created_at) > new Date(existing.created_at)) {
          latestReportsByProduct.set(key, report);
        }
      });

      const latestReports = Array.from(latestReportsByProduct.values());
      
      const calculatedStats: StockStats = {
        empty: latestReports.filter(r => r.status === 'empty').length,
        low: latestReports.filter(r => r.status === 'low').length,
        inStock: latestReports.filter(r => r.status === 'in-stock').length,
        total: latestReports.length,
      };

      setStats(calculatedStats);
      setRecentReports(reports.slice(0, 5)); // Get 5 most recent reports
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchProducts = async () => {
    // moved to ProductQrModal component
  };

  const onRefresh = () => {
    fetchDashboardData(true);
  };

  const openQrModal = () => {
    setIsQrModalVisible(true);
  };

  const closeQrModal = () => {
    setIsQrModalVisible(false);
  };

  if (isLoading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: background }]}>
        <ActivityIndicator size="large" color={tint} />
        <ThemedText style={[styles.loadingText, { color: mutedText }]}>Loading dashboard...</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}> 
      <View style={[styles.header, { backgroundColor: cardBackground, borderBottomColor: borderColor }]}> 
        <ThemedText type="title" style={[styles.title, { color: textColor }]}>Dashboard</ThemedText>
        <ThemedText style={[styles.subtitle, { color: mutedText }]}>Stock Status Overview</ThemedText>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }>
        {error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : null}

        {/* Three-column stats: In Stock | Low Stock | Out of Stock */}
        <View style={styles.statsRow}>
          <View style={[styles.statColumn, { backgroundColor: cardBackground, borderColor }]}> 
            <ThemedText style={[styles.statLabel, { color: mutedText }]}>In Stock</ThemedText>
            <ThemedText style={[styles.statNumber, { color: textColor }]}>{stats.inStock}</ThemedText>
          </View>

          <View style={[styles.verticalSeparator, { backgroundColor: borderColor }]} />

          <View style={[styles.statColumn, { backgroundColor: cardBackground, borderColor }]}> 
            <ThemedText style={[styles.statLabel, { color: mutedText }]}>Low Stock</ThemedText>
            <ThemedText style={[styles.statNumber, { color: textColor }]}>{stats.low}</ThemedText>
          </View>

          <View style={[styles.verticalSeparator, { backgroundColor: borderColor }]} />

          <View style={[styles.statColumn, { backgroundColor: cardBackground, borderColor }]}> 
            <ThemedText style={[styles.statLabel, { color: mutedText }]}>Out of Stock</ThemedText>
            <ThemedText style={[styles.statNumber, { color: textColor }]}>{stats.empty}</ThemedText>
          </View>
        </View>

        {/* Action buttons row (replaces previous "Recent Reports" section) */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: buttonBackgroundSelected, borderColor }]}
            onPress={() => { /* TODO: wire navigation to Reports screen */ }}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.actionButtonText, { color: buttonTextSelected }]}>Reports</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: cardBackground, borderColor }]}
            onPress={() => { /* TODO: wire navigation to Categories screen */ }}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.actionButtonText, { color: textColor }]}>Categories</ThemedText>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: cardBackground, borderColor }]}
            onPress={() => { /* TODO: wire navigation to Locations screen */ }}
            accessibilityRole="button"
          >
            <ThemedText style={[styles.actionButtonText, { color: textColor }]}>Locations</ThemedText>
          </TouchableOpacity>
        </View>

        {recentReports.length === 0 && !error && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>📊</ThemedText>
            <ThemedText type="defaultSemiBold" style={[styles.emptyTitle, { color: textColor }]}>
              No reports yet
            </ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Start scanning products to see your stock status!
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* Floating QR Codes button at bottom-right */}
      <TouchableOpacity
        style={[styles.qrFloatButton, { backgroundColor: buttonBackgroundSelected, borderColor }]}
        onPress={openQrModal}
        accessibilityRole="button"
      >
        <ThemedText style={[styles.qrButtonText, { color: buttonTextSelected }]}>QR Codes</ThemedText>
      </TouchableOpacity>

      <ProductQrModal visible={isQrModalVisible} onClose={closeQrModal} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
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
  errorContainer: {
    backgroundColor: '#fee2e2',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  errorText: {
    color: '#ef4444',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  emptyCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  lowCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  inStockCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  statNumber: {
    fontSize: 24,
    lineHeight: 28,
    fontWeight: '700',
    marginTop: 6,
    marginBottom: 0,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 12,
  },
  statColumn: {
    flex: 1,
    minHeight: 88,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalSeparator: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: 12,
  },
  singleStatCard: {
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recentSection: {
    marginTop: 8,
  },
  recentTitle: {
    marginBottom: 12,
    fontSize: 18,
  },
  reportCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusEmpty: {
    backgroundColor: '#fee2e2',
  },
  statusLow: {
    backgroundColor: '#fef3c7',
  },
  statusInStock: {
    backgroundColor: '#d1fae5',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  reportDetail: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
  },
  reportNotes: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
  },
  qrButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  qrButtonText: {
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  qrCloseButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  qrCloseButtonText: {
    fontWeight: '600',
  },
  qrList: {
    paddingBottom: 48,
  },
  qrItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  qrName: {
    marginBottom: 10,
    fontSize: 16,
  },
  qrSvgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
  },
  actionsRow: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    marginBottom: 20,
  },
  actionButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionButtonText: {
    fontWeight: '700',
    fontSize: 14,
  },
  qrFloatButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
