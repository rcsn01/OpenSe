import React, { useEffect, useState } from 'react';
import { View, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native';
import { useRouter } from 'expo-router';
import axios from 'axios';
import { API_BASE } from '@/constants/api';
import { Navbar } from '@/components/Navbar';

type Product = {
  id: number;
  name: string;
  qr_code: string;
  description?: string;
};

export default function ProductsScreen() {
  const [products, setProducts] = useState<Product[]>([]);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    axios
      .get(`${API_BASE}/api/products`)
      .then((res) => mounted && setProducts(res.data || []))
      .catch((err) => console.warn('Failed to load products', err.message));
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <View style={styles.container}>
      <Navbar />
      <FlatList
        data={products}
        keyExtractor={(i) => String(i.id)}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/product/${encodeURIComponent(item.qr_code)}`)}
            style={styles.item}
          >
            <Text style={styles.title}>{item.name}</Text>
            <Text style={styles.subtitle}>{item.qr_code}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No products found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 12 },
  item: { padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  title: { fontSize: 16, fontWeight: '600' },
  subtitle: { color: '#666' },
  empty: { padding: 16, textAlign: 'center' },
});
