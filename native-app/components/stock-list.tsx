import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/themed-text';
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

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" style={[styles.sectionTitle, { color: textColor }]}>Stock by Location</ThemedText>
      {products.length === 0 ? (
        <ThemedText style={{ color: mutedText }}>No products found.</ThemedText>
      ) : (
        products.map((product) => (
          <View key={product.id} style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
            <View style={styles.cardHeader}>
              <ThemedText type="defaultSemiBold">{product.name}</ThemedText>
              <ThemedText style={{ color: mutedText }}>{product.location || 'No Location'}</ThemedText>
            </View>
            <ThemedText style={{ color: textColor }}>Qty: {product.quantity}</ThemedText>
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
});
