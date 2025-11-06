import { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, ScrollView, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import * as ImagePicker from 'expo-image-picker';

interface Product {
  id: number;
  name: string;
  description: string;
  qr_code: string;
  created_at: string;
  latestStatus?: 'empty' | 'low' | 'in-stock' | null;
  category?: string | null;
  quantity?: number | null;
  expiry_date?: string | null;
  location?: string | null;
  image_url?: string | null;
}

type FilterType = 'all' | 'empty' | 'low' | 'in-stock';

export default function ProductsScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [filterDropdownVisible, setFilterDropdownVisible] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    qr_code: '',
    category: '',
    quantity: '',
    expiry_date: '',
    location: '',
  });
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchProducts = async () => {
    try {
      // Fetch products
      const productsResponse = await fetch(API_ENDPOINTS.products, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!productsResponse.ok) {
        throw new Error('Failed to fetch products');
      }

      const productsData = await productsResponse.json();

      // Fetch reports to get latest status for each product
      const reportsResponse = await fetch(API_ENDPOINTS.reports, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (reportsResponse.ok) {
        const reportsData = await reportsResponse.json();
        
        // Map latest status to each product
        const latestStatusMap = new Map<number, { status: string, created_at: string }>();
        reportsData.forEach((report: any) => {
          const existing = latestStatusMap.get(report.product_id);
          if (!existing || new Date(report.created_at) > new Date(existing.created_at)) {
            latestStatusMap.set(report.product_id, {
              status: report.status,
              created_at: report.created_at,
            });
          }
        });

        // Add latest status to products
        const productsWithStatus = productsData.map((product: Product) => {
          const latestReport = latestStatusMap.get(product.id);
          return {
            ...product,
            latestStatus: latestReport?.status || null,
          };
        });

        setProducts(productsWithStatus);
        applyFilter(productsWithStatus, selectedFilter);
      } else {
        setProducts(productsData);
        setFilteredProducts(productsData);
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load products');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilter = (productList: Product[], filter: FilterType) => {
    if (filter === 'all') {
      setFilteredProducts(productList);
    } else {
      const filtered = productList.filter(p => p.latestStatus === filter);
      setFilteredProducts(filtered);
    }
  };

  const handleFilterChange = (filter: FilterType) => {
    setSelectedFilter(filter);
    applyFilter(products, filter);
    setFilterDropdownVisible(false);
  };

  const getFilterLabel = (filter: FilterType): string => {
    switch (filter) {
      case 'all': return 'All Products';
      case 'empty': return 'Out of Stock';
      case 'low': return 'Low Stock';
      case 'in-stock': return 'In Stock';
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim() || !newProduct.qr_code.trim()) {
      Alert.alert('Error', 'Please fill in product name and QR code');
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      if (productImageUri) {
        const formData: any = new FormData();
        formData.append('name', newProduct.name);
        formData.append('qr_code', newProduct.qr_code);
        formData.append('description', newProduct.description);
        formData.append('category', newProduct.category);
        formData.append('quantity', newProduct.quantity);
        formData.append('expiry_date', newProduct.expiry_date);
        formData.append('location', newProduct.location);

        const uri = productImageUri;
        const filename = uri.split('/').pop() || `photo.jpg`;
        const match = filename.match(/\.([a-zA-Z0-9]+)$/);
        const ext = match ? match[1] : 'jpg';
        const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        // @ts-ignore - FormData file object for React Native
        formData.append('image', { uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), name: filename, type });

        response = await fetch(API_ENDPOINTS.products, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            // Let fetch set Content-Type with boundary
          },
          body: formData,
        });
      } else {
        response = await fetch(API_ENDPOINTS.products, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(newProduct),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add product');
      }

  Alert.alert('Success', 'Product added successfully!');
  setModalVisible(false);
  setNewProduct({ name: '', description: '', qr_code: '', category: '', quantity: '', expiry_date: '', location: '' });
  setProductImageUri(null);
  fetchProducts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductPress = (product: Product) => {
    setSelectedProduct(product);
    setDetailModalVisible(true);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity style={styles.productCard} onPress={() => handleProductPress(item)}>
      <View style={styles.productHeader}>
        <ThemedText type="defaultSemiBold" style={styles.productName}>
          {item.name}
        </ThemedText>
        {item.image_url ? (
          <Image source={{ uri: `${API_BASE_URL}${item.image_url}` }} style={styles.productThumb} />
        ) : null}
        <View style={styles.qrBadge}>
          <ThemedText style={styles.qrText}>QR: {item.qr_code}</ThemedText>
        </View>
      </View>
      {item.description ? (
        <ThemedText style={styles.productDescription}>{item.description}</ThemedText>
      ) : null}
      <View style={styles.productFooter}>
        <ThemedText style={styles.productDate}>
          Added {new Date(item.created_at).toLocaleDateString()}
        </ThemedText>
        {item.latestStatus && (
          <View style={[
            styles.statusBadge,
            item.latestStatus === 'empty' && styles.statusEmpty,
            item.latestStatus === 'low' && styles.statusLow,
            item.latestStatus === 'in-stock' && styles.statusInStock,
          ]}>
            <ThemedText style={styles.statusText}>
              {item.latestStatus === 'empty' ? 'Empty' : 
               item.latestStatus === 'low' ? 'Low' : 'In Stock'}
            </ThemedText>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#667eea" />
        <ThemedText style={styles.loadingText}>Loading products...</ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText type="title" style={styles.title}>Products</ThemedText>
            <ThemedText style={styles.subtitle}>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </ThemedText>
          </View>
          
          <TouchableOpacity 
            style={styles.filterButton}
            onPress={() => setFilterDropdownVisible(!filterDropdownVisible)}>
            <ThemedText style={styles.filterButtonText}>
              {getFilterLabel(selectedFilter)}
            </ThemedText>
            <ThemedText style={styles.filterButtonIcon}>▼</ThemedText>
          </TouchableOpacity>
        </View>

        {filterDropdownVisible && (
          <View style={styles.filterDropdown}>
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'all' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('all')}>
              <ThemedText style={[styles.filterOptionText, selectedFilter === 'all' && styles.filterOptionTextActive]}>
                All Products
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'empty' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('empty')}>
              <ThemedText style={[styles.filterOptionText, selectedFilter === 'empty' && styles.filterOptionTextActive]}>
                Out of Stock
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'low' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('low')}>
              <ThemedText style={[styles.filterOptionText, selectedFilter === 'low' && styles.filterOptionTextActive]}>
                Low Stock
              </ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filterOption, selectedFilter === 'in-stock' && styles.filterOptionActive]}
              onPress={() => handleFilterChange('in-stock')}>
              <ThemedText style={[styles.filterOptionText, selectedFilter === 'in-stock' && styles.filterOptionTextActive]}>
                In Stock
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </View>
      
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>📦</ThemedText>
            <ThemedText type="defaultSemiBold" style={styles.emptyTitle}>
              No products {selectedFilter !== 'all' ? 'in this category' : 'yet'}
            </ThemedText>
            <ThemedText style={styles.emptySubtitle}>
              {selectedFilter !== 'all' 
                ? 'Try selecting a different filter' 
                : 'Products will appear here once they\'re added to the system'}
            </ThemedText>
          </View>
        }
      />

      <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
        <ThemedText style={styles.addButtonText}>+ Add Product</ThemedText>
      </TouchableOpacity>

      {/* Product Detail Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={detailModalVisible}
        onRequestClose={() => setDetailModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>Product Details</ThemedText>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <ThemedText style={styles.closeButton}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            {selectedProduct && (
              <View style={styles.detailContent}>
                <ThemedText style={styles.detailLabel}>Product ID:</ThemedText>
                <ThemedText style={styles.detailValue}>{selectedProduct.id}</ThemedText>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Add Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <ThemedText type="subtitle" style={styles.modalTitle}>Add New Product</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <ThemedText style={styles.closeButton}>✕</ThemedText>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Product Name *</ThemedText>
              <TextInput
                style={styles.input}
                value={newProduct.name}
                onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                placeholder="Enter product name"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>QR Code *</ThemedText>
              <TextInput
                style={styles.input}
                value={newProduct.qr_code}
                onChangeText={(text) => setNewProduct({ ...newProduct, qr_code: text })}
                placeholder="Enter QR code"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Description (Optional)</ThemedText>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={newProduct.description}
                onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                placeholder="Enter product description"
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Image (optional)</ThemedText>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                  style={styles.imagePickButton}
                  onPress={async () => {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') {
                      Alert.alert('Permission required', 'Permission to access photos is required to pick an image.');
                      return;
                    }

                    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
                    // Handle different response shapes across SDK versions
                    // modern: { canceled: boolean, assets: [{ uri }] }
                    // older: { cancelled: boolean, uri }
                    // @ts-ignore
                    let pickedUri = null;
                    // @ts-ignore
                    if (res?.assets && res.assets.length > 0) pickedUri = res.assets[0].uri;
                    // @ts-ignore
                    if (!pickedUri && res?.uri) pickedUri = res.uri;
                    if (pickedUri) setProductImageUri(pickedUri);
                  }}>
                  <ThemedText style={styles.imagePickButtonText}>Choose Image</ThemedText>
                </TouchableOpacity>
                {productImageUri ? (
                  <Image source={{ uri: productImageUri }} style={styles.imagePreview} />
                ) : null}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Category</ThemedText>
              <TextInput
                style={styles.input}
                value={newProduct.category}
                onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
                placeholder="Category"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Quantity</ThemedText>
              <TextInput
                style={styles.input}
                value={newProduct.quantity}
                onChangeText={(text) => setNewProduct({ ...newProduct, quantity: text })}
                placeholder="0"
                placeholderTextColor="#9ca3af"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Expiry Date (YYYY-MM-DD)</ThemedText>
              <TextInput
                style={styles.input}
                value={newProduct.expiry_date}
                onChangeText={(text) => setNewProduct({ ...newProduct, expiry_date: text })}
                placeholder="2025-12-31"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.inputGroup}>
              <ThemedText style={styles.inputLabel}>Location</ThemedText>
              <TextInput
                style={styles.input}
                value={newProduct.location}
                onChangeText={(text) => setNewProduct({ ...newProduct, location: text })}
                placeholder="Aisle 3, Shelf B"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setModalVisible(false)}>
                <ThemedText style={styles.cancelButtonText}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleAddProduct}
                disabled={isSubmitting}>
                <ThemedText style={styles.submitButtonText}>
                  {isSubmitting ? 'Adding...' : 'Add Product'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  loadingText: {
    marginTop: 12,
    opacity: 0.7,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#000',
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    color: '#6b7280',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  filterButtonIcon: {
    fontSize: 10,
    color: '#6b7280',
  },
  filterDropdown: {
    marginTop: 12,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    overflow: 'hidden',
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  filterOptionActive: {
    backgroundColor: '#ede9fe',
  },
  filterOptionText: {
    fontSize: 14,
    color: '#374151',
  },
  filterOptionTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  productCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
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
  productName: {
    fontSize: 18,
    flex: 1,
    marginRight: 12,
    color: '#000',
  },
  qrBadge: {
    backgroundColor: '#e0e7ff',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qrText: {
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
  },
  productDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
    lineHeight: 20,
    color: '#6b7280',
  },
  productThumb: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginLeft: 12,
    backgroundColor: '#f3f4f6',
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDate: {
    fontSize: 12,
    opacity: 0.5,
    color: '#9ca3af',
  },
  statusBadge: {
    paddingHorizontal: 10,
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
    color: '#374151',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    marginBottom: 8,
    color: '#000',
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
    color: '#6b7280',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
    backgroundColor: '#667eea',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    fontSize: 24,
    color: '#6b7280',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#000',
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    backgroundColor: '#667eea',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  imagePickButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  imagePickButtonText: {
    color: '#374151',
    fontWeight: '600',
  },
  imagePreview: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginLeft: 12,
  },
  detailContent: {
    paddingVertical: 20,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000',
  },
});
