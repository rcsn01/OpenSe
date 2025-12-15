import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ui/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

export interface Product {
  id: string;
  name: string;
  location: string;
  quantity: number;
}

interface Props {
  products: Product[];
}

export function StockList({ products }: Props) {
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const textColor = useThemeColor({}, 'text');

  const locationStats = React.useMemo(() => {
    const stats: Record<string, { empty: number; low: number; inStock: number }> = {};
    
    products.forEach(p => {
      const loc = p.location || 'Unassigned';
      if (!stats[loc]) stats[loc] = { empty: 0, low: 0, inStock: 0 };
      
      if (p.quantity === 0) stats[loc].empty++;
      else if (p.quantity <= 5) stats[loc].low++;
      else stats[loc].inStock++;
    });

    return Object.entries(stats).map(([location, data]) => ({
      location,
      ...data
    })).sort((a, b) => a.location.localeCompare(b.location));
  }, [products]);

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Stock by Location</ThemedText>
      {locationStats.length === 0 ? (
        <ThemedText style={{ color: mutedText }}>No products found.</ThemedText>
      ) : (
        locationStats.map((stat) => (
          <View key={stat.location} style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
            <View style={[styles.cardHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="defaultSemiBold">{stat.location}</ThemedText>
            </View>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: '#ef4444' }]}>{stat.empty}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: mutedText }]}>Empty</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: '#f59e0b' }]}>{stat.low}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: mutedText }]}>Low</ThemedText>
              </View>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statValue, { color: '#10b981' }]}>{stat.inStock}</ThemedText>
                <ThemedText style={[styles.statLabel, { color: mutedText }]}>In Stock</ThemedText>
              </View>
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
  cardHeader: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
});
