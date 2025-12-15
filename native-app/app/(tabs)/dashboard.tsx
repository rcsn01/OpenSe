import { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS } from '@/config/api';
import { RecentReports, StockReport } from '@/components/recent-reports';
import { StockList, Product } from '@/components/stock-list';
import { TeamActivity, UserStat } from '@/components/team-activity';

interface StockStats {
  empty: number;
  low: number;
  inStock: number;
  total: number;
}

export default function DashboardScreen() {
  const { token, logout } = useAuth();
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  const insets = useSafeAreaInsets();
  
  const [stats, setStats] = useState<StockStats>({ empty: 0, low: 0, inStock: 0, total: 0 });
  const [recentReports, setRecentReports] = useState<StockReport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [teamStats, setTeamStats] = useState<UserStat[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Initial load only
  useEffect(() => {
    if (token) {
      fetchDashboardData();
    }
  }, [token]);

  const fetchDashboardData = async (isRefresh = false) => {
    if (!token) return;
    
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }
    setError('');

    try {
      // Fetch Reports
      const reportsRes = await fetch(API_ENDPOINTS.reports, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      
      if (reportsRes.status === 401) {
        await logout();
        return;
      }

      if (!reportsRes.ok) throw new Error('Failed to fetch reports');
      const reportsData: StockReport[] = await reportsRes.json();
      
      // Calculate stats
      const latestReportsByProduct = new Map<string, StockReport>();
      reportsData.forEach(report => {
        const key = String(report.product_id);
        const existing = latestReportsByProduct.get(key);
        if (!existing || new Date(report.created_at) > new Date(existing.created_at)) {
          latestReportsByProduct.set(key, report);
        }
      });
      const latestReports = Array.from(latestReportsByProduct.values());
      
      setStats({
        empty: latestReports.filter(r => r.status === 'empty').length,
        low: latestReports.filter(r => r.status === 'low').length,
        inStock: latestReports.filter(r => r.status === 'in-stock').length,
        total: latestReports.length,
      });
      setRecentReports(reportsData.slice(0, 5));

      // Fetch Products (for Stock section)
      const productsRes = await fetch(API_ENDPOINTS.products, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (productsRes.ok) {
        const productsData: Product[] = await productsRes.json();
        // Sort by location
        const sortedProducts = productsData.sort((a, b) => (a.location || '').localeCompare(b.location || ''));
        setProducts(sortedProducts);
      }

      // Fetch Team Stats
      const teamRes = await fetch(API_ENDPOINTS.users, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (teamRes.ok) {
        const teamData: UserStat[] = await teamRes.json();
        setTeamStats(teamData);
      }

    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const onRefresh = () => {
    fetchDashboardData(true);
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
      <View style={[styles.header, { backgroundColor: cardBackground, borderBottomColor: borderColor, paddingTop: Platform.OS === 'ios' ? (insets.top + 12) : 20 }]}> 
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

        <RecentReports reports={recentReports} />
        <StockList products={products} />
        <TeamActivity teamStats={teamStats} />

        <View style={{ height: 80 }} /> 
      </ScrollView>
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
});