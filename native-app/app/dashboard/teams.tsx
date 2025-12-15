import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity, Modal, Alert, TextInput } from 'react-native';
import { Stack } from 'expo-router';

import { ThemedText } from '@/components/ui/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { HeaderButton } from '@/components/ui/header-button';
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
  const link = useThemeColor({}, 'link');

  const [users, setUsers] = useState<UserWithRoles[]>([]);
  const [availableRoles, setAvailableRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [addUserModalVisible, setAddUserModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRoles | null>(null);
  const [newUser, setNewUser] = useState({ username: '', email: '', password: '' });

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
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to fetch users: ${res.status}`);
    }
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

  const handleCreateUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    try {
      const res = await fetch(API_ENDPOINTS.signup, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create user');
      }

      Alert.alert('Success', 'User created successfully');
      setAddUserModalVisible(false);
      setNewUser({ username: '', email: '', password: '' });
      fetchUsers();
    } catch (err: any) {
      Alert.alert('Error', err.message);
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
      <Stack.Screen options={{ 
        title: 'Teams', 
        headerBackTitle: 'Back',
        headerRight: () => (
          <HeaderButton 
            title={isEditing ? 'Done' : 'Edit'} 
            onPress={() => setIsEditing(!isEditing)} 
          />
        ),
      }} />
      
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
              </View>
              
              {isEditing && (
                <TouchableOpacity 
                  style={[styles.row, { borderBottomColor: borderColor, justifyContent: 'center', paddingVertical: 16 }]}
                  onPress={() => setAddUserModalVisible(true)}
                >
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <IconSymbol name="plus.circle.fill" size={20} color={textColor} />
                      <ThemedText type="defaultSemiBold" style={{ color: textColor }}>Add New User</ThemedText>
                   </View>
                </TouchableOpacity>
              )}
              
              {users.length === 0 ? (
                 <View style={{ padding: 20 }}>
                    <ThemedText style={{ color: mutedText }}>No users found.</ThemedText>
                 </View>
              ) : (
                users.map((item) => (
                  <View key={item.id} style={[styles.row, { borderBottomColor: borderColor }]}>
                    <View style={[styles.cell, { width: 180, flexDirection: 'row', alignItems: 'center', gap: 10 }]}>
                      {isEditing ? (
                        <TouchableOpacity onPress={() => handleDeleteUser(item)} style={{ width: 24, alignItems: 'center' }}>
                          <IconSymbol name="minus.circle.fill" size={22} color="#ef4444" />
                        </TouchableOpacity>
                      ) : (
                        <View style={[styles.avatarSmall, { backgroundColor: link }]}>
                          <ThemedText style={{ color: '#fff', fontWeight: 'bold', fontSize: 12 }}>
                            {item.username.charAt(0).toUpperCase()}
                          </ThemedText>
                        </View>
                      )}
                      <ThemedText numberOfLines={1}>{item.username}</ThemedText>
                    </View>
                    <View style={[styles.cell, { width: 220, justifyContent: 'center' }]}>
                      <ThemedText style={{ color: mutedText }} numberOfLines={1}>{item.email}</ThemedText>
                    </View>
                    <View style={[styles.cell, { width: 250, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }]}>
                      {item.roles && item.roles.length > 0 ? (
                        item.roles.map((role, index) => (
                          <TouchableOpacity 
                            key={index} 
                            style={[styles.roleBadge, { backgroundColor: borderColor }]}
                            onPress={() => isEditing && handleRemoveRole(item.id, role)}
                            disabled={!isEditing}
                          >
                            <ThemedText style={[styles.roleText, { color: textColor }]}>{role}</ThemedText>
                            {isEditing && (
                               <View style={{ marginLeft: 4 }}>
                                  <IconSymbol name="minus.circle.fill" size={12} color="#ef4444" />
                               </View>
                            )}
                          </TouchableOpacity>
                        ))
                      ) : null}
                      {isEditing && (
                        <TouchableOpacity 
                          style={[styles.addRoleButton, { borderColor: textColor }]}
                          onPress={() => handleAddRole(item)}
                        >
                          <IconSymbol name="plus" size={14} color={textColor} />
                        </TouchableOpacity>
                      )}
                    </View>
                    {isEditing && (
                      <TouchableOpacity 
                        style={[styles.deleteButton, { backgroundColor: borderColor }]}
                        onPress={() => handleDeleteUser(item)}
                      >
                        <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Delete User</ThemedText>
                      </TouchableOpacity>
                    )}
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
              style={[styles.closeButton, { backgroundColor: link }]}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Cancel</ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={addUserModalVisible}
        onRequestClose={() => setAddUserModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: cardBackground }]}>
            <ThemedText type="subtitle" style={{ marginBottom: 16 }}>Create New User</ThemedText>
            
            <View style={styles.inputContainer}>
              <ThemedText style={{ marginBottom: 4, fontSize: 12, color: mutedText }}>Username</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                value={newUser.username}
                onChangeText={(text) => setNewUser({ ...newUser, username: text })}
                placeholder="Username"
                placeholderTextColor={mutedText}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={{ marginBottom: 4, fontSize: 12, color: mutedText }}>Email</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                value={newUser.email}
                onChangeText={(text) => setNewUser({ ...newUser, email: text })}
                placeholder="Email"
                placeholderTextColor={mutedText}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <ThemedText style={{ marginBottom: 4, fontSize: 12, color: mutedText }}>Password</ThemedText>
              <TextInput
                style={[styles.input, { color: textColor, borderColor }]}
                value={newUser.password}
                onChangeText={(text) => setNewUser({ ...newUser, password: text })}
                placeholder="Password"
                placeholderTextColor={mutedText}
                secureTextEntry
              />
            </View>

            <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: borderColor, flex: 1 }]}
                onPress={() => setAddUserModalVisible(false)}
              >
                <ThemedText style={{ color: textColor, fontWeight: '600' }}>Cancel</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, { backgroundColor: link, flex: 1 }]}
                onPress={handleCreateUser}
              >
                <ThemedText style={{ color: '#fff', fontWeight: 'bold' }}>Create</ThemedText>
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
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleText: {
    fontSize: 14,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
  addRoleButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderStyle: 'dashed',
  },
  deleteButton: {
    marginLeft: 'auto',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
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
  inputContainer: {
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
  },
  modalButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createButton: {
    marginTop: 12,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
});
