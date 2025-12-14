import { useState, useEffect } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Alert, TextInput, Modal, ScrollView, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ui/themed-text';
import ProductCard from '@/components/products/product-card';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';
import * as ImagePicker from 'expo-image-picker';

interface Product {
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
}

type FilterType = 'all' | 'empty' | 'low' | 'in-stock';

export default function ProductsScreen() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const tint = useThemeColor({}, 'tint');
  const buttonBackgroundDefault = useThemeColor({ light: Colors.light.buttonBackgroundDefault, dark: Colors.dark.buttonBackgroundDefault }, 'background');
  const buttonBackgroundSelected = useThemeColor({ light: Colors.light.buttonBackgroundSelected, dark: Colors.dark.buttonBackgroundSelected }, 'background');
  const buttonTextDefault = useThemeColor({ light: Colors.light.buttonTextDefault, dark: Colors.dark.buttonTextDefault }, 'text');
  const buttonTextSelected = useThemeColor({ light: Colors.light.buttonTextSelected, dark: Colors.dark.buttonTextSelected }, 'text');
  const optionBg = useThemeColor({ light: '#f3f4f6', dark: '#111827' }, 'background');
  const secondaryText = useThemeColor({ light: '#374151', dark: '#9ca3af' }, 'text');
  const activeTextColor = useThemeColor({ light: '#fff', dark: '#000' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const badgeBg = useThemeColor({ light: '#e0e7ff', dark: '#111827' }, 'background');
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Filter states
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<FilterType>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeDropdown, setActiveDropdown] = useState<'none' | 'location' | 'status' | 'category'>('none');

  const [newProduct, setNewProduct] = useState({
    name: '',
    description: '',
    category: '',
    quantity: '',
    expiry_date: '',
    location: '',
  });
  const [productImageUri, setProductImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const getImageUri = (path?: string | null) => {
    if (!path) return null;
    // Ensure path already begins with /uploads or similar
    return `${API_BASE_URL}${path}`;
  };

  const locations = ['All', ...Array.from(new Set(products.map(p => p.location).filter(Boolean) as string[]))].sort();
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category).filter(Boolean) as string[]))].sort();
  const statuses: { label: string; value: FilterType }[] = [
    { label: 'All Statuses', value: 'all' },
    { label: 'In Stock', value: 'in-stock' },
    { label: 'Low Stock', value: 'low' },
    { label: 'Out of Stock', value: 'empty' },
  ];

  const applyFilters = (
    productList: Product[],
    location: string,
    status: FilterType,
    category: string
  ) => {
    let result = productList;

    if (location !== 'All') {
      result = result.filter(p => p.location === location);
    }

    if (status !== 'all') {
      result = result.filter(p => p.latestStatus === status);
    }

    if (category !== 'All') {
      result = result.filter(p => p.category === category);
    }

    setFilteredProducts(result);
  };

  const fetchProducts = async () => {
    if (!token) return;
    
    try {
      // Fetch products
      const productsResponse = await fetch(API_ENDPOINTS.products, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (productsResponse.status === 401) {
        await logout();
        return;
      }

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
        
        // Map latest status to each product (product_id is a UUID string)
        const latestStatusMap = new Map<string, { status: string, created_at: string }>();
        reportsData.forEach((report: any) => {
          const pid = String(report.product_id);
          const existing = latestStatusMap.get(pid);
          if (!existing || new Date(report.created_at) > new Date(existing.created_at)) {
            latestStatusMap.set(pid, {
              status: report.status,
              created_at: report.created_at,
            });
          }
        });

        // Add latest status to products
        const productsWithStatus = productsData.map((product: Product) => {
          const latestReport = latestStatusMap.get(String(product.id));
          return {
            ...product,
            latestStatus: latestReport?.status || null,
          };
        });

        setProducts(productsWithStatus);
        applyFilters(productsWithStatus, selectedLocation, selectedStatus, selectedCategory);
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

  const handleFilterChange = (type: 'location' | 'status' | 'category', value: any) => {
    let newLocation = selectedLocation;
    let newStatus = selectedStatus;
    let newCategory = selectedCategory;

    if (type === 'location') {
      newLocation = value;
      setSelectedLocation(value);
    } else if (type === 'status') {
      newStatus = value;
      setSelectedStatus(value);
    } else if (type === 'category') {
      newCategory = value;
      setSelectedCategory(value);
    }

    applyFilters(products, newLocation, newStatus, newCategory);
    setActiveDropdown('none');
  };

  useEffect(() => {
    if (token) {
      fetchProducts();
    }
  }, [token]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleAddProduct = async () => {
    if (!newProduct.name.trim()) {
      Alert.alert('Error', 'Please fill in product name');
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      const isLocalImage = productImageUri && !productImageUri.startsWith('http');

      if (isLocalImage) {
        const formData: any = new FormData();
        formData.append('name', newProduct.name);
        formData.append('description', newProduct.description);
        formData.append('category', newProduct.category);
        formData.append('quantity', newProduct.quantity);
        formData.append('expiry_date', newProduct.expiry_date);
        formData.append('location', newProduct.location);

        const uri = productImageUri as string;
        const filename = uri.split('/').pop() || `photo.jpg`;
        const match = filename.match(/\.([a-zA-Z0-9]+)$/);
        const ext = match ? match[1] : 'jpg';
        const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        // @ts-ignore - FormData file object for React Native
        formData.append('image', { uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), name: filename, type });

        if (isEditing && editingProductId) {
          response = await fetch(`${API_ENDPOINTS.products}/${editingProductId}`, {
            method: 'PUT',
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
            },
            body: formData,
          });
        }
      } else {
        // No local image picked (either no image or existing remote image kept)
        const payload: any = { ...newProduct };

        if (isEditing && editingProductId) {
          response = await fetch(`${API_ENDPOINTS.products}/${editingProductId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        } else {
          response = await fetch(API_ENDPOINTS.products, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          });
        }
      }

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Failed to save product');
      }

      Alert.alert('Success', isEditing ? 'Product updated successfully!' : 'Product added successfully!');
      setModalVisible(false);
      setIsEditing(false);
      setEditingProductId(null);
      setNewProduct({ name: '', description: '', category: '', quantity: '', expiry_date: '', location: '' });
      setProductImageUri(null);
      fetchProducts();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProductPress = (product: Product) => {
    router.push(`/product/${product.id}`);
  };

  const handleStartEdit = (product: Product) => {
    // Prefill the add-product modal for editing
    setSelectedProduct(product);
    setIsEditing(true);
    setEditingProductId(String(product.id));
    setNewProduct({
      name: product.name || '',
      description: product.description || '',
      category: product.category || '',
      quantity: product.quantity != null ? String(product.quantity) : '',
      expiry_date: product.expiry_date || '',
      location: product.location || '',
    });
    // Use remote image URI for preview; when submitting, we only upload if user picked a new local file
    setProductImageUri(getImageUri(product.image_url) || null);
    setModalVisible(true);
  };

  const renderProduct = ({ item }: { item: Product }) => (
    <ProductCard product={item} onPress={handleProductPress} />
  );

  if (loading) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: background }]}> 
        <ActivityIndicator size="large" color={tint} />
        <ThemedText style={[styles.loadingText, { color: mutedText }]}>Loading products...</ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: background }]}> 
      <View style={[styles.header, { backgroundColor: cardBackground, borderBottomColor: borderColor, paddingTop: Platform.OS === 'ios' ? (insets.top + 12) : 12 }]}>
        <View style={styles.headerTop}>
          <View>
            <ThemedText type="title" style={[styles.title, { color: textColor }]}>Products</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedText }] }>
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'}
            </ThemedText>
          </View>
        </View>
      </View>
      
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <>
            <View style={[styles.statsRow, { backgroundColor: cardBackground, borderColor, marginTop: 0, marginBottom: 16 }]}>
              <View style={styles.statItem}>
                <ThemedText style={[styles.statLabel, { color: mutedText }]}>In Stock</ThemedText>
                <ThemedText style={[styles.statValue, { color: textColor }]}>
                  {products.filter(p => p.latestStatus === 'in-stock').length}
                </ThemedText>
              </View>
              <View style={[styles.statSeparator, { backgroundColor: borderColor }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statLabel, { color: mutedText }]}>Low</ThemedText>
                <ThemedText style={[styles.statValue, { color: textColor }]}>
                  {products.filter(p => p.latestStatus === 'low').length}
                </ThemedText>
              </View>
              <View style={[styles.statSeparator, { backgroundColor: borderColor }]} />
              <View style={styles.statItem}>
                <ThemedText style={[styles.statLabel, { color: mutedText }]}>Empty</ThemedText>
                <ThemedText style={[styles.statValue, { color: textColor }]}>
                  {products.filter(p => p.latestStatus === 'empty').length}
                </ThemedText>
              </View>
            </View>

            <View style={styles.filtersContainer}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                {/* Location Filter */}
                <TouchableOpacity 
                  style={[styles.filterChip, { backgroundColor: selectedLocation !== 'All' ? buttonBackgroundSelected : cardBackground, borderColor }]}
                  onPress={() => setActiveDropdown('location')}
                >
                  <ThemedText style={[styles.filterChipLabel, { color: mutedText }]}>Location:</ThemedText>
                  <ThemedText style={[styles.filterChipValue, { color: textColor }]}>
                    {selectedLocation.length > 15 ? selectedLocation.substring(0, 15) + '...' : selectedLocation}
                  </ThemedText>
                  <ThemedText style={[styles.filterArrow, { color: mutedText }]}>▼</ThemedText>
                </TouchableOpacity>

                {/* Status Filter */}
                <TouchableOpacity 
                  style={[styles.filterChip, { backgroundColor: selectedStatus !== 'all' ? buttonBackgroundSelected : cardBackground, borderColor }]}
                  onPress={() => setActiveDropdown('status')}
                >
                  <ThemedText style={[styles.filterChipLabel, { color: mutedText }]}>Status:</ThemedText>
                  <ThemedText style={[styles.filterChipValue, { color: textColor }]}>
                    {statuses.find(s => s.value === selectedStatus)?.label || 'All'}
                  </ThemedText>
                  <ThemedText style={[styles.filterArrow, { color: mutedText }]}>▼</ThemedText>
                </TouchableOpacity>

                {/* Category Filter */}
                <TouchableOpacity 
                  style={[styles.filterChip, { backgroundColor: selectedCategory !== 'All' ? buttonBackgroundSelected : cardBackground, borderColor }]}
                  onPress={() => setActiveDropdown('category')}
                >
                  <ThemedText style={[styles.filterChipLabel, { color: mutedText }]}>Category:</ThemedText>
                  <ThemedText style={[styles.filterChipValue, { color: textColor }]}>
                    {selectedCategory.length > 15 ? selectedCategory.substring(0, 15) + '...' : selectedCategory}
                  </ThemedText>
                  <ThemedText style={[styles.filterArrow, { color: mutedText }]}>▼</ThemedText>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <ThemedText style={styles.emptyText}>📦</ThemedText>
            <ThemedText type="defaultSemiBold" style={[styles.emptyTitle, { color: textColor }]}>
              No products found
            </ThemedText>
            <ThemedText style={[styles.emptySubtitle, { color: mutedText }] }>
              Try adjusting your filters
            </ThemedText>
          </View>
        }
      />

      {/* Filter Selection Modal */}
      <Modal
        visible={activeDropdown !== 'none'}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setActiveDropdown('none')}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActiveDropdown('none')}
        >
          <View style={[styles.dropdownModal, { backgroundColor: cardBackground }]}>
            <View style={[styles.dropdownHeader, { borderBottomColor: borderColor }]}>
              <ThemedText type="subtitle" style={{ color: textColor }}>
                Select {activeDropdown === 'location' ? 'Location' : activeDropdown === 'status' ? 'Status' : 'Category'}
              </ThemedText>
              <TouchableOpacity onPress={() => setActiveDropdown('none')}>
                <ThemedText style={{ color: mutedText, fontSize: 20 }}>✕</ThemedText>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.dropdownList}>
              {activeDropdown === 'location' && locations.map((loc) => (
                <TouchableOpacity
                  key={loc}
                  style={[styles.dropdownItem, selectedLocation === loc && { backgroundColor: buttonBackgroundSelected }]}
                  onPress={() => handleFilterChange('location', loc)}
                >
                  <ThemedText style={{ color: selectedLocation === loc ? buttonTextSelected : textColor }}>{loc}</ThemedText>
                  {selectedLocation === loc && <ThemedText style={{ color: buttonTextSelected }}>✓</ThemedText>}
                </TouchableOpacity>
              ))}
              
              {activeDropdown === 'status' && statuses.map((status) => (
                <TouchableOpacity
                  key={status.value}
                  style={[styles.dropdownItem, selectedStatus === status.value && { backgroundColor: buttonBackgroundSelected }]}
                  onPress={() => handleFilterChange('status', status.value)}
                >
                  <ThemedText style={{ color: selectedStatus === status.value ? buttonTextSelected : textColor }}>{status.label}</ThemedText>
                  {selectedStatus === status.value && <ThemedText style={{ color: buttonTextSelected }}>✓</ThemedText>}
                </TouchableOpacity>
              ))}

              {activeDropdown === 'category' && categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.dropdownItem, selectedCategory === cat && { backgroundColor: buttonBackgroundSelected }]}
                  onPress={() => handleFilterChange('category', cat)}
                >
                  <ThemedText style={{ color: selectedCategory === cat ? buttonTextSelected : textColor }}>{cat}</ThemedText>
                  {selectedCategory === cat && <ThemedText style={{ color: buttonTextSelected }}>✓</ThemedText>}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <TouchableOpacity style={[styles.addButton, { backgroundColor: buttonBackgroundSelected }]} onPress={() => { setIsEditing(false); setEditingProductId(null); setNewProduct({ name: '', description: '', category: '', quantity: '', expiry_date: '', location: '' }); setProductImageUri(null); setModalVisible(true); }}>
        <ThemedText style={[styles.addButtonText, { color: buttonTextSelected }]}>+ Add Product</ThemedText>
      </TouchableOpacity>

      {/* Add Product Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackground }] }>
            <ScrollView contentContainerStyle={styles.modalScrollContent} keyboardShouldPersistTaps="handled">
              <View style={styles.modalHeader}>
                <ThemedText type="subtitle" style={[styles.modalTitle, { color: textColor }]}>{isEditing ? 'Edit Product' : 'Add New Product'}</ThemedText>
                  <TouchableOpacity onPress={() => { setModalVisible(false); setIsEditing(false); setEditingProductId(null); }}>
                    <ThemedText style={[styles.closeButton, { color: mutedText }]}>✕</ThemedText>
                  </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Product Name *</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
                  value={newProduct.name}
                  onChangeText={(text) => setNewProduct({ ...newProduct, name: text })}
                  placeholder="Enter product name"
                  placeholderTextColor={secondaryText}
                />
              </View>

              {/* QR code removed: product UUID will be used as the QR identifier */}

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Description (Optional)</ThemedText>
                <TextInput
                  style={[styles.input, styles.textArea, { backgroundColor: cardBackground, borderColor, color: textColor }]}
                  value={newProduct.description}
                  onChangeText={(text) => setNewProduct({ ...newProduct, description: text })}
                  placeholder="Enter product description"
                  placeholderTextColor={secondaryText}
                  multiline
                  numberOfLines={4}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Image (optional)</ThemedText>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <TouchableOpacity
    style={[styles.imagePickButton, { backgroundColor: buttonBackgroundDefault }]}
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
            <ThemedText style={[styles.imagePickButtonText, { color: buttonTextDefault }]}>Choose Image</ThemedText>
                  </TouchableOpacity>
                  {productImageUri ? (
                    <Image source={{ uri: productImageUri }} style={styles.imagePreview} />
                  ) : null}
                </View>
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Category</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
                  value={newProduct.category}
                  onChangeText={(text) => setNewProduct({ ...newProduct, category: text })}
                  placeholder="Category"
                  placeholderTextColor={secondaryText}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Quantity</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
                  value={newProduct.quantity}
                  onChangeText={(text) => setNewProduct({ ...newProduct, quantity: text })}
                  placeholder="0"
                  placeholderTextColor={secondaryText}
                  keyboardType="numeric"
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Expiry Date (YYYY-MM-DD)</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
                  value={newProduct.expiry_date}
                  onChangeText={(text) => setNewProduct({ ...newProduct, expiry_date: text })}
                  placeholder="2025-12-31"
                  placeholderTextColor={secondaryText}
                />
              </View>

              <View style={styles.inputGroup}>
                <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Location</ThemedText>
                <TextInput
                  style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
                  value={newProduct.location}
                  onChangeText={(text) => setNewProduct({ ...newProduct, location: text })}
                  placeholder="Aisle 3, Shelf B"
                  placeholderTextColor={secondaryText}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelButton, { backgroundColor: buttonBackgroundDefault }]}
                  onPress={() => { setModalVisible(false); setIsEditing(false); setEditingProductId(null); setNewProduct({ name: '', description: '', category: '', quantity: '', expiry_date: '', location: '' }); setProductImageUri(null); }}>
                  <ThemedText style={[styles.cancelButtonText, { color: buttonTextDefault }]}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: buttonBackgroundSelected }, isSubmitting && styles.submitButtonDisabled]}
                  onPress={handleAddProduct}
                  disabled={isSubmitting}>
                  <ThemedText style={[styles.submitButtonText, { color: buttonTextSelected }]}>
                    {isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Product')}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
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
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
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
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterButtonIcon: {
    fontSize: 10,
  },
  filterDropdown: {
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    padding: 12,
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  statSeparator: {
    width: 1,
    height: '100%',
  },
  filterOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  filterOptionActive: {
    backgroundColor: '#ede9fe',
  },
  filterOptionText: {
    fontSize: 14,
  },
  filterOptionTextActive: {
    color: '#667eea',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
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
    gap: 8,
  },
  statusBadgeInline: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  productName: {
    fontSize: 18,
    flex: 1,
    marginRight: 12,
  },
  qrBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  qrText: {
    fontSize: 12,
    fontWeight: '600',
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
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productDate: {
    fontSize: 12,
    opacity: 0.5,
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
  },
  emptySubtitle: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    left: 20,
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
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 20,
    maxHeight: '85%',
  },
  modalScrollContent: {
    paddingBottom: 20,
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
  closeButton: {
    fontSize: 24,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 8,
  },
  editButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
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
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  submitButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  imagePickButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  imagePickButtonText: {
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
  filtersContainer: {
    marginBottom: 16,
  },
  filtersScroll: {
    gap: 8,
    paddingRight: 16,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  filterChipLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  filterChipValue: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterArrow: {
    fontSize: 10,
  },
  dropdownModal: {
    width: '80%',
    maxHeight: '60%',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  dropdownList: {
    maxHeight: 300,
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
});
