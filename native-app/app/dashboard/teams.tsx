import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, Alert } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/ui/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
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

interface Role {
  id: number;
  name: string;
  description: string;
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
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (refresh = false) => {
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError('');

    try {
      await Promise.all([fetchUsers(), fetchRoles()]);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchUsers = async () => {
    const res = await fetch(API_ENDPOINTS.roles, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to fetch users');
    const data = await res.json();
    setUsers(data);
  };

  const fetchRoles = async () => {
    try {
      const res = await fetch(`${API_ENDPOINTS.roles}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableRoles(data);
      }
    } catch (e) {
      console.error('Failed to fetch roles', e);
    }
  };

  const handleAddRole = (user: UserWithRoles) => {
    setSelectedUser(user);
    setModalVisible(true);
  };

  const confirmAddRole = async (roleName: string) => {
    if (!selectedUser) return;
    try {
      const res = await fetch(`${API_ENDPOINTS.roles}/${selectedUser.id}/roles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ roleName }),
      });

      if (!res.ok) throw new Error('Failed to add role');
      
      // Refresh users
      await fetchUsers();
      setModalVisible(false);
      setSelectedUser(null);
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  };

  const handleRemoveRole = async (userId: number, roleName: string) => {
    Alert.alert('Remove Role', `Are you sure you want to remove ${roleName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_ENDPOINTS.roles}/${userId}/roles/${roleName}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to remove role');
            fetchUsers();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

  const handleDeleteUser = async (user: UserWithRoles) => {
    Alert.alert('Delete User', `Are you sure you want to delete ${user.username}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const res = await fetch(`${API_ENDPOINTS.roles}/${user.id}`, {
              method: 'DELETE',
              headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('Failed to delete user');
            fetchUsers();
          } catch (err: any) {
            Alert.alert('Error', err.message);
          }
        },
      },
    ]);
  };

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
        <ScrollView 
          style={styles.container}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={() => fetchData(true)} />
          }
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={true}>
            <View>
              <View style={[styles.headerRow, { borderBottomColor: borderColor }]}>
                <ThemedText type="defaultSemiBold" style={[styles.headerCell, { width: 180 }]}>User</ThemedText>
                <ThemedText type="defaultSemiBold" style={[styles.headerCell, { width: 220 }]}>Email</ThemedText>
                <ThemedText type="defaultSemiBold" style={[styles.headerCell, { width: 250 }]}>Roles</ThemedText>
                <ThemedText type="defaultSemiBold" style={[styles.headerCell, { width: 60 }]}>Action</ThemedText>
              </View>
              
              {users.length === 0 ? (
                 <View style={{ padding: 20 }}>
                    <ThemedText style={{ color: mutedText }}>No users found.</ThemedText>
                 </View>
              ) : (
                users.map((item) => (
                  <View key={item.id} style={[styles.row, { borderBottomColor: borderColor }]}>
                    <View style={[styles.cell, { width: 180, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                      <View style={[styles.avatarSmall, { backgroundColor: tint }]}>
                        <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                          {item.username.charAt(0).toUpperCase()}
                        </ThemedText>
                      </View>
                      <ThemedText numberOfLines={1}>{item.username}</ThemedText>
                    </View>
                    <View style={[styles.cell, { width: 220, justifyContent: 'center' }]}>
                      <ThemedText style={{ color: mutedText }} numberOfLines={1}>{item.email}</ThemedText>
                    </View>
                    <View style={[styles.cell, { width: 250, flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' }]}>
                      {item.roles && item.roles.length > 0 ? (
                        item.roles.map((role, index) => (
                          <TouchableOpacity 
                            key={index} 
                            style={[styles.roleBadge, { backgroundColor: tint + '20' }]}
                            onPress={() => handleRemoveRole(item.id, role)}
                          >
                            <ThemedText style={[styles.roleText, { color: tint }]}>{role}</ThemedText>
                          </TouchableOpacity>
                        ))
                      ) : null}
                      <TouchableOpacity 
                        style={[styles.addRoleButton, { borderColor: tint }]}
                        onPress={() => handleAddRole(item)}
                      >
                        <IconSymbol name="plus" size={12} color={tint} />
                      </TouchableOpacity>
                    </View>
                    <View style={[styles.cell, { width: 60, alignItems: 'center', justifyContent: 'center' }]}>
                      <TouchableOpacity onPress={() => handleDeleteUser(item)}>
                        <IconSymbol name="minus.circle.fill" size={20} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        </ScrollView>
      )}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Add Role to {selectedUser?.username}</ThemedText>
            {availableRoles.map((role) => (
              <TouchableOpacity 
                key={role.id} 
                style={[styles.modalOption, { borderBottomColor: borderColor }]}
                onPress={() => confirmAddRole(role.name)}
              >
                <ThemedText>{role.name}</ThemedText>
                <ThemedText style={{ fontSize: 12, color: mutedText }}>{role.description}</ThemedText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity 
              style={[styles.closeButton, { backgroundColor: tint }]}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</ThemedText>
            </TouchableOpacity>
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
    padding: 20,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  headerCell: {
    fontSize: 14,
    paddingRight: 16,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  cell: {
    paddingRight: 16,
  },
  avatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  addRoleButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
