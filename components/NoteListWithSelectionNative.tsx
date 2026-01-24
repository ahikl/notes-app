import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useNotification } from '@/components/NotificationManager';
import { batchDeleteNotes, getNotes } from '@/services/local/LocalNoteService';
import { Note } from '@/types/notes/NoteTypes';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const { width } = Dimensions.get('window');
const cardMargin = 10;
const cardWidth = (width - 4 * cardMargin) / 2;

interface NoteListWithSelectionProps {
  searchQuery?: string;
  onRefresh?: () => void;
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

const NoteListWithSelectionNative: React.FC<NoteListWithSelectionProps> = ({
  searchQuery = '',
  onRefresh,
}) => {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();

  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNotes, setSelectedNotes] = useState<Record<string, boolean>>({});
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);
  const [batchDeleteLoading, setBatchDeleteLoading] = useState(false);

  // 加载笔记
  const loadNotes = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await getNotes({
        search: searchQuery,
        page: 1,
        limit: 50, // 增加限制以支持批量操作
      });
      setNotes(result.data);
    } catch (error) {
      console.error('加载笔记失败:', error);
      showError('加载笔记失败');
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, setIsLoading, setNotes, showError]);

  // 切换选择模式
  const toggleSelectionMode = () => {
    if (isSelectionMode) {
      setSelectedNotes({});
    }
    setIsSelectionMode(!isSelectionMode);
  };

  // 选择/取消选择笔记
  const toggleNoteSelection = (id: string) => {
    setSelectedNotes((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (Object.keys(selectedNotes).length === notes.length) {
      // 全部已选中，取消选择
      setSelectedNotes({});
    } else {
      // 部分或未选中，全选
      const newSelected: Record<string, boolean> = {};
      notes.forEach((note) => {
        newSelected[note.id] = true;
      });
      setSelectedNotes(newSelected);
    }
  };

  // 获取已选中的笔记ID数组
  const getSelectedIds = () => {
    return Object.entries(selectedNotes)
      .filter(([_, isSelected]) => isSelected)
      .map(([id, _]) => id);
  };

  // 批量删除确认
  const confirmBatchDelete = () => {
    setShowBatchDeleteModal(true);
  };

  // 执行批量删除
  const handleBatchDelete = async () => {
    setBatchDeleteLoading(true);
    try {
      const selectedIds = getSelectedIds();
      if (selectedIds.length === 0) {
        showError('请先选择要删除的笔记');
        return;
      }

      await batchDeleteNotes(selectedIds);
      showSuccess(`成功删除 ${selectedIds.length} 条笔记`);

      // 退出选择模式并刷新列表
      setSelectedNotes({});
      setIsSelectionMode(false);
      setShowBatchDeleteModal(false);

      // 如果提供了刷新回调，调用它
      if (onRefresh) {
        onRefresh();
      } else {
        await loadNotes();
      }
    } catch (error) {
      console.error('批量删除失败:', error);
      // 不显示批量删除错误的弹窗，仅记录日志
      // showError('批量删除失败');
    } finally {
      setBatchDeleteLoading(false);
    }
  };

  // 计算已选择的数量
  const selectedCount = Object.values(selectedNotes).filter(Boolean).length;

  // 初始加载及获得焦点时加载
  useFocusEffect(
    React.useCallback(() => {
      const fetchData = async () => {
        await loadNotes();
      };

      void fetchData();

      // 返回一个清理函数，通常在组件失去焦点时不需要特殊处理
      return () => {};
    }, [loadNotes]),
  );

  return (
    <View className="flex-1 bg-gray-50">
      {/* 选择模式工具栏 */}
      {isSelectionMode && (
        <View className="flex-row items-center justify-between p-3 bg-blue-500">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={toggleSelectAll}
              className="mr-4 px-3 py-1 bg-blue-600 rounded"
            >
              <Text className="text-white text-sm">
                {selectedCount === notes.length ? '取消全选' : '全选'}
              </Text>
            </TouchableOpacity>
            <Text className="text-white">
              已选择 {selectedCount} / {notes.length}
            </Text>
          </View>

          <View className="flex-row">
            <TouchableOpacity
              onPress={confirmBatchDelete}
              className={`px-4 py-2 rounded mr-2 ${
                selectedCount === 0 ? 'bg-red-400' : 'bg-red-600'
              }`}
              disabled={selectedCount === 0}
            >
              <Text
                className={`font-medium ${selectedCount === 0 ? 'text-gray-300' : 'text-white'}`}
              >
                删除
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={toggleSelectionMode} className="px-4 py-2 bg-white rounded">
              <Text className="text-blue-500 font-medium">完成</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 笔记网格 */}
      <ScrollView className="flex-1 bg-gray-50">
        <View className="flex-row flex-wrap justify-between p-2">
          {notes.map((note) => {
            const isSelected = selectedNotes[note.id];

            return (
              <TouchableOpacity
                key={note.id}
                className={`mb-3 rounded-lg overflow-hidden border ${
                  isSelected ? 'border-blue-500 bg-blue-100' : 'border-gray-200 bg-white'
                }`}
                style={{ width: cardWidth }}
                onPress={() => {
                  if (isSelectionMode) {
                    toggleNoteSelection(note.id);
                  } else {
                    router.push({
                      pathname: '/edit',
                      params: {
                        id: note.id,
                        title: note.title,
                        content: note.content,
                      },
                    });
                  }
                }}
                onLongPress={() => {
                  toggleNoteSelection(note.id);
                  if (!isSelectionMode) {
                    toggleSelectionMode();
                  }
                }}
              >
                <View className="p-3">
                  <View className="flex-row justify-between items-start">
                    <Text
                      className={`font-medium ${isSelected ? 'text-blue-700' : 'text-gray-800'}`}
                      numberOfLines={1}
                    >
                      {note.title || '无标题'}
                    </Text>
                    {isSelected && (
                      <View className="w-5 h-5 rounded-full bg-blue-500 justify-center items-center">
                        <Ionicons name="checkmark" size={12} color="white" />
                      </View>
                    )}
                  </View>

                  <Text
                    className={`mt-2 text-sm ${isSelected ? 'text-blue-600' : 'text-gray-600'}`}
                    numberOfLines={3}
                  >
                    {truncateText(note.content, 100)}
                  </Text>

                  <Text className="mt-2 text-xs text-gray-400">
                    {new Date(note.updated_at).toLocaleDateString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {notes.length === 0 && !isLoading && (
          <View className="flex-1 justify-center items-center p-10">
            <Text className="text-gray-500 text-lg">暂无笔记</Text>
          </View>
        )}
      </ScrollView>

      {/* 批量删除确认模态框 */}
      <DeleteConfirmationModal
        visible={showBatchDeleteModal}
        onClose={() => setShowBatchDeleteModal(false)}
        onConfirm={handleBatchDelete}
        title="确认删除"
        message={`确定要删除选中的 ${selectedCount} 条笔记吗？此操作不可撤销。`}
        isLoading={batchDeleteLoading}
      />
    </View>
  );
};

export default NoteListWithSelectionNative;
