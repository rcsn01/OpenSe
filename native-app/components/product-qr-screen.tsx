import React, { useEffect, useState } from 'react';
import { Modal, View, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet, Alert, Platform } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  const generatePdf = async () => {
    if (products.length === 0) {
      Alert.alert('No Products', 'There are no products to generate QR codes for.');
      return;
    }

    setIsGeneratingPdf(true);
    
    const html = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
          <style>
            body { font-family: Helvetica, sans-serif; padding: 20px; }
            h1 { text-align: center; margin-bottom: 40px; }
            .grid { display: flex; flex-wrap: wrap; justify-content: center; gap: 20px; }
            .product-item { 
              break-inside: avoid; 
              border: 1px solid #ccc; 
              padding: 20px; 
              border-radius: 8px; 
              text-align: center; 
              width: 200px;
              box-sizing: border-box;
            }
            .qr-code { margin-top: 10px; width: 150px; height: 150px; }
            .product-name { font-weight: bold; margin-bottom: 5px; font-size: 16px; }
            .product-id { font-size: 12px; color: #666; margin-top: 5px; }
          </style>
        </head>
        <body>
          <h1>Product QR Codes</h1>
          <div class="grid">
            ${products.map(p => `
              <div class="product-item">
                <div class="product-name">${p.name}</div>
                <img class="qr-code" src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${p.id}" />
                <div class="product-id">ID: ${p.id}</div>
              </div>
            `).join('')}
          </div>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      Alert.alert('Error', 'Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: background }]}> 
        <View style={[styles.header, { borderBottomColor: borderColor }]}> 
          <ThemedText type="title" style={[styles.title, { color: textColor }]}>Product QR Codes</ThemedText>
          <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: cardBackground, borderColor }]} accessibilityRole="button">
            <ThemedText style={[styles.closeButtonText, { color: textColor }]}>Close</ThemedText>
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
          <>
            <View style={styles.actionsContainer}>
              <TouchableOpacity 
                style={[styles.pdfButton, { backgroundColor: tint }]} 
                onPress={generatePdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <ThemedText style={styles.pdfButtonText}>Download PDF</ThemedText>
                )}
              </TouchableOpacity>
            </View>
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
          </>
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
  actionsContainer: {
    padding: 16,
    paddingBottom: 0,
  },
  pdfButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pdfButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    padding: 16,
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
