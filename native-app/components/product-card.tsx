import React from 'react';
import { StyleSheet, View, TouchableOpacity, Platform } from 'react-native';
import { Image } from 'expo-image';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { API_BASE_URL } from '@/config/api';
import { Colors } from '@/constants/theme';

export interface Product {
  id: string;
  name: string;
  description?: string | null;
  created_at?: string;
  latestStatus?: 'empty' | 'low' | 'in-stock' | null;
  category?: string | null;
  quantity?: number | null;
  expiry_date?: string | null;
  location?: string | null;
  image_url?: string | null;
}

type Props = {
  product: Product;
  // accept a loose product shape to avoid strict type mismatches with consumer files
  onPress?: (p: any) => void;
};

export default function ProductCard({ product, onPress }: Props) {
  const cardBackground = useThemeColor({ light: Colors.light.productCardBackground, dark: Colors.dark.productCardBackground }, 'background');
  const borderColor = useThemeColor({ light: Colors.light.productCardBorder, dark: Colors.dark.productCardBorder }, 'background');
  const optionBg = useThemeColor({ light: Colors.light.productThumbBackground, dark: Colors.dark.productThumbBackground }, 'background');
  const mutedText = useThemeColor({ light: Colors.light.productMutedText, dark: Colors.dark.productMutedText }, 'text');
  const textColor = useThemeColor({}, 'text');

  const getImageUri = (path?: string | null) => {
    if (!path) return null;
    return `${API_BASE_URL}${path}`;
  };

  return (
    <TouchableOpacity
      style={[styles.productCard, { backgroundColor: cardBackground, borderColor }]}
      onPress={() => onPress && onPress(product)}
      activeOpacity={0.8}
    >
      <View style={styles.productHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.nameRow}>
            <ThemedText type="defaultSemiBold" style={[styles.productName, { color: textColor }]}>
              {product.name}
            </ThemedText>
            {product.latestStatus && (
              <View
                style={[
                  styles.statusBadge,
                  product.latestStatus === 'empty' && styles.statusEmpty,
                  product.latestStatus === 'low' && styles.statusLow,
                  product.latestStatus === 'in-stock' && styles.statusInStock,
                  styles.statusBadgeInline,
                ]}
              >
                <ThemedText style={[styles.statusText, { color: mutedText }]}> 
                  {product.latestStatus === 'empty' ? 'Empty' : product.latestStatus === 'low' ? 'Low' : 'In Stock'}
                </ThemedText>
              </View>
            )}
          </View>

          {product.description ? (
            <ThemedText style={[styles.productDescription, { color: mutedText }]} numberOfLines={2}>{product.description}</ThemedText>
          ) : null}

          {(product.category || product.quantity != null || product.location) ? (
            <ThemedText style={[styles.productMeta, { color: mutedText }]}> 
              {[
                product.category ? `Category: ${product.category}` : null,
                product.quantity != null ? `Qty: ${product.quantity}` : null,
                product.location ? `${product.location}` : null,
              ].filter(Boolean).join(' • ')}
            </ThemedText>
          ) : null}
        </View>

        {product.image_url ? (
          <Image
            source={{ uri: getImageUri(product.image_url) || undefined }}
            style={[styles.productThumb, { backgroundColor: optionBg }]}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
          />
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  productCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 20,
    flex: 1,
    marginRight: 12,
  },
  productDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
  },
  productMeta: {
    fontSize: 12,
    opacity: 0.8,
    marginBottom: 8,
  },
  productThumb: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginLeft: 12,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusBadgeInline: {
    paddingHorizontal: 8,
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
    fontSize: 11,
    fontWeight: '600',
  },
});
