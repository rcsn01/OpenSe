import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ui/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

import { StockReport } from '@/components/recent-reports';

export interface Product {
  id: string;
  name: string;
  location: string;
  quantity: number;
}

interface Props {
  products: Product[];
  reports?: StockReport[];
}

export function StockList({ products, reports = [] }: Props) {
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const locationStats = React.useMemo(() => {
    const stats: Record<string, { empty: number; low: number; inStock: number }> = {};
    
    // Create a map of product ID to latest report status
    const productStatusMap = new Map<string, string>();
    reports.forEach(r => {
      productStatusMap.set(String(r.product_id), r.status);
    });

    products.forEach(p => {
      const loc = p.location || 'Unassigned';
      if (!stats[loc]) stats[loc] = { empty: 0, low: 0, inStock: 0 };
      
      // Use report status if available, otherwise fallback to quantity
      const reportStatus = productStatusMap.get(String(p.id));
      
      if (reportStatus) {
        if (reportStatus === 'empty') stats[loc].empty++;
        else if (reportStatus === 'low') stats[loc].low++;
        else stats[loc].inStock++;
      } else {
        // Fallback to quantity if no report exists
        const qty = Number(p.quantity);
        if (qty === 0) stats[loc].empty++;
        else if (qty <= 5) stats[loc].low++;
        else stats[loc].inStock++;
      }
    });

    return Object.entries(stats).map(([location, data]) => ({
      location,
      ...data
    })).sort((a, b) => a.location.localeCompare(b.location));
  }, [products, reports]);

  return (
    <View style={styles.section}>
      <View style={styles.headerContainer}>
        <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Stock by Location</ThemedText>
        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#ef4444' }]} />
            <ThemedText style={[styles.legendText, { color: mutedText }]}>Empty</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#f59e0b' }]} />
            <ThemedText style={[styles.legendText, { color: mutedText }]}>Low</ThemedText>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: '#10b981' }]} />
            <ThemedText style={[styles.legendText, { color: mutedText }]}>Good</ThemedText>
          </View>
        </View>
      </View>

      {locationStats.length === 0 ? (
        <ThemedText style={{ color: mutedText }}>No products found.</ThemedText>
      ) : (
        locationStats.map((stat) => {
          const total = stat.empty + stat.low + stat.inStock;
          
          return (
            <View key={stat.location} style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
              <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
                <ThemedText type="defaultSemiBold">{stat.location}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: mutedText }}>{total} Total</ThemedText>
              </View>
              
              <View style={styles.barContainer}>
                {stat.empty > 0 && (
                  <View style={[styles.barSegment, { flex: stat.empty, backgroundColor: '#ef4444', borderTopLeftRadius: 4, borderBottomLeftRadius: 4, borderTopRightRadius: (stat.low === 0 && stat.inStock === 0) ? 4 : 0, borderBottomRightRadius: (stat.low === 0 && stat.inStock === 0) ? 4 : 0 }]} />
                )}
                {stat.low > 0 && (
                  <View style={[styles.barSegment, { flex: stat.low, backgroundColor: '#f59e0b', borderTopLeftRadius: stat.empty === 0 ? 4 : 0, borderBottomLeftRadius: stat.empty === 0 ? 4 : 0, borderTopRightRadius: stat.inStock === 0 ? 4 : 0, borderBottomRightRadius: stat.inStock === 0 ? 4 : 0 }]} />
                )}
                {stat.inStock > 0 && (
                  <View style={[styles.barSegment, { flex: stat.inStock, backgroundColor: '#10b981', borderTopRightRadius: 4, borderBottomRightRadius: 4, borderTopLeftRadius: (stat.empty === 0 && stat.low === 0) ? 4 : 0, borderBottomLeftRadius: (stat.empty === 0 && stat.low === 0) ? 4 : 0 }]} />
                )}
              </View>

              <View style={styles.statsRow}>
                {stat.empty > 0 && <ThemedText style={[styles.statLabel, { color: mutedText }]}>{stat.empty} Empty</ThemedText>}
                {stat.low > 0 && <ThemedText style={[styles.statLabel, { color: mutedText }]}>{stat.low} Low</ThemedText>}
                {stat.inStock > 0 && <ThemedText style={[styles.statLabel, { color: mutedText }]}>{stat.inStock} Good</ThemedText>}
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  legend: {
    flexDirection: 'row',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
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
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  barContainer: {
    flexDirection: 'row',
    height: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  barSegment: {
    height: '100%',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statLabel: {
    fontSize: 12,
  },
});
