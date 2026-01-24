import NoteListWithSelectionNative from '@/components/NoteListWithSelectionNative';
import { useNotification } from '@/components/NotificationManager';
import { synchronizeNotes } from '@/services';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Platform, TextInput, TouchableOpacity, View } from 'react-native';

export default function IndexNativeScreen() {
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
    <View className="flex-1 bg-white">
      <View className="flex-row items-center bg-gray-100 h-11 mx-5 mt-4 mb-2.5 rounded-full px-3.75 z-10">
        <Ionicons name="search" size={20} color="#888" className="mr-2.5" />
        <TextInput
          placeholder="搜索笔记..."
          className="flex-1 text-base text-gray-700 py-0"
          placeholderTextColor="#888"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <TouchableOpacity onPress={handleSync} className="ml-2.5 p-1.25">
          <Ionicons name="sync" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View className="flex-1 relative">
        {/* 笔记列表组件 */}
        <NoteListWithSelectionNative
          searchQuery={searchQuery}
          onRefresh={undefined} // 刷新功能由 useFocusEffect 实现
        />

        <TouchableOpacity
          className="absolute right-5 bottom-7.5 w-14 h-14 rounded-full bg-yellow-500 justify-center items-center"
          style={
            Platform.OS === 'ios'
              ? {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                }
              : {
                  elevation: 6,
                }
          }
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
