import NoteListWithSelection from '@/components/NoteListWithSelection';
import { useNotification } from '@/components/NotificationManager';
import { useActualColorScheme } from '@/components/ThemeManager';
import Colors from '@/constants/Colors';
import { synchronizeNotes } from '@/services';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Platform, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

export default function IndexScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const noteListRef = useRef<{ refresh: () => void }>(null);
  const theme = useActualColorScheme();

  const { showSuccess, showError, showLoading, hideLoading } = useNotification();

  const handleSync = async () => {
    showLoading('正在同步笔记...');
    try {
      const result = await synchronizeNotes();
      hideLoading();
      const totalChanges =
        (result.toUpdate?.length || 0) +
        (result.toDelete?.length || 0) +
        (result.toRestore?.length || 0);
      showSuccess(`同步成功！更新了 ${totalChanges} 条笔记。`);

      // 同步完成后立即刷新笔记列表
      if (noteListRef.current) {
        noteListRef.current.refresh();
      }
    } catch (error) {
      hideLoading();
      console.error('同步失败:', error);
      showError('笔记同步失败，请检查网络连接和API设置。');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      <View
        style={[styles.searchContainerFixed, { backgroundColor: Colors[theme].searchBackground }]}
      >
        <Ionicons
          name="search"
          size={20}
          color={Colors[theme].placeholder}
          style={styles.searchIcon}
        />
        <TextInput
          placeholder="搜索笔记..."
          style={[styles.searchInput, { color: Colors[theme].searchText }]}
          placeholderTextColor={Colors[theme].placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Ionicons name="sync" size={20} color={Colors[theme].placeholder} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrapper}>
        {/* 笔记列表组件 */}
        <NoteListWithSelection
          ref={noteListRef}
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
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  searchContainerFixed: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 45,
    marginHorizontal: 20,
    marginTop: 15,
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
    height: 45,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    includeFontPadding: false,
  },
  syncButton: {
    marginLeft: 10,
    padding: 5,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
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
