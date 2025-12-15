import { useState, useEffect } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, TextInput, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ThemedText } from '@/components/ui/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';
import { API_ENDPOINTS, API_BASE_URL } from '@/config/api';

export default function AddProductScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const isEditing = !!params.id;
  const editingProductId = params.id as string;

  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({ light: '#374151', dark: '#9ca3af' }, 'text');
  
  const buttonBackgroundDefault = useThemeColor({ light: Colors.light.buttonBackgroundDefault, dark: Colors.dark.buttonBackgroundDefault }, 'background');
  const buttonBackgroundSelected = useThemeColor({ light: Colors.light.buttonBackgroundSelected, dark: Colors.dark.buttonBackgroundSelected }, 'background');
  const buttonTextDefault = useThemeColor({ light: Colors.light.buttonTextDefault, dark: Colors.dark.buttonTextDefault }, 'text');
  const buttonTextSelected = useThemeColor({ light: Colors.light.buttonTextSelected, dark: Colors.dark.buttonTextSelected }, 'text');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [location, setLocation] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEditing) {
      setName(params.name as string || '');
      setDescription(params.description as string || '');
      setCategory(params.category as string || '');
      setQuantity(params.quantity ? String(params.quantity) : '');
      setExpiryDate(params.expiry_date as string || '');
      setLocation(params.location as string || '');
      
      if (params.image_url && params.image_url !== 'null' && params.image_url !== 'undefined') {
        setImageUri(`${API_BASE_URL}${params.image_url}`);
      }
    }
  }, [params]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please fill in product name');
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      const isLocalImage = imageUri && !imageUri.startsWith('http');

      if (isLocalImage) {
        const formData: any = new FormData();
        formData.append('name', name);
        formData.append('description', description);
        formData.append('category', category);
        formData.append('quantity', quantity);
        formData.append('expiry_date', expiryDate);
        formData.append('location', location);

        const uri = imageUri as string;
        const filename = uri.split('/').pop() || `photo.jpg`;
        const match = filename.match(/\.([a-zA-Z0-9]+)$/);
        const ext = match ? match[1] : 'jpg';
        const type = `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        // @ts-ignore - FormData file object for React Native
        formData.append('image', { uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''), name: filename, type });

        if (isEditing) {
          response = await fetch(`${API_ENDPOINTS.products}/${editingProductId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
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
        const payload: any = {
          name,
          description,
          category,
          quantity,
          expiry_date: expiryDate,
          location,
        };

        if (isEditing) {
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
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Permission to access photos is required to pick an image.');
      return;
    }

    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    
    // @ts-ignore
    let pickedUri = null;
    // @ts-ignore
    if (res?.assets && res.assets.length > 0) pickedUri = res.assets[0].uri;
    // @ts-ignore
    if (!pickedUri && res?.uri) pickedUri = res.uri;
    
    if (pickedUri) setImageUri(pickedUri);
  };

  return (
    <>
      <Stack.Screen options={{ title: isEditing ? 'Edit Product' : 'Add Product' }} />
      <ScrollView style={[styles.container, { backgroundColor: background }]} contentContainerStyle={styles.content}>
        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Product Name *</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
            value={name}
            onChangeText={setName}
            placeholder="Enter product name"
            placeholderTextColor={secondaryText}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Description (Optional)</ThemedText>
          <TextInput
            style={[styles.input, styles.textArea, { backgroundColor: cardBackground, borderColor, color: textColor }]}
            value={description}
            onChangeText={setDescription}
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
              onPress={pickImage}>
              <ThemedText style={[styles.imagePickButtonText, { color: buttonTextDefault }]}>Choose Image</ThemedText>
            </TouchableOpacity>
            {imageUri ? (
              <Image source={{ uri: imageUri }} style={styles.imagePreview} />
            ) : null}
          </View>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Category</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
            value={category}
            onChangeText={setCategory}
            placeholder="Category"
            placeholderTextColor={secondaryText}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Quantity</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            placeholderTextColor={secondaryText}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Expiry Date (YYYY-MM-DD)</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
            value={expiryDate}
            onChangeText={setExpiryDate}
            placeholder="2025-12-31"
            placeholderTextColor={secondaryText}
          />
        </View>

        <View style={styles.inputGroup}>
          <ThemedText style={[styles.inputLabel, { color: mutedText }]}>Location</ThemedText>
          <TextInput
            style={[styles.input, { backgroundColor: cardBackground, borderColor, color: textColor }]}
            value={location}
            onChangeText={setLocation}
            placeholder="Aisle 3, Shelf B"
            placeholderTextColor={secondaryText}
          />
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.cancelButton, { backgroundColor: buttonBackgroundDefault }]}
            onPress={() => router.back()}>
            <ThemedText style={[styles.cancelButtonText, { color: buttonTextDefault }]}>Cancel</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: buttonBackgroundSelected }, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSave}
            disabled={isSubmitting}>
            <ThemedText style={[styles.submitButtonText, { color: buttonTextSelected }]}>
              {isSubmitting ? (isEditing ? 'Saving...' : 'Adding...') : (isEditing ? 'Save Changes' : 'Add Product')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
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
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 40,
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
});
