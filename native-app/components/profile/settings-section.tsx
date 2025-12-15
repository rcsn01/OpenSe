import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Colors } from '@/constants/theme';
import { setPreferredColorScheme } from '@/hooks/use-color-scheme';
import ProductQrModal from '@/components/product-qr-screen';

interface Props {
  pref: 'light' | 'dark' | 'system';
  setPref: (pref: 'light' | 'dark' | 'system') => void;
}

export function SettingsSection({ pref, setPref }: Props) {
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const tint = useThemeColor({}, 'tint');
  const mutedText = useThemeColor({ light: Colors.light.mutedText, dark: Colors.dark.mutedText }, 'text');
  
  const buttonBackgroundSelected = useThemeColor({ light: Colors.light.buttonBackgroundSelected, dark: Colors.dark.buttonBackgroundSelected }, 'background');
  const buttonBackgroundDefault = useThemeColor({ light: Colors.light.buttonBackgroundDefault, dark: Colors.dark.buttonBackgroundDefault }, 'background');
  const buttonTextSelected = useThemeColor({ light: Colors.light.buttonTextSelected, dark: Colors.dark.buttonTextSelected }, 'text');
  const buttonTextDefault = useThemeColor({ light: Colors.light.buttonTextDefault, dark: Colors.dark.buttonTextDefault }, 'text');
  const linkColor = useThemeColor({ light: '#667eea', dark: '#667eea' }, 'text');

  const [isQrModalVisible, setIsQrModalVisible] = useState(false);

  return (
    <View style={styles.section}>
      <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>
        Settings
      </ThemedText>

      <View style={[styles.infoCard, { backgroundColor: cardBackground, borderColor }]}> 
        <View style={[styles.infoItem, { borderBottomColor: useThemeColor({ light: '#f3f4f6', dark: '#111827' }, 'background') }]}>
          <ThemedText style={styles.infoLabel}>Theme</ThemedText>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: pref === 'light' ? buttonBackgroundSelected : buttonBackgroundDefault },
              ]}
              onPress={async () => { await setPreferredColorScheme('light'); setPref('light'); }}
            >
              <ThemedText style={[styles.themeOptionText, pref === 'light' ? { color: buttonTextSelected } : { color: buttonTextDefault } ]}>{'Light'}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: pref === 'dark' ? buttonBackgroundSelected : buttonBackgroundDefault },
              ]}
              onPress={async () => { await setPreferredColorScheme('dark'); setPref('dark'); }}
            >
              <ThemedText style={[styles.themeOptionText, pref === 'dark' ? { color: buttonTextSelected } : { color: buttonTextDefault } ]}>{'Dark'}</ThemedText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { backgroundColor: pref === 'system' ? buttonBackgroundSelected : buttonBackgroundDefault },
              ]}
              onPress={async () => { await setPreferredColorScheme('system'); setPref('system'); }}
            >
              <ThemedText style={[styles.themeOptionText, pref === 'system' ? { color: buttonTextSelected } : { color: buttonTextDefault } ]}>{'System'}</ThemedText>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.infoItem, { borderBottomWidth: 0 }]} 
          onPress={() => setIsQrModalVisible(true)}
        >
          <ThemedText style={styles.infoLabel}>Product QR Codes</ThemedText>
          <ThemedText style={[styles.infoValue, { color: linkColor }]}>View</ThemedText>
        </TouchableOpacity>
      </View>

      <ProductQrModal visible={isQrModalVisible} onClose={() => setIsQrModalVisible(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 12,
    fontSize: 16,
  },
  infoCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
  },
  infoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  infoLabel: {
    opacity: 0.6,
    fontSize: 14,
  },
  infoValue: {
    fontWeight: '600',
    fontSize: 14,
  },
  themeOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeOptionText: {
    fontSize: 14,
  },
});
