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
import { generateEncryptionKey } from '@/utils/crypto/EncryptionUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ServerSettingsNativeScreen() {
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
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} className="flex-1 bg-gray-50">
          {/* 顶部导航栏 */}
          <View className="flex-row items-center justify-between p-4 border-b border-gray-200">
            <TouchableOpacity onPress={() => router.back()} className="p-2">
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </TouchableOpacity>
            <Text className="text-xl font-semibold text-gray-800">服务器设置</Text>
            <View className="w-10" /> {/* 占位符保持对称 */}
          </View>

          {/* 表单区域 */}
          <View className="p-4 space-y-4">
            {/* API URL 输入 */}
            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700">API URL</Text>
              <View className="border border-gray-300 rounded-lg overflow-hidden">
                <TextInput
                  value={apiUrl}
                  onChangeText={setApiUrl}
                  placeholder="https://your-api.example.com"
                  className="p-3 text-base text-gray-800 bg-white"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                />
              </View>
            </View>

            {/* API Key 输入 */}
            <View className="space-y-2">
              <Text className="text-sm font-medium text-gray-700">API 密钥</Text>
              <View className="flex-row border border-gray-300 rounded-lg overflow-hidden">
                <TextInput
                  value={apiKey}
                  onChangeText={setApiKey}
                  placeholder="输入API密钥"
                  secureTextEntry={!showApiKey}
                  className="flex-1 p-3 text-base text-gray-800 bg-white"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowApiKey(!showApiKey)}
                  className="justify-center px-3 border-l border-gray-300"
                >
                  <Ionicons name={showApiKey ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>

            {/* 加密密码输入 */}
            <View className="space-y-2">
              <View className="flex-row justify-between items-center">
                <Text className="text-sm font-medium text-gray-700">加密密钥</Text>
                <TouchableOpacity
                  onPress={handleGenerateRandomKey}
                  className="flex-row items-center px-3 py-1 bg-blue-500 rounded-full"
                >
                  <Ionicons name="refresh" size={16} color="white" />
                  <Text className="ml-1 text-xs font-medium text-white">生成密钥</Text>
                </TouchableOpacity>
              </View>

              <View className="flex-row border border-gray-300 rounded-lg overflow-hidden">
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="输入加密密钥"
                  secureTextEntry={!showPassword}
                  className="flex-1 p-3 text-base text-gray-800 bg-white"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  className="justify-center px-3 border-l border-gray-300"
                >
                  <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#6B7280" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* 底部按钮 */}
        <View className="p-4 border-t border-gray-200 bg-white">
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            className={`py-4 rounded-xl items-center ${isSaving ? 'bg-gray-400' : 'bg-blue-500'}`}
          >
            {isSaving ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-lg font-semibold">保存设置</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 自定义模态框 */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showCustomModal.visible}
        onRequestClose={closeModal}
      >
        <View className="flex-1 justify-center items-center bg-black bg-opacity-50 p-4">
          <View className="w-full max-w-md bg-white rounded-xl p-6 space-y-4">
            <Text className="text-xl font-bold text-gray-800 text-center">
              {showCustomModal.title}
            </Text>
            <Text className="text-base text-gray-600 text-center">{showCustomModal.message}</Text>

            {showCustomModal.type === 'confirm' ? (
              <View className="flex-row justify-between mt-4">
                <TouchableOpacity
                  onPress={showCustomModal.onCancel}
                  className="flex-1 mr-2 py-3 bg-gray-200 rounded-lg items-center"
                >
                  <Text className="text-gray-800 font-medium">取消</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={showCustomModal.onConfirm}
                  className="flex-1 ml-2 py-3 bg-blue-500 rounded-lg items-center"
                >
                  <Text className="text-white font-medium">确定</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={showCustomModal.onConfirm}
                className="mt-4 py-3 bg-blue-500 rounded-lg items-center"
              >
                <Text className="text-white font-medium">确定</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
