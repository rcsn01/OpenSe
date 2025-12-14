import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, ActivityIndicator, FlatList, StyleSheet, Alert, Dimensions } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/ui/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

interface Product {
  id: number | string;
  name: string;
  [k: string]: any;
}

const { width } = Dimensions.get('window');
// Calculate QR size based on 4 columns
// Screen width - (horizontal padding * 2) - (gap * 3)
// Then divide by 4 columns
// Then subtract internal padding of the card
const GAP = 12;
const PADDING = 16;
const COLUMNS = 4;
const AVAILABLE_WIDTH = width - (PADDING * 2) - (GAP * (COLUMNS - 1));
const ITEM_WIDTH = AVAILABLE_WIDTH / COLUMNS;
const QR_SIZE = ITEM_WIDTH - 16; // 4px padding on each side

export default function ProductQrScreen() {
  const { token } = useAuth();
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const textColor = useThemeColor({}, 'text');
  
  // Button colors
  const buttonText = '#fff';
  const buttonBg = useThemeColor({ light: '#667eea', dark: '#667eea' }, 'background');

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

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
      console.error('Products fetch error (QR screen):', err);
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
    <>
      <Stack.Screen options={{ title: 'Product QR Codes' }} />
      <View style={[styles.container, { backgroundColor: background }]}>
        {isLoading ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={buttonBg} />
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
                style={[styles.pdfButton, { backgroundColor: buttonBg }]} 
                onPress={generatePdf}
                disabled={isGeneratingPdf}
              >
                {isGeneratingPdf ? (
                  <ActivityIndicator size="small" color={buttonText} />
                ) : (
                  <ThemedText style={[styles.pdfButtonText, { color: buttonText }]}>Download PDF</ThemedText>
                )}
              </TouchableOpacity>
            </View>
            <FlatList
              data={products}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              numColumns={4}
              columnWrapperStyle={styles.columnWrapper}
              renderItem={({ item }) => (
                <View style={[styles.item, { backgroundColor: cardBackground, borderColor, width: ITEM_WIDTH }]}>
                  <ThemedText type="defaultSemiBold" style={[styles.name, { color: textColor }]} numberOfLines={1}>{item.name}</ThemedText>
                  <View style={[styles.qrContainer, { backgroundColor: cardBackground }]}>
                    {/* @ts-ignore */}
                    <QRCode value={String(item.id)} size={QR_SIZE} />
                  </View>
                </View>
              )}
            />
          </>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    margin: 20,
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
    fontWeight: '600',
    fontSize: 16,
  },
  list: {
    padding: 16,
    paddingBottom: 48,
  },
  columnWrapper: {
    gap: GAP,
  },
  item: {
    padding: 4,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  name: {
    marginBottom: 4,
    fontSize: 22,
    textAlign: 'center',
    fontWeight: '600',
  },
  qrContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    borderRadius: 4,
  },
});
