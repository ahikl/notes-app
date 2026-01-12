import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { synchronizeNotes } from '@/services';
import { useNotification } from '@/components/NotificationManager';
import NoteListWithSelection from '@/components/NoteListWithSelection';

export default function IndexScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const { showInfo, showSuccess, showError } = useNotification();

  const handleSync = async () => {
    try {
      showInfo('正在同步笔记，请稍候...');
      const result = await synchronizeNotes();
      showSuccess(`同步成功！更新了 ${result.updates.length} 条笔记。`);
    } catch (error) {
      console.error('同步失败:', error);
      showError('笔记同步失败，请检查网络连接和API设置。');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainerFixed}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          placeholder="搜索笔记..."
          style={styles.searchInput}
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Ionicons name="sync" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrapper}>
        {/* 笔记列表组件 */}
        <NoteListWithSelection
          searchQuery={searchQuery}
          onRefresh={undefined} // 刷新功能由 useFocusEffect 实现
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() =>
            router.push({
              pathname: '/edit',
              params: { id: '', title: '', content: '' },
            })
          }
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchContainerFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5', // 稍微调深一点背景色增加对比度
    height: 45,
    marginHorizontal: 20,
    marginTop: 15, // 适配全面屏顶部
    marginBottom: 10,
    borderRadius: 25,
    paddingHorizontal: 15,
    zIndex: 10,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    paddingVertical: 0, // 修复安卓文字垂直居中
  },
  syncButton: {
    marginLeft: 10,
    padding: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30, // 稍微抬高一点
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
});
