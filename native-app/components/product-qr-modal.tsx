import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

interface Product {
  id: number | string;
  name: string;
  [k: string]: any;
}

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function ProductQrModal({ visible, onClose }: Props) {
  const { token } = useAuth();
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (visible) fetchProducts();
  }, [visible]);

  const fetchProducts = async () => {
    setIsLoading(true);
    setError('');
    try {
      const res = await fetch(API_ENDPOINTS.products, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error('Failed to fetch products');
      const data = await res.json();
      const normalized = Array.isArray(data)
        ? data.map((p: any) => ({ id: p.id ?? p.product_id ?? p._id ?? 0, name: p.name ?? p.product_name ?? p.title ?? String(p.id), ...p }))
        : [];
      setProducts(normalized);
    } catch (err: any) {
      console.error('Products fetch error (QR modal):', err);
      setError(err.message || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: background }]}> 
        <View style={[styles.header, { borderBottomColor: borderColor }]}> 
          <ThemedText type="title" style={[styles.title, { color: tint }]}>Product QR Codes</ThemedText>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: cardBackground, borderColor }]} accessibilityRole="button">
            <ThemedText style={[styles.closeButtonText, { color: mutedText }]}>Close</ThemedText>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={tint} />
            <ThemedText style={[styles.loadingText, { color: mutedText }]}>Loading products...</ThemedText>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <ThemedText style={styles.errorText}>{error}</ThemedText>
          </View>
        ) : (
          <FlatList
            data={products}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <View style={[styles.item, { backgroundColor: cardBackground, borderColor }]}>
                <ThemedText type="defaultSemiBold" style={[styles.name, { color: textColor }]}>{item.name}</ThemedText>
                <View style={[styles.qrContainer, { backgroundColor: cardBackground }]}>
                  {/* @ts-ignore */}
                  <QRCode value={String(item.id)} size={140} />
                </View>
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
  },
  closeButton: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  closeButtonText: {
    fontWeight: '600',
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
  list: {
    paddingBottom: 48,
  },
  item: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  name: {
    marginBottom: 10,
    fontSize: 16,
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderRadius: 8,
  },
});
