import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useRef } from 'react';
import {
  Alert,
  Animated,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function EditScreen() {
  const { id, title, content } = useLocalSearchParams();
  const router = useRouter();

  const [noteTitle, setNoteTitle] = useState((title as string) || '');
  const [noteContent, setNoteContent] = useState((content as string) || '');

  // 添加悬浮窗状态
  const [showDropdown, setShowDropdown] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // 用于淡入动画
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // 用于缩放动画

  // 预留选项状态，用于勾选框
  const [optionsState, setOptionsState] = useState({
    save: false,
    delete: false,
    share: false,
    encrypt: true, // 默认为加密状态
  });

  const handleBack = () => {
    router.back();
  };

  // 处理悬浮窗选项
  const handleOptionSelect = (option: string) => {
    // 执行选项的处理函数
    switch (option) {
      case 'save':
        // 保存笔记的逻辑
        handleSaveNote();
        break;
      case 'delete':
        // 删除笔记的逻辑
        handleDeleteNote();
        break;
      case 'encrypt':
        break;
      default:
        break;
    }

    // 更新选项状态（除了encrypt）
    if (option !== 'encrypt') {
      setOptionsState((prev) => ({
        ...prev,
        [option]: !prev[option as keyof typeof prev],
      }));
    }

    // 关闭悬浮窗
    closeDropdown();
  };

  // 处理加密开关
  const handleEncryptToggle = () => {
    setOptionsState((prev) => ({
      ...prev,
      encrypt: !prev.encrypt,
    }));
  };

  // 预留函数调用接口
  const handleSaveNote = () => {
    // 预留保存笔记的函数
    Alert.alert('提示', '笔记已保存');
  };

  const handleDeleteNote = () => {
    // 预留删除笔记的函数
    Alert.alert('确认', '确定要删除这条笔记吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive' },
    ]);
  };

  // 显示悬浮窗并添加动画
  const openDropdown = () => {
    setShowDropdown(true);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 7,
        tension: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // 关闭悬浮窗并添加动画
  const closeDropdown = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowDropdown(false);
    });
  };

  // 渲染带勾选框的选项（仅用于加密选项）
  const renderDropdownItemWithCheckbox = (option: string, text: string, color: string = '#000') => {
    return (
      <View style={styles.dropdownItem}>
        <Text style={[styles.dropdownText, { color }]}>{text}</Text>
        <TouchableOpacity onPress={handleEncryptToggle} style={styles.checkboxContainer}>
          <Ionicons
            name={optionsState[option as keyof typeof optionsState] ? 'checkbox' : 'square-outline'}
            size={20}
            color="#007AFF"
          />
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染普通选项
  const renderDropdownItem = (option: string, text: string, color: string = '#000') => {
    return (
      <TouchableOpacity style={styles.dropdownItem} onPress={() => handleOptionSelect(option)}>
        <Text style={[styles.dropdownText, { color }]}>{text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* 自定义 Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={openDropdown}>
            <Ionicons name="ellipsis-vertical" size={20} color="#888" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 标题输入区 */}
        <TextInput
          style={styles.titleInput}
          value={noteTitle}
          onChangeText={setNoteTitle}
          placeholder="标题"
          placeholderTextColor="#888"
          underlineColorAndroid="transparent"
          selectionColor="#00000000"
          caretHidden={false}
        />

        {/* 内容书写区 */}
        <TextInput
          style={styles.contentInput}
          value={noteContent}
          onChangeText={setNoteContent}
          placeholder="开始书写笔记"
          placeholderTextColor="#888"
          multiline={true}
          textAlignVertical="top"
          underlineColorAndroid="transparent"
          selectionColor="#00000000"
          caretHidden={false}
        />
      </ScrollView>

      {/* 悬浮窗/下拉菜单 */}
      <Modal
        animationType="none" // 我们将使用自定义动画
        transparent={true}
        visible={showDropdown}
        onRequestClose={closeDropdown}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={closeDropdown}>
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            {renderDropdownItem('save', '保存', '#007AFF')}
            {renderDropdownItem('delete', '删除', '#FF3B30')}
            {renderDropdownItemWithCheckbox('encrypt', '加密', '#000')}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingTop: 50,
    paddingBottom: 15,
  },
  backButton: {
    padding: 5,
  },
  headerIcons: {
    flexDirection: 'row',
  },
  headerIcon: {
    marginLeft: 15,
    padding: 5,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  titleInput: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 0,
    marginVertical: 10,
    borderWidth: 0,
    outlineWidth: 0,
    borderStyle: 'solid',
  },
  buttonContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFC107',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
  },
  buttonIcon: {
    marginRight: 5,
  },
  createButtonText: {
    color: '#FFC107',
    fontSize: 14,
  },
  contentInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
    textAlignVertical: 'top',
    borderWidth: 0,
    outlineWidth: 0,
    borderStyle: 'solid',
  },
  // 悬浮窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginTop: 60,
    marginRight: 15,
    minWidth: 150,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  dropdownItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: '#000',
    flex: 1,
  },
  checkboxContainer: {
    marginLeft: 10,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
});
