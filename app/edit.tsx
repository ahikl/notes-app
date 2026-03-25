import DeleteConfirmationModal from '@/components/DeleteConfirmationModal';
import { useNotification } from '@/components/NotificationManager';
import { useActualColorScheme } from '@/components/ThemeManager';
import Colors from '@/constants/Colors';
import { HeaderStyles } from '@/constants/HeaderStyles';
import { createNote, deleteNote, getNoteById, updateNote } from '@/services/local/LocalNoteService';
import { getDefaultEncryption } from '@/utils/auth/AuthUtils';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
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
  const { showSuccess, showError } = useNotification();
  const theme = useActualColorScheme();

  // 使用状态来跟踪实际的笔记ID，即使是从路由参数传入的ID为空
  const [noteId, setNoteId] = useState((id as string) || '');
  const [noteTitle, setNoteTitle] = useState((title as string) || '');
  const [noteContent, setNoteContent] = useState((content as string) || '');

  // 添加防抖计时器引用
  const debounceTimer = useRef<number | null>(null);

  // 添加悬浮窗状态
  const [showDropdown, setShowDropdown] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current; // 用于淡入动画
  const scaleAnim = useRef(new Animated.Value(0.8)).current; // 用于缩放动画

  // 初始加密状态
  const [initialEncryptStatus, setInitialEncryptStatus] = useState(false);

  const [optionsState, setOptionsState] = useState({
    save: false,
    delete: false,
    share: false,
    encrypt: false,
  });

  // 在组件加载时获取现有笔记的加密状态或应用默认加密设置
  useEffect(() => {
    const loadExistingNote = async () => {
      if (id && id !== 'undefined' && id !== '') {
        try {
          const existingNote = await getNoteById(id as string);
          if (existingNote) {
            setInitialEncryptStatus(existingNote.is_encrypted === 1);
            setOptionsState((prev) => ({
              ...prev,
              encrypt: existingNote.is_encrypted === 1,
            }));
          }
        } catch (error) {
          console.error('加载现有笔记失败:', error);
        }
      } else {
        // 对于新笔记，应用默认加密设置
        try {
          const defaultEncrypt = await getDefaultEncryption();
          setInitialEncryptStatus(defaultEncrypt);
          setOptionsState((prev) => ({
            ...prev,
            encrypt: defaultEncrypt,
          }));
        } catch (error) {
          console.error('加载默认加密设置失败:', error);
          // 如果加载失败，默认不加密
          setInitialEncryptStatus(false);
          setOptionsState((prev) => ({
            ...prev,
            encrypt: false,
          }));
        }
      }
    };

    loadExistingNote().catch((error) => console.error('Error loading existing note:', error));
  }, [id]);

  const handleBack = async () => {
    // 在返回之前确保保存当前的修改
    await saveNote();
    router.back();
  };

  // 处理悬浮窗选项
  const handleOptionSelect = async (option: string) => {
    // 执行选项的处理函数
    switch (option) {
      case 'save':
        // 保存笔记的逻辑
        await handleSaveNote();
        break;
      case 'delete':
        await handleDeleteNote();
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

  // 状态管理弹窗
  const [, setShowSaveModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // 添加一个状态来跟踪是否正在保存，防止重复保存
  const [isSaving, setIsSaving] = useState(false);

  // 保存笔记
  const saveNote = useCallback(async () => {
    // 防止重复保存
    if (isSaving) return;
    setIsSaving(true);

    try {
      // 对于已存在的笔记，即使内容为空也应该保存（允许清空笔记）
      // 对于新笔记，如果内容和标题都为空则不保存
      if (!noteId || noteId === '' || noteId === 'undefined') {
        if (!noteContent.trim() && !noteTitle.trim()) {
          return; // 新笔记且内容和标题都为空时不保存
        }
      }

      // 如果标题为空，自动取内容前10个字符作为标题
      let titleToUse = noteTitle;
      if (!titleToUse.trim()) {
        titleToUse = noteContent.trim().substring(0, 10) || '未命名笔记';
      }

      if (noteId && noteId !== '' && noteId !== 'undefined') {
        // 检查noteId是否存在且不是'undefined'字符串
        // 更新现有笔记
        await updateNote(noteId as string, {
          title: titleToUse,
          content: noteContent,
          is_encrypted: optionsState.encrypt ? 1 : 0, // 使用当前加密状态
          updated_at: new Date().toISOString(),
        });
        showSuccess('笔记已更新');
      } else {
        // 创建新笔记
        const response = await createNote({
          title: titleToUse,
          content: noteContent,
          is_encrypted: optionsState.encrypt ? 1 : 0, // 使用当前加密状态
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        // 保存成功后更新noteId，这样后续编辑就会更新这个笔记而不是创建新笔记
        if (response.id) {
          setNoteId(response.id);
        }
        showSuccess('笔记已创建');
      }
    } catch (error) {
      console.error('保存笔记失败:', error);
      showError('保存笔记失败');
    } finally {
      setIsSaving(false);
    }
  }, [
    isSaving,
    noteId,
    noteContent,
    noteTitle,
    optionsState.encrypt,
    showSuccess,
    showError,
    setNoteId,
  ]);

  // 自动保存功能
  const autoSave = useCallback(() => {
    // 如果正在保存，跳过
    if (isSaving) {
      return;
    }

    // 对于新笔记，内容和标题都为空时不自动保存
    if (
      (!noteId || noteId === '' || noteId === 'undefined') &&
      !noteContent.trim() &&
      !noteTitle.trim()
    ) {
      return;
    }

    // 清除之前的定时器
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // 设置新的定时器
    debounceTimer.current = Number(
      setTimeout(async () => {
        await saveNote();
      }, 1000),
    ); // 1秒后自动保存
  }, [isSaving, noteId, noteContent, noteTitle, saveNote]);

  // 当内容或加密状态改变时触发自动保存
  useEffect(() => {
    // 防止初次加载时触发自动保存
    const isContentChanged = noteContent !== (content as string) || noteTitle !== (title as string);
    const isEncryptChanged = optionsState.encrypt !== initialEncryptStatus;

    if (isContentChanged || isEncryptChanged) {
      // 对于已有ID的笔记，总是触发自动保存；对于新笔记，只有当内容或标题不为空时才触发
      if (noteId && noteId !== '' && noteId !== 'undefined') {
        // 如果是已有笔记，总是自动保存
        autoSave();
      } else if (noteContent || noteTitle) {
        // 对于新笔记，只有当内容或标题不为空时才触发自动保存
        autoSave();
      }
    }

    // 组件卸载时清除定时器
    return () => {
      if (debounceTimer.current) {
        clearTimeout(Number(debounceTimer.current));
      }
    };
  }, [
    noteTitle,
    noteContent,
    title,
    content,
    noteId,
    autoSave,
    optionsState.encrypt,
    initialEncryptStatus,
  ]);

  // 预留函数调用接口
  const handleSaveNote = async () => {
    await saveNote();
    setShowSaveModal(true);
  };

  const handleDeleteNote = async () => {
    // 预留删除笔记的函数
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = () => {
    // 异步删除：立即关闭弹窗并返回，后台执行删除操作
    setShowDeleteModal(false);

    if (noteId && noteId !== '' && noteId !== 'undefined') {
      // 在后台异步执行删除操作，不阻塞UI
      deleteNote(noteId as string)
        .then(() => {
          console.log('笔记删除成功:', noteId);
        })
        .catch((error) => {
          console.error('删除笔记失败:', error);
          // 异步删除失败不显示错误弹窗，仅记录日志
          // 删除状态已保存在本地，下次同步时会重试
        });
    }

    // 立即返回主页
    // 注意：主页的 useFocusEffect 会在组件重新获得焦点时自动触发刷新
    router.back();
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
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
  const renderDropdownItemWithCheckbox = (option: string, text: string, color?: string) => {
    return (
      <View style={styles.dropdownItem}>
        <Text style={[styles.dropdownText, { color: color || Colors[theme].text }]}>{text}</Text>
        <TouchableOpacity onPress={handleEncryptToggle} style={styles.checkboxContainer}>
          <Ionicons
            name={optionsState[option as keyof typeof optionsState] ? 'checkbox' : 'square-outline'}
            size={20}
            color={Colors[theme].primary}
          />
        </TouchableOpacity>
      </View>
    );
  };

  // 渲染普通选项
  const renderDropdownItem = (option: string, text: string, color?: string) => {
    return (
      <TouchableOpacity style={styles.dropdownItem} onPress={() => handleOptionSelect(option)}>
        <Text style={[styles.dropdownText, { color: color || Colors[theme].text }]}>{text}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: Colors[theme].background }]}>
      {/* 自定义 Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: Colors[theme].headerBackground,
            borderBottomColor: Colors[theme].headerBorder,
          },
        ]}
      >
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors[theme].text} />
        </TouchableOpacity>
        <View style={styles.headerIcons}>
          <TouchableOpacity style={styles.headerIcon} onPress={openDropdown}>
            <Ionicons name="ellipsis-vertical" size={20} color={Colors[theme].placeholder} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 标题输入区 */}
        <TextInput
          style={[styles.titleInput, { color: Colors[theme].text }]}
          value={noteTitle}
          onChangeText={setNoteTitle}
          placeholder="标题"
          placeholderTextColor={Colors[theme].placeholder}
          underlineColorAndroid="transparent"
          selectionColor={Colors[theme].primary}
          caretHidden={false}
        />

        {/* 内容书写区 */}
        <TextInput
          style={[styles.contentInput, { color: Colors[theme].text }]}
          value={noteContent}
          onChangeText={setNoteContent}
          placeholder="开始书写笔记"
          placeholderTextColor={Colors[theme].placeholder}
          multiline={true}
          textAlignVertical="top"
          underlineColorAndroid="transparent"
          selectionColor={Colors[theme].primary}
          caretHidden={false}
        />
      </ScrollView>

      {/* 悬浮窗/下拉菜单 */}
      <Modal
        animationType="none" // 我们将使用自定义动画
        transparent={true}
        visible={showDropdown}
        onRequestClose={closeDropdown}
        accessibilityViewIsModal={true}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={closeDropdown} accessible={false}>
          <Animated.View
            style={[
              styles.dropdownContainer,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
                backgroundColor: Colors[theme].dropdownBackground,
              },
            ]}
          >
            {renderDropdownItem('save', '保存', Colors[theme].primary)}
            {renderDropdownItem('delete', '删除', Colors[theme].danger)}
            {renderDropdownItemWithCheckbox('encrypt', '加密')}
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* 删除确认模态框 */}
      <DeleteConfirmationModal
        visible={showDeleteModal}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        title="删除笔记"
        message="确定要删除此笔记吗？此操作无法撤销。"
        confirmText="删除"
        cancelText="取消"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    ...HeaderStyles.standardHeader,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    ...HeaderStyles.backButton,
  },
  headerIcons: {
    ...HeaderStyles.headerIcons,
  },
  headerIcon: {
    ...HeaderStyles.headerIcon,
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
    height: 40,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    marginVertical: 10,
    borderWidth: 0,
    outlineWidth: 0,
    borderStyle: 'solid',
    includeFontPadding: false,
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
    minHeight: 200,
    textAlignVertical: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    paddingHorizontal: 0,
    borderWidth: 0,
    outlineWidth: 0,
    borderStyle: 'solid',
    includeFontPadding: false,
  },
  // 悬浮窗样式
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
  },
  dropdownContainer: {
    borderRadius: 8,
    marginTop: 60,
    marginRight: 15,
    minWidth: 150,
    elevation: 8,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
      },
      android: {
        // elevation already handles shadow on Android
      },
      default: {
        boxShadow: '0px 2px 3.84px rgba(0, 0, 0, 0.25)',
      },
    }),
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
