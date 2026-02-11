import LocalStorageDemo from '@/components/LocalStorageDemo';
import { useNotification } from '@/components/NotificationManager';
import { HeaderStyles } from '@/constants/HeaderStyles';
import { synchronizeNotes } from '@/services';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const [showLocalStorageDemo, setShowLocalStorageDemo] = useState(false);
  const { showInfo, showSuccess, showError } = useNotification();

  const handleSyncNotes = async () => {
    try {
      showInfo('正在同步笔记，请稍候...');
      const result = await synchronizeNotes();
      const totalChanges =
        (result.toUpdate?.length || 0) +
        (result.toDelete?.length || 0) +
        (result.toRestore?.length || 0);
      showSuccess(`同步成功！更新了 ${totalChanges} 条笔记。`);
    } catch (error) {
      console.error('同步失败:', error);
      showError('笔记同步失败，请检查网络连接和API设置。');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      <View style={styles.content}>
        <TouchableOpacity onPress={() => router.push('/server-settings')}>
          <View style={styles.optionItem}>
            <Text style={styles.optionText}>server设置</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => setShowLocalStorageDemo(true)}>
          <View style={styles.optionItem}>
            <Text style={styles.optionText}>本地存储测试</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </View>
        </TouchableOpacity>

        <View style={styles.optionItem}>
          <Text style={styles.optionText}>通知设置</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>

        <TouchableOpacity onPress={handleSyncNotes}>
          <View style={styles.optionItem}>
            <Text style={styles.optionText}>同步笔记</Text>
            <Ionicons name="sync" size={20} color="#ccc" />
          </View>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showLocalStorageDemo}
        animationType="slide"
        onRequestClose={() => setShowLocalStorageDemo(false)}
      >
        <LocalStorageDemo onBack={() => setShowLocalStorageDemo(false)} />
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    ...HeaderStyles.simpleHeader,
  },
  backButton: {
    ...HeaderStyles.backButton,
  },
  headerTitle: {
    ...HeaderStyles.headerTitle,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    marginTop: 15,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#eeeeee',
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  versionText: {
    fontSize: 16,
    color: '#888',
  },
});
