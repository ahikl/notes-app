import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { HeaderStyles } from '@/constants/HeaderStyles';
import { generateEncryptionKey } from '@/utils/crypto/EncryptionUtils';
import {
  getApiKey,
  getApiUrl,
  getEncryptionKey,
  isValidApiKey,
  isValidApiUrl,
  saveApiKey,
  saveApiUrl,
  saveEncryptionKey,
} from '@/utils/auth/AuthUtils';

export default function ServerSettingsScreen() {
  const router = useRouter();
  const [apiUrl, setApiUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [password, setPassword] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // 组件加载时从存储中获取现有配置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedApiUrl = await getApiUrl();
        if (storedApiUrl) {
          setApiUrl(storedApiUrl);
        }

        const storedApiKey = await getApiKey();
        if (storedApiKey) {
          setApiKey(storedApiKey);
        }

        const storedEncryptionKey = await getEncryptionKey();
        if (storedEncryptionKey) {
          setPassword(storedEncryptionKey);
        }
      } catch (error) {
        console.error('加载设置时出错:', error);
        // 如果加载失败，可以给用户一些提示或者继续运行应用
      }
    };

    // 直接调用并处理Promise
    void loadSettings();
  }, []);

  // 现代化弹窗状态
  const [showCustomModal, setShowCustomModal] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'alert' as 'alert' | 'confirm',
    onConfirm: () => {},
    onCancel: () => {},
  });

  // 预留生成随机密钥功能
  const handleGenerateRandomKey = () => {
    // 检查当前密码字段是否已有内容
    if (password && password.trim() !== '') {
      // 如果已有密钥，提示是否覆盖
      setShowCustomModal({
        visible: true,
        title: '确认覆盖',
        message: '当前已有密钥，是否要生成新密钥并覆盖当前内容？',
        type: 'confirm',
        onConfirm: () => {
          // 生成新密钥并设置到密码字段
          const newKey = generateEncryptionKey();
          setPassword(newKey);
          setShowCustomModal({ ...showCustomModal, visible: false });
          // 显示成功提示
          setTimeout(() => {
            setShowCustomModal({
              visible: true,
              title: '成功',
              message: '新密钥已生成并填入输入框',
              type: 'alert',
              onConfirm: () => setShowCustomModal({ ...showCustomModal, visible: false }),
              onCancel: () => setShowCustomModal({ ...showCustomModal, visible: false }),
            });
          }, 300);
        },
        onCancel: () => {
          setShowCustomModal({ ...showCustomModal, visible: false });
        },
      });
    } else {
      // 如果没有现有密钥，直接生成新密钥
      const newKey = generateEncryptionKey();
      setPassword(newKey);
      setShowCustomModal({
        visible: true,
        title: '成功',
        message: '新密钥已生成并填入输入框',
        type: 'alert',
        onConfirm: () => setShowCustomModal({ ...showCustomModal, visible: false }),
        onCancel: () => setShowCustomModal({ ...showCustomModal, visible: false }),
      });
    }
  };

  const handleSave = async () => {
    if (!apiUrl.trim()) {
      setShowCustomModal({
        visible: true,
        title: '提示',
        message: '请输入API URL',
        type: 'alert',
        onConfirm: () => setShowCustomModal({ ...showCustomModal, visible: false }),
        onCancel: () => setShowCustomModal({ ...showCustomModal, visible: false }),
      });
      return;
    }

    if (!isValidApiUrl(apiUrl)) {
      setShowCustomModal({
        visible: true,
        title: '提示',
        message: '请输入有效的API URL',
        type: 'alert',
        onConfirm: () => setShowCustomModal({ ...showCustomModal, visible: false }),
        onCancel: () => setShowCustomModal({ ...showCustomModal, visible: false }),
      });
      return;
    }

    if (apiKey && !isValidApiKey(apiKey)) {
      setShowCustomModal({
        visible: true,
        title: '提示',
        message: '请输入有效的API密钥',
        type: 'alert',
        onConfirm: () => setShowCustomModal({ ...showCustomModal, visible: false }),
        onCancel: () => setShowCustomModal({ ...showCustomModal, visible: false }),
      });
      return;
    }

    setIsSaving(true);

    try {
      // 保存配置到存储
      await saveApiUrl(apiUrl);
      await saveApiKey(apiKey);
      await saveEncryptionKey(password); // 保存加密密钥

      // 实际保存成功，直接跳转回上一页
      setIsSaving(false);
      setShowCustomModal({
        visible: true,
        title: '成功',
        message: '服务器设置已保存',
        type: 'alert',
        onConfirm: () => {
          setShowCustomModal({ ...showCustomModal, visible: false });
          router.back();
        },
        onCancel: () => setShowCustomModal({ ...showCustomModal, visible: false }),
      });
    } catch (error) {
      setIsSaving(false);
      console.error('保存设置时出错:', error);
      setShowCustomModal({
        visible: true,
        title: '错误',
        message: '保存设置失败，请重试',
        type: 'alert',
        onConfirm: () => setShowCustomModal({ ...showCustomModal, visible: false }),
        onCancel: () => setShowCustomModal({ ...showCustomModal, visible: false }),
      });
    }
  };

  // 关闭自定义弹窗
  const closeModal = () => {
    setShowCustomModal({ ...showCustomModal, visible: false });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* 顶部导航栏 */}
        <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
            <Text style={styles.backText}>返回</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* 标题区域 */}
        <View style={styles.pageTitleContainer}>
          <Text style={styles.pageTitle}>服务器设置</Text>
        </View>

        {/* 核心内容区域 */}
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          <Animated.View entering={FadeInUp.delay(100).duration(500)} style={styles.contentCard}>
            {/* 输入框组 */}
            <View style={styles.inputGroup}>
              {/* API URL 输入框 */}
              <Animated.View
                entering={FadeInUp.delay(200).duration(500)}
                style={styles.inputContainer}
              >
                <View style={styles.inputHeader}>
                  <Ionicons name="server" size={18} color="#666" />
                  <Text style={styles.inputLabel}>API URL</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="https://api.example.com"
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
                {apiUrl ? (
                  <TouchableOpacity style={styles.clearInputButton} onPress={() => setApiUrl('')}>
                    <Ionicons name="close-circle" size={18} color="#999" />
                  </TouchableOpacity>
                ) : null}
              </Animated.View>

              {/* API Key 输入框 */}
              <Animated.View
                entering={FadeInUp.delay(300).duration(500)}
                style={styles.inputContainer}
              >
                <View style={styles.inputHeader}>
                  <Ionicons name="key" size={18} color="#666" />
                  <Text style={styles.inputLabel}>API Key</Text>
                </View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="请输入API密钥"
                    value={apiKey}
                    onChangeText={setApiKey}
                    secureTextEntry={!showApiKey}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.visibilityButton}
                    onPress={() => setShowApiKey(!showApiKey)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={showApiKey ? 'eye-off' : 'eye'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* 密钥输入框 */}
              <Animated.View
                entering={FadeInUp.delay(400).duration(500)}
                style={styles.inputContainer}
              >
                <View style={styles.inputHeader}>
                  <Ionicons name="lock-closed" size={18} color="#666" />
                  <Text style={styles.inputLabel}>密钥</Text>
                </View>
                <View style={styles.passwordContainer}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="请输入密钥"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#999"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <TouchableOpacity
                    style={styles.visibilityButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#666" />
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </View>
          </Animated.View>

          {/* 操作按钮区域 */}
          <Animated.View
            entering={FadeInUp.delay(600).duration(500)}
            style={styles.actionsContainer}
          >
            <TouchableOpacity
              style={[styles.button, styles.testButton]}
              onPress={handleGenerateRandomKey}
              activeOpacity={0.8}
            >
              <Ionicons name="key" size={20} color="#4A90E2" />
              <Text style={styles.testButtonText}>生成随机密钥</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.button, styles.saveButton]}
              onPress={handleSave}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="save" size={20} color="#FFF" />
                  <Text style={styles.saveButtonText}>保存设置</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* 现代化弹窗 */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showCustomModal.visible}
          onRequestClose={closeModal}
          accessibilityViewIsModal={true}
        >
          <View style={styles.modalContainer}>
            <TouchableOpacity
              style={styles.modalOverlay}
              onPress={closeModal}
              activeOpacity={1}
              accessible={false}
            />
            <View style={styles.modalContent} accessible={true} accessibilityElementsHidden={false}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{showCustomModal.title}</Text>
              </View>

              <View style={styles.modalBody}>
                <Text style={styles.modalMessage}>{showCustomModal.message}</Text>
              </View>

              <View style={styles.modalFooter}>
                {showCustomModal.type === 'confirm' && (
                  <>
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalCancelButton]}
                      onPress={showCustomModal.onCancel}
                    >
                      <Text style={[styles.modalButtonText, { color: '#8E8E93' }]}>取消</Text>
                    </TouchableOpacity>
                    <View style={styles.buttonSeparator} />
                    <TouchableOpacity
                      style={[styles.modalButton, styles.modalConfirmButton]}
                      onPress={showCustomModal.onConfirm}
                    >
                      <Text style={[styles.modalButtonText, { color: '#FF3B30' }]}>确定</Text>
                    </TouchableOpacity>
                  </>
                )}
                {showCustomModal.type === 'alert' && (
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalConfirmButton]}
                    onPress={showCustomModal.onConfirm}
                  >
                    <Text style={[styles.modalButtonText, { color: '#007AFF' }]}>确定</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFD',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  header: {
    ...HeaderStyles.borderedHeader,
  },
  backButton: {
    ...HeaderStyles.backButtonText,
  },
  backText: {
    ...HeaderStyles.backText,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A1A1A',
  },
  pageTitleContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1A1A1A',
  },
  clearButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  clearText: {
    fontSize: 14,
    color: '#FF3B30',
    fontWeight: '500',
  },
  contentCard: {
    margin: 16,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    ...Platform.select({
      ios: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
      android: {
        // elevation already handles shadow on Android
      },
      default: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
      },
    }),
    elevation: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F7FF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#4A90E2',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#4A90E2',
    marginLeft: 12,
    lineHeight: 20,
  },
  inputGroup: {
    marginTop: 8,
  },
  inputContainer: {
    marginBottom: 24,
    position: 'relative',
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginLeft: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1.5,
    borderColor: '#E9ECEF',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1A1A1A',
    fontWeight: '400',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  visibilityButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  clearInputButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  helperTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#888',
    marginLeft: 6,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginTop: 8,
    gap: 12,
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  testButton: {
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#4A90E2',
  },
  testButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4A90E2',
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    ...Platform.select({
      ios: {
        boxShadow: '0px 4px 8px rgba(74, 144, 226, 0.3)',
      },
      android: {
        // elevation already handles shadow on Android
      },
      default: {
        boxShadow: '0px 4px 8px rgba(74, 144, 226, 0.3)',
      },
    }),
    elevation: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  // 现代化弹窗样式
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 10,
    ...Platform.select({
      ios: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
      },
      android: {
        // elevation already handles shadow on Android
      },
      default: {
        boxShadow: '0px 4px 6px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalMessage: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButton: {
    borderRightWidth: 1,
    borderRightColor: '#f0f0f0',
  },
  modalConfirmButton: {
    // No additional styles needed for confirm button
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  buttonSeparator: {
    width: 1,
    backgroundColor: '#f0f0f0',
  },
});
