import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useNotification } from '@/components/NotificationManager';
import { batchDeleteNotes, getNotes } from '@/services/local/LocalNoteService';
import { Note } from '@/types/notes/NoteTypes';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { forwardRef, useCallback, useImperativeHandle, useState } from 'react';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

const { width } = Dimensions.get('window');
const cardMargin = 10;
const cardWidth = (width - 4 * cardMargin) / 2;

interface NoteListWithSelectionProps {
  searchQuery?: string;
  onRefresh?: () => void;
}

export interface NoteListWithSelectionRef {
  refresh: () => void;
}

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

const NoteListWithSelection = forwardRef<NoteListWithSelectionRef, NoteListWithSelectionProps>(
  ({ searchQuery = '', onRefresh }, ref) => {
    const router = useRouter();
    const { showSuccess, showError } = useNotification();

    const [notes, setNotes] = useState<Note[]>([]);
    const [selectedNotes, setSelectedNotes] = useState<Record<string, boolean>>({});
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [showBatchDeleteModal, setShowBatchDeleteModal] = useState(false);

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

    // 执行批量删除 - 异步处理，立即关闭弹窗
    const handleBatchDelete = () => {
      const selectedIds = getSelectedIds();
      if (selectedIds.length === 0) {
        showError('请先选择要删除的笔记');
        return;
      }

      // 立即关闭弹窗并退出选择模式，提升用户体验
      setShowBatchDeleteModal(false);
      setSelectedNotes({});
      setIsSelectionMode(false);

      // 立即刷新本地列表（从UI中移除已删除的笔记）
      if (onRefresh) {
        onRefresh();
      } else {
        void loadNotes();
      }

      // 在后台异步执行批量删除操作
      batchDeleteNotes(selectedIds)
        .then(() => {
          console.log(`批量删除成功: ${selectedIds.length} 条笔记`);
        })
        .catch((error) => {
          console.error('批量删除失败:', error);
          // 异步删除失败不显示错误弹窗，仅记录日志
          // 删除状态已保存在本地，下次同步时会重试
        });
    };

    // 计算已选择的数量
    const selectedCount = Object.values(selectedNotes).filter(Boolean).length;

    // 暴露刷新方法给父组件
    useImperativeHandle(ref, () => ({
      refresh: loadNotes,
    }));

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
      <View style={styles.container}>
        {/* 选择模式工具栏 */}
        {isSelectionMode && (
          <View style={styles.selectionToolbar}>
            <View style={styles.selectionToolbarLeft}>
              <TouchableOpacity onPress={toggleSelectAll} style={styles.toolbarButton}>
                <Text style={styles.toolbarButtonText}>
                  {selectedCount === notes.length ? '取消全选' : '全选'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.selectedCountText}>
                已选择 {selectedCount} / {notes.length}
              </Text>
            </View>

            <View style={styles.selectionToolbarRight}>
              <TouchableOpacity
                onPress={confirmBatchDelete}
                style={[styles.toolbarButton, styles.deleteButton]}
                disabled={selectedCount === 0}
              >
                <Text style={[styles.toolbarButtonText, styles.deleteButtonText]}>删除</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleSelectionMode} style={styles.toolbarButton}>
                <Text style={styles.toolbarButtonText}>完成</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 笔记网格 */}
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          <View style={styles.gridContainer}>
            {notes.map((note) => {
              const isSelected = selectedNotes[note.id];

              return (
                <TouchableOpacity
                  key={note.id}
                  style={[styles.card, isSelected && styles.selectedCard]}
                  onPress={() => {
                    if (isSelectionMode) {
                      toggleNoteSelection(note.id);
                    } else {
                      router.push({
                        pathname: '/edit',
                        params: { id: note.id, title: note.title, content: note.content },
                      });
                    }
                  }}
                  onLongPress={() => {
                    if (!isSelectionMode) {
                      toggleSelectionMode();
                      toggleNoteSelection(note.id);
                    }
                  }}
                >
                  {/* 选择复选框 */}
                  {isSelectionMode && (
                    <View style={styles.checkboxContainer}>
                      <Ionicons
                        name={isSelected ? 'checkbox' : 'square-outline'}
                        size={20}
                        color={isSelected ? '#007AFF' : '#ccc'}
                      />
                    </View>
                  )}

                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {truncateText(note.title, 10)}
                  </Text>
                  <Text style={styles.cardContent} numberOfLines={2}>
                    {truncateText(note.content, 30)}
                  </Text>
                  <Text style={styles.cardDate}>
                    {new Date(note.updated_at).toLocaleDateString()}
                  </Text>
                </TouchableOpacity>
              );
            })}

            {/* 空状态 */}
            {!isLoading && notes.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>暂无笔记</Text>
              </View>
            )}
          </View>

          {isLoading && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>加载中...</Text>
            </View>
          )}
        </ScrollView>

        {/* 批量删除确认模态框 */}
        <DeleteConfirmationModal
          visible={showBatchDeleteModal}
          onClose={() => setShowBatchDeleteModal(false)}
          onConfirm={handleBatchDelete}
          title={`删除 ${selectedCount} 条笔记`}
          message={`确定要删除这 ${selectedCount} 条笔记吗？此操作无法撤销。`}
          confirmText="删除"
          cancelText="取消"
        />
      </View>
    );
  },
);

export default NoteListWithSelection;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#f0f0f0',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
  },
  selectionToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toolbarButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
    marginRight: 10,
  },
  deleteButtonText: {
    color: '#fff',
  },
  toolbarButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },
  selectedCountText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#666',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 80,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    margin: cardMargin / 2,
    borderWidth: 1,
    borderColor: '#eee',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  selectedCard: {
    borderColor: '#007AFF',
    borderWidth: 2,
    backgroundColor: '#f0f8ff',
  },
  checkboxContainer: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  cardContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
    marginTop: 'auto',
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#999',
  },
  emptyContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    color: '#999',
    fontSize: 16,
  },
});
