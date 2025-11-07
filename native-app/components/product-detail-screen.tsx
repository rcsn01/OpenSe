import React from 'react';
import { Modal, View, ScrollView, Image, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { API_BASE_URL } from '@/config/api';

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

type Props = {
  visible: boolean;
  product: Product | null;
  onClose: () => void;
  onEdit?: (p: any) => void;
};

export default function ProductDetailScreen({ visible, product, onClose, onEdit }: Props) {
  const cardBackground = useThemeColor({ light: Colors.light.background, dark: Colors.dark.background }, 'background');
  const borderColor = useThemeColor({ light: Colors.light.productCardBorder, dark: Colors.dark.productCardBorder }, 'background');
  const optionBg = useThemeColor({ light: Colors.light.mutedBackground, dark: Colors.dark.mutedBackground }, 'background');
  const mutedText = useThemeColor({ light: Colors.light.mutedText, dark: Colors.dark.mutedText }, 'text');
  const textColor = useThemeColor({}, 'text');
  const buttonBackgroundDefault = useThemeColor({ light: Colors.light.buttonBackgroundDefault, dark: Colors.dark.buttonBackgroundDefault }, 'background');
  const buttonTextDefault = useThemeColor({ light: Colors.light.buttonTextDefault, dark: Colors.dark.buttonTextDefault }, 'text');

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: cardBackground, borderColor }] }>
          <View style={styles.modalHeader}>
            <ThemedText type="subtitle" style={[styles.modalTitle, { color: textColor }]}>Product Details</ThemedText>
            <View style={styles.modalActionsRight}>
              <TouchableOpacity
                style={[styles.editButton, { backgroundColor: buttonBackgroundDefault }]}
                onPress={() => product && onEdit?.(product)}
              >
                <ThemedText style={[styles.editButtonText, { color: buttonTextDefault }]}>Edit</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity onPress={onClose}>
                <ThemedText style={[styles.closeButton, { color: mutedText }]}>✕</ThemedText>
              </TouchableOpacity>
            </View>
          </View>

          {product && (
            <ScrollView contentContainerStyle={styles.detailContent}>
              {product.image_url ? (
                <Image source={{ uri: `${API_BASE_URL}${product.image_url}` }} style={[styles.detailImage, { backgroundColor: optionBg }]} />
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
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalActionsRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 24,
  },
  detailContent: {
    paddingVertical: 20,
  },
  detailImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  detailRow: {
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
