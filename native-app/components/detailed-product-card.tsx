import React from 'react';
import { View, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';

type Props = {
  productDetails: any | null;
  productLoading: boolean;
  scannedData: string | null;
  productMutedText: string;
  productTextColor: string;
  productOptionBg: string;
  apiBaseUrl: string;
  onReturnToScan?: () => void;
};

export default function DetailedProductCard({ productDetails, productLoading, scannedData, productMutedText, productTextColor, productOptionBg, apiBaseUrl, onReturnToScan }: Props) {
  return (
    <View style={styles.card}>
      {scannedData ? (
        productLoading ? (
          <ThemedText style={styles.loadingText}>Loading…</ThemedText>
        ) : (
          <View style={styles.row}>
            <View style={styles.leftCol}>
              <ThemedText style={[styles.name, { color: productTextColor }]}>{productDetails?.name ?? 'Unknown Product'}</ThemedText>

              <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 8 }]}>{productDetails?.description ?? ''}</ThemedText>

              <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 6 }]}>{productDetails?.category ?? ''}</ThemedText>

              <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 6 }]}>{productDetails?.quantity ?? ''}</ThemedText>

              <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 6 }]}>{productDetails?.location ?? ''}</ThemedText>

              {productDetails?.latestStatus ? (
                <View style={[styles.statusBadge, productDetails.latestStatus === 'empty' && styles.statusEmpty, productDetails.latestStatus === 'low' && styles.statusLow, productDetails.latestStatus === 'in-stock' && styles.statusInStock]}>
                  <ThemedText style={[styles.statusText, { color: productMutedText }]}>{productDetails.latestStatus === 'empty' ? 'Empty' : productDetails.latestStatus === 'low' ? 'Low' : 'In Stock'}</ThemedText>
                </View>
              ) : null}
            </View>
            {productDetails?.image_url ? (
              <Image source={{ uri: `${apiBaseUrl}${productDetails.image_url}` }} style={[styles.thumb, { backgroundColor: productOptionBg }]} />
            ) : null}
          </View>
        )
      ) : (
        <View style={styles.row}>
          <View style={styles.leftCol}>
            <ThemedText style={[styles.name, { color: productTextColor }]}>Empty</ThemedText>
            <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 8 }]}>Description</ThemedText>
            <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 6 }]}>Category</ThemedText>
            <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 6 }]}>Quantity</ThemedText>
            <ThemedText style={[styles.metaText, { color: productMutedText, marginTop: 6 }]}>Location</ThemedText>
          </View>
        </View>
      )}
      {/* Close / return to scan button shown when a product has been scanned */}
      {scannedData ? (
        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Return to scanning"
          onPress={() => {
            console.log('DetailedProductCard: close pressed');
            onReturnToScan?.();
          }}
          style={[styles.closeButton, { backgroundColor: productOptionBg ?? '#eee' }]}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <ThemedText style={[styles.closeText, { color: productTextColor ?? '#000' }]}>✕</ThemedText>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    position: 'relative',
    padding: 12,
    borderRadius: 12,
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  leftCol: {
    flex: 1,
    paddingRight: 8,
  },
  metaCol: {
    width: 120,
    paddingLeft: 8,
    justifyContent: 'flex-start',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 14,
    opacity: 0.8,
  },
  thumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  statusBadge: {
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusEmpty: { backgroundColor: '#fee2e2' },
  statusLow: { backgroundColor: '#fef3c7' },
  statusInStock: { backgroundColor: '#d1fae5' },
  statusText: { fontSize: 12, fontWeight: '600' },
  closeButton: {
    position: 'absolute',
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    // subtle shadow on iOS / elevation on Android
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  closeText: { fontSize: 18, fontWeight: '700' },
});
