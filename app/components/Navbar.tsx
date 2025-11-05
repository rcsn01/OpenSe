import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Link } from 'expo-router';
import { ThemedText } from '@/components/themed-text';

export function Navbar() {
  return (
    <View style={styles.container}>
      <Link href="/">
        <ThemedText type="subtitle">Home</ThemedText>
      </Link>
      <Link href="/products">
        <ThemedText type="subtitle">Products</ThemedText>
      </Link>
      <Link href="/scanner">
        <ThemedText type="subtitle">Scan</ThemedText>
      </Link>
      <Link href="/login">
        <ThemedText type="subtitle">Login</ThemedText>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 16,
    padding: 12,
    justifyContent: 'space-around',
  },
});

export default Navbar;
