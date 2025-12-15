import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { ThemedText } from '@/components/ui/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { API_BASE_URL, API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';

type Product = {
  id: string;
  name: string;
  description: string;
  created_at: string;
  latestStatus?: 'empty' | 'low' | 'in-stock' | null;
  category?: string | null;
  quantity?: number | null;
  expiry_date?: string | null;
  location?: string | null;
  image_url?: string | null;
};

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams();
  const { token, logout } = useAuth();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const background = useThemeColor({}, 'background');
  const link = useThemeColor({}, 'link');
  const optionBg = useThemeColor({ light: Colors.light.mutedBackground, dark: Colors.dark.mutedBackground }, 'background');
  const mutedText = useThemeColor({ light: Colors.light.mutedText, dark: Colors.dark.mutedText }, 'text');
  const textColor = useThemeColor({}, 'text');
  const buttonBackgroundDefault = useThemeColor({ light: Colors.light.buttonBackgroundDefault, dark: Colors.dark.buttonBackgroundDefault }, 'background');
  const buttonTextDefault = useThemeColor({ light: Colors.light.buttonTextDefault, dark: Colors.dark.buttonTextDefault }, 'text');

  useEffect(() => {
    fetchProduct();
  }, [id, token]);

  const fetchProduct = async () => {
    if (!token || !id) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.products}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401) {
        await logout();
        return;
      }

      if (!res.ok) throw new Error('Failed to load product');
      
      const data = await res.json();
      setProduct(data);
    } catch (e) {
      setError('Failed to load product details');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (error || !product) {
    return (
      <View style={[styles.center, { backgroundColor: background }]}>
        <ThemedText>{error || 'Product not found'}</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Stack.Screen 
        options={{ 
          title: product.name,
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => {
                router.push({
                  pathname: '/product/add',
                  params: { 
                    id: product.id, 
                    name: product.name,
                    description: product.description || '',
                    category: product.category || '',
                    quantity: product.quantity?.toString() || '',
                    expiry_date: product.expiry_date || '',
                    location: product.location || '',
                    image_url: product.image_url || ''
                  }
                });
              }}
              style={{ marginRight: 8, minWidth: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <ThemedText style={{ color: link, fontWeight: '600', fontSize: 17 }}>Edit</ThemedText>
            </TouchableOpacity>
          )
        }} 
      />
      
      <ScrollView contentContainerStyle={styles.detailContent}>
        {product.image_url ? (
          <Image 
            source={{ uri: `${API_BASE_URL}${product.image_url}` }} 
            style={[styles.detailImage, { backgroundColor: optionBg }]} 
            contentFit="cover"
            transition={300}
            cachePolicy="memory-disk"
          />
        ) : null}

        <View style={styles.detailRow}>
          <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Name:</ThemedText>
          <ThemedText style={[styles.detailValue, { color: textColor }]}>{product.name}</ThemedText>
        </View>

        <View style={styles.detailRow}>
          <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Product ID (QR):</ThemedText>
          <ThemedText style={[styles.detailValue, { color: textColor }]}>{product.id}</ThemedText>
        </View>

        {product.description ? (
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Description:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{product.description}</ThemedText>
          </View>
        ) : null}

        {product.category ? (
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Category:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{product.category}</ThemedText>
          </View>
        ) : null}

        <View style={styles.detailRow}>
          <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Quantity:</ThemedText>
          <ThemedText style={[styles.detailValue, { color: textColor }]}>{product.quantity ?? 0}</ThemedText>
        </View>

        {product.expiry_date ? (
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Expiry:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{new Date(product.expiry_date).toLocaleDateString()}</ThemedText>
          </View>
        ) : null}

        {product.location ? (
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Location:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{product.location}</ThemedText>
          </View>
        ) : null}

        {product.latestStatus && (
          <View style={styles.detailRow}>
            <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Status:</ThemedText>
            <ThemedText style={[styles.detailValue, { color: textColor }]}>{product.latestStatus}</ThemedText>
          </View>
        )}

        <View style={styles.detailRow}>
          <ThemedText style={[styles.detailLabel, { color: mutedText }]}>Added:</ThemedText>
          <ThemedText style={[styles.detailValue, { color: textColor }]}>{new Date(product.created_at).toLocaleString()}</ThemedText>
        </View>
      </ScrollView>
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
  },
  detailContent: {
    padding: 20,
  },
  detailImage: {
    width: '100%',
    height: 250,
    borderRadius: 12,
    marginBottom: 20,
  },
  detailRow: {
    marginBottom: 16,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
