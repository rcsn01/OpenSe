import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import { useRouter, useSearchParams } from 'expo-router';
import axios from 'axios';
import { API_BASE } from '@/constants/api';

export default function ProductDetail() {
  const { qrCode } = useSearchParams();
  const [product, setProduct] = useState<any>(null);
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('empty');

  useEffect(() => {
    if (!qrCode) return;
    axios
      .get(`${API_BASE}/api/products/${encodeURIComponent(String(qrCode))}`)
      .then((res) => setProduct(res.data))
      .catch((e) => console.warn('load product', e.message));
  }, [qrCode]);

  function submitReport() {
    axios
      .post(`${API_BASE}/api/reports`, { qrCode, status, notes })
      .then(() => Alert.alert('Report submitted'))
      .catch((e) => Alert.alert('Failed', e.message));
  }

  if (!product) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{product.name}</Text>
      <Text style={styles.subtitle}>{product.qr_code}</Text>
      <Text style={styles.desc}>{product.description}</Text>

      <View style={styles.form}>
        <Text>Status</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Button title="Empty" onPress={() => setStatus('empty')} />
          <Button title="Near-empty" onPress={() => setStatus('near-empty')} />
          <Button title="OK" onPress={() => setStatus('ok')} />
        </View>
        <TextInput
          style={styles.input}
          placeholder="Notes (optional)"
          value={notes}
          onChangeText={setNotes}
        />
        <Button title="Submit report" onPress={submitReport} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1 },
  title: { fontSize: 20, fontWeight: '700' },
  subtitle: { color: '#666', marginBottom: 8 },
  desc: { marginBottom: 12 },
  form: { marginTop: 12, gap: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', padding: 8, marginVertical: 8 },
});
