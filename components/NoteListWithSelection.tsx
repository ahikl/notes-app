import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useNotification } from '@/components/NotificationManager';
import { useActualColorScheme } from '@/components/ThemeManager';
import Colors from '@/constants/Colors';
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
  function NoteListWithSelection({ searchQuery = '', onRefresh }, ref) {
    const router = useRouter();
    const { showSuccess, showError } = useNotification();
    const theme = useActualColorScheme();

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

      // 先从本地状态中移除已删除的笔记，实现即时UI反馈
      setNotes((prevNotes) => prevNotes.filter((note) => !selectedIds.includes(note.id)));

      // 在后台异步执行批量删除操作
      batchDeleteNotes(selectedIds)
        .then(() => {
          console.log(`批量删除成功: ${selectedIds.length} 条笔记`);
          showSuccess(`成功删除 ${selectedIds.length} 条笔记`);
          // 删除成功后重新加载笔记列表以确保数据一致性
          void loadNotes();
        })
        .catch((error) => {
          console.error('批量删除失败:', error);
          // 异步删除失败不显示错误弹窗，仅记录日志
          // 删除状态已保存在本地，下次同步时会重试
          // 发生错误时重新加载列表以恢复正确状态
          void loadNotes();
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
      <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
        {/* 选择模式工具栏 - 现代化设计 */}
        {isSelectionMode && (
          <View
            style={[
              styles.selectionToolbar,
              {
                backgroundColor: Colors[theme].selectionToolbar,
                borderBottomColor: Colors[theme].selectionToolbarBorder,
              },
            ]}
          >
            <View style={styles.selectionToolbarLeft}>
              <TouchableOpacity
                onPress={toggleSelectAll}
                style={[
                  styles.selectAllButton,
                  selectedCount === notes.length &&
                    notes.length > 0 &&
                    styles.selectAllButtonActive,
                ]}
              >
                <Ionicons
                  name={
                    selectedCount === notes.length && notes.length > 0
                      ? 'checkmark-circle'
                      : 'ellipse-outline'
                  }
                  size={18}
                  color={selectedCount === notes.length && notes.length > 0 ? '#007AFF' : '#666'}
                  style={styles.selectAllIcon}
                />
                <Text
                  style={[
                    styles.selectAllText,
                    {
                      color:
                        selectedCount === notes.length && notes.length > 0
                          ? Colors[theme].primary
                          : Colors[theme].secondaryText,
                    },
                  ]}
                >
                  {selectedCount === notes.length && notes.length > 0 ? '取消全选' : '全选'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.selectionToolbarCenter}>
              <Text style={[styles.selectedCountText, { color: Colors[theme].secondaryText }]}>
                已选择{' '}
                <Text style={[styles.selectedCountNumber, { color: Colors[theme].primary }]}>
                  {selectedCount}
                </Text>{' '}
                项
              </Text>
            </View>

            <View style={styles.selectionToolbarRight}>
              <TouchableOpacity
                onPress={confirmBatchDelete}
                style={[
                  styles.batchDeleteButton,
                  selectedCount === 0 && { backgroundColor: Colors[theme].tabIconDefault },
                ]}
                disabled={selectedCount === 0}
              >
                <Ionicons name="trash-outline" size={18} color="#fff" style={styles.deleteIcon} />
                <Text style={styles.batchDeleteButtonText}>删除</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={toggleSelectionMode} style={styles.doneButton}>
                <Text style={styles.doneButtonText}>完成</Text>
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
                  style={[
                    styles.card,
                    {
                      backgroundColor: Colors[theme].cardBackground,
                      borderColor: Colors[theme].cardBorder,
                    },
                    isSelected && {
                      borderColor: Colors[theme].primary,
                      backgroundColor: Colors[theme].selectedCardBackground,
                    },
                  ]}
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
                  {/* 选择复选框 - 现代化设计 */}
                  {isSelectionMode && (
                    <View style={styles.checkboxContainer}>
                      <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                        {isSelected && <Ionicons name="checkmark" size={14} color="#fff" />}
                      </View>
                    </View>
                  )}

                  <Text style={[styles.cardTitle, { color: Colors[theme].text }]} numberOfLines={1}>
                    {truncateText(note.title, 10)}
                  </Text>
                  <Text
                    style={[styles.cardContent, { color: Colors[theme].secondaryText }]}
                    numberOfLines={2}
                  >
                    {truncateText(note.content, 30)}
                  </Text>
                  <Text style={[styles.cardDate, { color: Colors[theme].tertiaryText }]}>
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
              <Text style={[styles.loadingText, { color: Colors[theme].tertiaryText }]}>
                加载中...
              </Text>
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
  },
  // 现代化选择模式工具栏
  selectionToolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  selectionToolbarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectionToolbarCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  selectionToolbarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  // 全选按钮 - 现代化设计
  selectAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
  },
  selectAllButtonActive: {
    backgroundColor: '#e6f2ff',
  },
  selectAllIcon: {
    marginRight: 6,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // 已选择计数 - 现代化设计
  selectedCountText: {
    fontSize: 15,
    fontWeight: '500',
  },
  selectedCountNumber: {
    fontSize: 16,
    fontWeight: '700',
  },
  // 批量删除按钮 - 现代化设计
  batchDeleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FF3B30',
    marginRight: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#FF3B30',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  batchDeleteButtonDisabled: {
    shadowOpacity: 0,
    elevation: 0,
  },
  deleteIcon: {
    marginRight: 6,
  },
  batchDeleteButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  // 完成按钮
  doneButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  doneButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
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
    borderRadius: 16,
    padding: 15,
    margin: cardMargin / 2,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  // 选中卡片 - 现代化高亮效果
  selectedCard: {
    borderWidth: 2,
    ...Platform.select({
      ios: {
        shadowColor: '#007AFF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  // 现代化复选框
  checkboxContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.light.checkboxBorder,
    backgroundColor: Colors.light.checkboxBackground,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    paddingRight: 30,
  },
  cardContent: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  cardDate: {
    fontSize: 12,
    marginTop: 'auto',
  },
  loadingContainer: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
  },
  emptyContainer: {
    width: '100%',
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
  },
});
