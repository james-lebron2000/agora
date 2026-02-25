import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ProfileEditModalProps {
  visible: boolean;
  initialUsername: string;
  initialNickname: string;
  initialAvatarUri?: string;
  isSaving?: boolean;
  isUploading?: boolean;
  onClose: () => void;
  onPickAvatar: () => Promise<void>;
  onSave: (payload: { username: string; nickname: string }) => Promise<void>;
}

export default function ProfileEditModal({
  visible,
  initialUsername,
  initialNickname,
  initialAvatarUri,
  isSaving = false,
  isUploading = false,
  onClose,
  onPickAvatar,
  onSave,
}: ProfileEditModalProps) {
  const [username, setUsername] = useState(initialUsername);
  const [nickname, setNickname] = useState(initialNickname);

  useEffect(() => {
    if (visible) {
      setUsername(initialUsername);
      setNickname(initialNickname);
    }
  }, [visible, initialUsername, initialNickname]);

  const handleSave = async () => {
    const cleanUsername = username.trim() || initialUsername;
    const cleanNickname = nickname.trim() || initialNickname;
    await onSave({ username: cleanUsername, nickname: cleanNickname });
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.header}>
            <Text style={styles.title}>Edit Profile</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={20} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={styles.avatarRow}>
            {initialAvatarUri ? (
              <Image source={{ uri: initialAvatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarFallback}>
                <Ionicons name="person" size={28} color="#6366f1" />
              </View>
            )}
            <TouchableOpacity style={styles.avatarButton} onPress={onPickAvatar} disabled={isUploading}>
              {isUploading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="images-outline" size={16} color="#fff" />
                  <Text style={styles.avatarButtonText}>Choose from album</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              placeholder="username"
              autoCapitalize="none"
              style={styles.input}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Nickname</Text>
            <TextInput
              value={nickname}
              onChangeText={setNickname}
              placeholder="nickname"
              style={styles.input}
            />
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={isSaving}>
            {isSaving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    padding: 20,
    paddingBottom: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
  },
  closeButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f1f5f9',
  },
  avatarRow: {
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    marginBottom: 10,
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e0e7ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  avatarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#6366f1',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  avatarButtonText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    color: '#475569',
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  saveButton: {
    marginTop: 6,
    backgroundColor: '#4f46e5',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
