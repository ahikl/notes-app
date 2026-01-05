import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

const { width } = Dimensions.get('window');
const cardMargin = 10;
const cardWidth = (width - 4 * cardMargin) / 2;

// 限制文本长度的辅助函数
const truncateText = (text: string, maxLength: number) => {
  if (text.length <= maxLength) {
    return text;
  }
  return text.substring(0, maxLength) + '...';
};

// 示例笔记数据
const sampleNotes = [
  { id: '1', title: '购物清单', content: '牛奶、面包、水果', date: '2024-01-05' },
  { id: '2', title: '会议记录', content: '讨论项目进度和下一步计划', date: '2024-01-04' },
  { id: '3', title: '学习计划', content: 'React Native 开发进阶', date: '2024-01-03' },
  { id: '4', title: '旅行计划', content: '下个月的旅行目的地安排', date: '2024-01-02' },
];

export default function IndexScreen() {
  const [activeTab, setActiveTab] = useState<'notes' | 'tasks'>('notes');
  const router = useRouter();

  return (
    <View style={styles.container}>
      {/* Search 区域 */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#888" style={styles.searchIcon} />
        <TextInput
          placeholder="搜索笔记..."
          style={styles.searchInput}
          placeholderTextColor="#888"
          underlineColorAndroid="transparent"
        />
      </View>

      {/* Content 区域 */}
      <ScrollView style={styles.contentContainer}>
        <View style={styles.gridContainer}>
          {sampleNotes.map((note) => (
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
              <Text style={styles.cardTitle} numberOfLines={1} ellipsizeMode="tail">
                {truncateText(note.title, 10)}
              </Text>
              <Text style={styles.cardContent} numberOfLines={2} ellipsizeMode="tail">
                {truncateText(note.content, 30)}
              </Text>
              <Text style={styles.cardDate}>{note.date}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* FAB 区域 */}
      <TouchableOpacity style={styles.fab}>
        <Ionicons name="add" size={24} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },

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
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    borderWidth: 0,
    outlineWidth: 0,
  },
  contentContainer: {
    flex: 1,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  card: {
    width: cardWidth,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 15,
    margin: cardMargin / 2,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  cardContent: {
    fontSize: 14,
    color: '#666',
    marginBottom: 10,
  },
  cardDate: {
    fontSize: 12,
    color: '#999',
  },
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
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
      },
      android: {
        elevation: 5,
      },
    }),
  },
});
