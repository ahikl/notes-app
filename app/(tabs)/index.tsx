import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
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
import { getNotes, synchronizeNotes } from '@/services';

// 获取屏幕宽度用于计算卡片尺寸
const { width } = Dimensions.get('window');
// 设置卡片间距
const cardMargin = 10;
// 计算每行显示两个卡片时的宽度 (屏幕宽度 - 4个间距) / 2
const cardWidth = (width - 4 * cardMargin) / 2;

/**
 * 限制文本长度的辅助函数
 * @param text - 需要截断的文本
 * @param maxLength - 最大长度
 * @returns 截断后的文本，超出部分用省略号表示
 */
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

/**
 * 首页屏幕组件 - 显示笔记列表
 * @returns JSX元素
 */
export default function IndexScreen() {
  // 管理当前激活的标签页状态 ('notes' 或 'tasks')
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');
  // 获取路由导航对象
  const router = useRouter();
  // 管理笔记数据状态
  const [notes, setNotes] = useState<Note[]>([]);
  // 管理搜索关键词状态
  const [searchQuery, setSearchQuery] = useState('');

  // 加载笔记数据
  useEffect(() => {
    loadNotes();
  }, [searchQuery]);

  // 加载笔记数据函数
  const loadNotes = async () => {
    try {
      const result = await getNotes({ search: searchQuery });
      setNotes(result.data);
    } catch (error) {
      console.error('加载笔记失败:', error);
      Alert.alert('错误', '加载笔记失败，请检查网络连接。');
    }
  };

  // 处理搜索
  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  // 同步笔记
  const handleSync = async () => {
    try {
      Alert.alert('同步中', '正在同步笔记，请稍候...');
      const result = await synchronizeNotes();
      Alert.alert('同步完成', `同步成功！更新了 ${result.updates.length} 条笔记。`);
      // 重新加载笔记
      loadNotes();
    } catch (error) {
      console.error('同步失败:', error);
      Alert.alert('同步失败', '笔记同步失败，请检查网络连接和API设置。');
    }
  };

  return (
    <View style={styles.container}>
      {/* 搜索栏区域 - 包含搜索图标和输入框 */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          placeholder="搜索笔记..."
          style={styles.searchInput}
          placeholderTextColor="#888"
          underlineColorAndroid="transparent"
          value={searchQuery}
          onChangeText={handleSearch}
        />
        <TouchableOpacity onPress={handleSync} style={styles.syncButton}>
          <Ionicons name="sync" size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* 内容区域 - 包含笔记网格 */}
      <ScrollView style={styles.contentContainer}>
        <View style={styles.gridContainer}>
          {/* 遍历笔记数据，渲染笔记卡片 */}
          {notes.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={styles.card}
              onPress={() =>
                // 点击卡片时导航到编辑页面，传递笔记参数
                router.push({
                  pathname: '/edit',
                  params: { id: note.id, title: note.title, content: note.content },
                })
              }
            >
              {/* 笔记标题 - 限制显示一行，超出截断 */}
              <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                {truncateText(note.title, 10)}
              </Text>
              {/* 笔记内容 - 限制显示两行，超出截断 */}
              <Text style={styles.cardContent} numberOfLines={2} ellipsizeMode="tail">
                {truncateText(note.content, 30)}
              </Text>
              {/* 笔记日期 */}
              <Text style={styles.cardDate}>{new Date(note.updated_at).toLocaleDateString()}</Text>
            </TouchableOpacity>
          ))}
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
  );
}

// 样式定义 - 包含所有组件的样式配置
const styles = StyleSheet.create({
  // 主容器样式
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },

  // 搜索容器样式 - 水平布局，圆角背景
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEE',
    height: 45,
    marginHorizontal: 20,
    marginVertical: 15,
    borderRadius: 25,
    paddingHorizontal: 15,
  },
  // 搜索图标样式
  searchIcon: {
    marginRight: 10,
  },
  // 搜索输入框样式
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderWidth: 0,
    outlineWidth: 0,
  },
  // 同步按钮样式
  syncButton: {
    marginLeft: 10,
    padding: 5,
  },
  // 内容容器样式
  contentContainer: {
    flex: 1,
  },
  // 网格容器样式 - 支持换行布局
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  // 卡片样式 - 白色背景，圆角，阴影效果
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    margin: cardMargin / 2,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
      },
      android: {
        elevation: 3,
      },
      default: {
        boxShadow: '0px 2px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  // 卡片标题样式
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  // 卡片内容样式
  cardContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  // 卡片日期样式
  cardDate: {
    fontSize: 12,
    color: '#999',
  },
  // 浮动操作按钮样式 - 圆形，黄色背景，阴影效果
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
      android: {
        elevation: 5,
      },
      default: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
});
