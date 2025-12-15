import React, { useEffect, useState } from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/ui/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { API_ENDPOINTS } from '@/config/api';
import { useAuth } from '@/contexts/AuthContext';
import { Colors } from '@/constants/theme';

interface UserWithRoles {
  id: number;
  username: string;
  email: string;
  created_at: string;
  roles: string[];
}

export default function TeamsScreen() {
  const { token } = useAuth();
  const background = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({ light: '#fff', dark: '#0b1220' }, 'background');
  const borderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const mutedText = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const textColor = useThemeColor({}, 'text');
  const tint = useThemeColor({}, 'tint');

  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      const res = await fetch(API_ENDPOINTS.roles, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const renderItem = ({ item }: { item: UserWithRoles }) => (
    <View style={[styles.card, { backgroundColor: cardBackground, borderColor }]}>
      <View style={styles.cardHeader}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.avatarPlaceholder, { backgroundColor: tint }]}>
            <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>
              {item.username.charAt(0).toUpperCase()}
            </ThemedText>
          </View>
          <View>
            <ThemedText type="defaultSemiBold" style={{ fontSize: 16 }}>{item.username}</ThemedText>
            <ThemedText style={{ fontSize: 12, color: mutedText }}>{item.email}</ThemedText>
          </View>
        </View>
      </View>
      
      <View style={[styles.divider, { backgroundColor: borderColor }]} />
      
      <View style={styles.rolesContainer}>
        <ThemedText style={[styles.roleLabel, { color: mutedText }]}>Roles:</ThemedText>
        <View style={styles.rolesList}>
          {item.roles && item.roles.length > 0 ? (
            item.roles.map((role, index) => (
              <View key={index} style={[styles.roleBadge, { backgroundColor: tint + '20' }]}>
                <ThemedText style={[styles.roleText, { color: tint }]}>{role}</ThemedText>
              </View>
            ))
          ) : (
            <ThemedText style={{ color: mutedText, fontStyle: 'italic' }}>No roles assigned</ThemedText>
          )}
        </View>
      </View>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: background }]}>
      <Stack.Screen options={{ title: 'Teams', headerBackTitle: 'Back' }} />
      
      {isLoading && !isRefreshing ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={tint} />
        </View>
      ) : error ? (
        <View style={styles.centerContainer}>
          <ThemedText style={{ color: 'red' }}>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          data={users}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchUsers(true)} />
          }
          ListEmptyComponent={
            <View style={styles.centerContainer}>
              <ThemedText style={{ color: mutedText }}>No users found.</ThemedText>
            </View>
          }
        />
      )}
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
    padding: 20,
  },
  listContent: {
    padding: 16,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    padding: 16,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: 1,
    width: '100%',
  },
  rolesContainer: {
    padding: 16,
    backgroundColor: 'rgba(0,0,0,0.02)',
  },
  roleLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  rolesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});
