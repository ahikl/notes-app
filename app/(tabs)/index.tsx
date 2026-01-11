import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react'; // 引入 useRef
import { useFocusEffect } from '@react-navigation/native';
import {
  Dimensions,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Note } from '@/types/notes/NoteTypes';
import { synchronizeNotes } from '@/services';
import { getNotes } from '@/services/local/LocalNoteService';
import { useNotification } from '@/components/NotificationManager';

const { width } = Dimensions.get('window');
const cardMargin = 10;
const cardWidth = (width - 4 * cardMargin) / 2;

const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

export default function IndexScreen() {
  const router = useRouter();
  const [notes, setNotes] = useState<Note[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // 使用 ref 来追踪当前的 loading 状态，防止闭包问题导致的重复请求
  const isLoadingRef = useRef(false);

  const { showInfo, showSuccess, showError } = useNotification();

  // 核心修复：重构 loadNotes，移除对外部 page 状态的强依赖，通过参数控制
  const fetchNotesData = async (currentPage: number, query: string, isReset: boolean) => {
    if (isLoadingRef.current) return;

    try {
      isLoadingRef.current = true;
      setIsLoading(true);

      const result = await getNotes({
        search: query,
        page: currentPage,
        limit: 10,
      });

      if (isReset) {
        setNotes(result.data);
        setPage(1); // 重置页码状态
      } else {
        setNotes((prev) => [...prev, ...result.data]);
        setPage(currentPage); // 更新页码状态
      }

      setHasMore(result.data.length === 10);
    } catch (error) {
      console.error('加载笔记失败:', error);
      showError('加载笔记失败，请检查网络连接。');
    } finally {
      setIsLoading(false);
      isLoadingRef.current = false;
    }
  };

  // 1. 初始化和搜索变化时的副作用 (只在 mount 或 search 变化时执行)
  useEffect(() => {
    // 搜索或初始化时，强制加载第1页，并标记为重置
    fetchNotesData(1, searchQuery, true);
  }, [searchQuery]); // 移除 loadNotes 依赖，只依赖 searchQuery

  // 2. 焦点返回时刷新 (可选：保持当前列表只刷新，或者重置回第一页)
  useFocusEffect(
    React.useCallback(() => {
      // 这里选择静默刷新第一页，或者你可以选择不执行任何操作
      // 如果你希望每次返回页面都刷新最新数据：
      fetchNotesData(1, searchQuery, true);
    }, [searchQuery]),
  );

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // useEffect 会监听到 searchQuery 变化自动触发 fetchNotesData
  };

  // 处理滚动 - 加载更多
  const handleScroll = (event: any) => {
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const paddingToBottom = 40;

    // 检查是否滚动到底部
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
      // 只有在非加载中且有更多数据时才加载下一页
      if (!isLoadingRef.current && hasMore) {
        // 请求下一页 (当前页 + 1)
        fetchNotesData(page + 1, searchQuery, false);
      }
    }
  };

  const handleSync = async () => {
    try {
      showInfo('正在同步笔记，请稍候...');
      const result = await synchronizeNotes();
      showSuccess(`同步成功！更新了 ${result.updates.length} 条笔记。`);
      // 同步完成后重置列表
      fetchNotesData(1, searchQuery, true);
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
          onChangeText={handleSearch}
        />
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Ionicons name="sync" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      <View style={styles.contentWrapper}>
        <ScrollView
          style={styles.contentContainer}
          // 修复样式：添加 flexGrow 确保内容少时也能撑开容器，避免滚动卡顿
          contentContainerStyle={[styles.scrollContentContainer, { flexGrow: 1 }]}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled" // 优化键盘体验
        >
          <View style={styles.gridContainer}>
            {notes.map((note) => (
              <TouchableOpacity
                key={note.id}
                style={styles.card}
                onPress={() =>
                  router.push({
                    pathname: '/edit',
                    params: { id: note.id, title: note.title, content: note.content },
                  })
                }
              >
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
            ))}

            {/* 加载状态显示优化 */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <Text style={styles.loadingText}>加载中...</Text>
              </View>
            )}
            {!hasMore && notes.length > 0 && (
              <View style={styles.loadingFooter}>
                <Text style={styles.loadingText}>— 已加载全部笔记 —</Text>
              </View>
            )}
            {!isLoading && notes.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>暂无笔记</Text>
              </View>
            )}
          </View>
        </ScrollView>

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
  contentContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 80, // 增加底部留白，防止内容被 FAB 遮挡
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
    borderWidth: 1, // 添加细边框增加质感
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
    marginTop: 'auto', // 将日期推到底部
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
  loadingContainer: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingFooter: {
    width: '100%',
    paddingVertical: 20,
    alignItems: 'center',
    marginBottom: 20,
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
