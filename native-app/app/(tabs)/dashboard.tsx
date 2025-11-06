import { useEffect, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, RefreshControl, ScrollView, Modal, TouchableOpacity, FlatList } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
// QR code generation (install `react-native-qrcode-svg` and `react-native-svg` for Expo)
import QRCode from 'react-native-qrcode-svg';

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
  const [stats, setStats] = useState<StockStats>({ empty: 0, low: 0, inStock: 0, total: 0 });
  const [recentReports, setRecentReports] = useState<StockReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  // Products & QR modal
  const [products, setProducts] = useState<Array<{ id: number; name: string; [k: string]: any }>>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
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
    setIsProductsLoading(true);
    setProductsError('');
    try {
      const res = await fetch(API_ENDPOINTS.products, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch products');

      const data = await res.json();
      // Expecting an array of products. Normalize to objects with id and name.
      const normalized = Array.isArray(data)
        ? data.map((p: any) => ({ id: p.id ?? p.product_id ?? p._id ?? 0, name: p.name ?? p.product_name ?? p.title ?? String(p.id) , ...p }))
        : [];
      setProducts(normalized);
    } catch (err: any) {
      console.error('Products fetch error:', err);
      setProductsError(err.message || 'Failed to load products');
    } finally {
      setIsProductsLoading(false);
    }
  };

  const onRefresh = () => {
    fetchDashboardData(true);
  };

  const openQrModal = () => {
    setIsQrModalVisible(true);
    // load products when opening
    fetchProducts();
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
        <ThemedText type="title" style={styles.title}>Dashboard</ThemedText>
        <ThemedText style={styles.subtitle}>Stock Status Overview</ThemedText>
        <TouchableOpacity style={[styles.qrButton, { backgroundColor: cardBackground, borderColor }]} onPress={openQrModal} accessibilityRole="button">
          <ThemedText style={[styles.qrButtonText, { color: tint }]}>QR Codes</ThemedText>
        </TouchableOpacity>
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

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, styles.emptyCard, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText style={styles.statNumber}>{stats.empty}</ThemedText>
            <ThemedText style={styles.statLabel}>Out of Stock</ThemedText>
          </View>

          <View style={[styles.statCard, styles.lowCard, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText style={styles.statNumber}>{stats.low}</ThemedText>
            <ThemedText style={styles.statLabel}>Low Stock</ThemedText>
          </View>

          <View style={[styles.statCard, styles.inStockCard, { backgroundColor: cardBackground, borderColor }]}>
            <ThemedText style={styles.statNumber}>{stats.inStock}</ThemedText>
            <ThemedText style={styles.statLabel}>In Stock</ThemedText>
          </View>
        </View>

        {recentReports.length > 0 && (
          <View style={styles.recentSection}>
            <ThemedText type="subtitle" style={styles.recentTitle}>
              Recent Reports
            </ThemedText>
            {recentReports.map((report) => (
              <View key={report.id} style={[styles.reportCard, { backgroundColor: cardBackground, borderColor }]}>
                <View style={styles.reportHeader}>
                  <ThemedText type="defaultSemiBold">{report.product_name}</ThemedText>
                  <View style={[
                    styles.statusBadge,
                    report.status === 'empty' && styles.statusEmpty,
                    report.status === 'low' && styles.statusLow,
                    report.status === 'in-stock' && styles.statusInStock,
                  ]}>
                    <ThemedText style={styles.statusText}>
                      {report.status === 'empty' ? 'Empty' : 
                       report.status === 'low' ? 'Low' : 'In Stock'}
                    </ThemedText>
                  </View>
                </View>
                <ThemedText style={styles.reportDetail}>
                  By {report.username}
                </ThemedText>
                <ThemedText style={styles.reportDetail}>
                  {new Date(report.created_at).toLocaleDateString()} at{' '}
                  {new Date(report.created_at).toLocaleTimeString()}
                </ThemedText>
                {report.notes && (
                  <ThemedText style={styles.reportNotes}>{report.notes}</ThemedText>
                )}
              </View>
            ))}
          </View>
        )}

        {recentReports.length === 0 && !error && (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyText}>📊</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              No reports yet
            </ThemedText>
            <ThemedText style={styles.emptyStateText}>
              Start scanning products to see your stock status!
            </ThemedText>
          </View>
        )}
      </ScrollView>

      {/* QR Codes modal */}
      <Modal visible={isQrModalVisible} animationType="slide" onRequestClose={closeQrModal}>
        <View style={[styles.modalContainer, { backgroundColor: background }]}> 
          <View style={[styles.modalHeader, { borderBottomColor: borderColor }]}> 
            <ThemedText type="title" style={[styles.modalTitle, { color: tint }]}>Product QR Codes</ThemedText>
            <TouchableOpacity onPress={closeQrModal} style={styles.qrCloseButton} accessibilityRole="button">
              <ThemedText style={[styles.qrCloseButtonText, { color: mutedText }]}>Close</ThemedText>
            </TouchableOpacity>
          </View>

          {isProductsLoading ? (
            <View style={styles.centerContainer}>
              <ActivityIndicator size="large" color={tint} />
              <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
            </View>
          ) : productsError ? (
            <View style={styles.errorContainer}>
              <ThemedText style={styles.errorText}>{productsError}</ThemedText>
            </View>
          ) : (
            <FlatList
              data={products}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.qrList}
              renderItem={({ item }) => (
                <View style={[styles.qrItem, { backgroundColor: cardBackground, borderColor }]}>
                  <ThemedText type="defaultSemiBold" style={styles.qrName}>{item.name}</ThemedText>
                  <View style={styles.qrSvgContainer}>
                    {/* Use product id as QR payload; you can change to a URL or SKU if preferred */}
                    {/* @ts-ignore */}
                    <QRCode value={String(item.id)} size={140} />
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
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
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
    color: '#6b7280',
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
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    color: '#6b7280',
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    opacity: 0.8,
    color: '#374151',
  },
  recentSection: {
    marginTop: 8,
  },
  recentTitle: {
    marginBottom: 12,
    fontSize: 18,
    color: '#000',
  },
  reportCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
    color: '#374151',
  },
  reportDetail: {
    fontSize: 12,
    opacity: 0.7,
    marginBottom: 4,
    color: '#6b7280',
  },
  reportNotes: {
    fontSize: 13,
    marginTop: 8,
    fontStyle: 'italic',
    opacity: 0.8,
    color: '#6b7280',
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
    color: '#000',
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: 'center',
    opacity: 0.6,
    color: '#6b7280',
  },
  qrButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    backgroundColor: '#eef2ff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e7ff',
  },
  qrButtonText: {
    color: '#4c51bf',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
    color: '#000',
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
    color: '#374151',
    fontWeight: '600',
  },
  qrList: {
    paddingBottom: 48,
  },
  qrItem: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  qrName: {
    marginBottom: 10,
    color: '#111827',
    fontSize: 16,
  },
  qrSvgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    padding: 8,
    borderRadius: 8,
  },
});
