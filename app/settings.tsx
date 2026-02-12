import { useNotification } from '@/components/NotificationManager';
import { useTheme } from '@/components/ThemeManager';
import Colors from '@/constants/Colors';
import { HeaderStyles } from '@/constants/HeaderStyles';
import { synchronizeNotes } from '@/services';
import { ThemeType } from '@/utils/theme/ThemeUtils';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();
  const { showSuccess, showError } = useNotification();
  const { themePreference, setThemePreference, effectiveTheme } = useTheme();
  const [showThemeModal, setShowThemeModal] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  const openThemeModal = () => {
    setShowThemeModal(true);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  };

  const closeThemeModal = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setShowThemeModal(false);
    });
  };

  const handleThemeChange = async (theme: ThemeType) => {
    await setThemePreference(theme);
    closeThemeModal();
  };

  const getThemeLabel = (theme: ThemeType): string => {
    switch (theme) {
      case 'light':
        return '浅色';
      case 'dark':
        return '深色';
      case 'auto':
        return '自动适配';
      default:
        return '自动适配';
    }
  };

  const handleSyncNotes = async () => {
    try {
      const result = await synchronizeNotes();
      const totalChanges =
        (result.toUpdate?.length || 0) +
        (result.toDelete?.length || 0) +
        (result.toRestore?.length || 0);
      showSuccess(`同步成功！更新了 ${totalChanges} 条笔记。`);
    } catch (error) {
      console.error('同步失败:', error);
      showError('笔记同步失败，请检查网络连接和API设置。');
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: Colors[effectiveTheme].background }]}
    >
      <View
        style={[
          styles.header,
          {
            backgroundColor: Colors[effectiveTheme].headerBackground,
            borderBottomColor: Colors[effectiveTheme].headerBorder,
          },
        ]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors[effectiveTheme].text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: Colors[effectiveTheme].text }]}>设置</Text>
      </View>

      <View style={styles.content}>
        {/* 主题设置区域 */}
        <Text style={[styles.sectionTitle, { color: Colors[effectiveTheme].secondaryText }]}>
          外观
        </Text>
        <TouchableOpacity onPress={openThemeModal}>
          <View
            style={[
              styles.optionItem,
              {
                backgroundColor: Colors[effectiveTheme].optionBackground,
                borderColor: Colors[effectiveTheme].optionBorder,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: Colors[effectiveTheme].text }]}>主题</Text>
            <View style={styles.themeValueContainer}>
              <Text
                style={[styles.themeValueText, { color: Colors[effectiveTheme].secondaryText }]}
              >
                {getThemeLabel(themePreference)}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={Colors[effectiveTheme].tabIconDefault}
              />
            </View>
          </View>
        </TouchableOpacity>

        {/* 主题选择模态框 */}
        <Modal
          animationType="none"
          transparent={true}
          visible={showThemeModal}
          onRequestClose={closeThemeModal}
        >
          <TouchableWithoutFeedback onPress={closeThemeModal}>
            <View style={styles.modalOverlay}>
              <TouchableWithoutFeedback>
                <Animated.View
                  style={[
                    styles.modalContent,
                    {
                      backgroundColor: Colors[effectiveTheme].dropdownBackground,
                      opacity: fadeAnim,
                    },
                  ]}
                >
                  <Text style={[styles.modalTitle, { color: Colors[effectiveTheme].text }]}>
                    选择主题
                  </Text>
                  {(['light', 'dark', 'auto'] as ThemeType[]).map((theme, index) => (
                    <TouchableOpacity
                      key={theme}
                      style={[
                        styles.modalOption,
                        index < 2 && {
                          borderBottomWidth: 1,
                          borderBottomColor: Colors[effectiveTheme].optionBorder,
                        },
                      ]}
                      onPress={() => handleThemeChange(theme)}
                    >
                      <Text
                        style={[
                          styles.modalOptionText,
                          { color: Colors[effectiveTheme].text },
                          themePreference === theme && {
                            color: Colors[effectiveTheme].primary,
                            fontWeight: '600',
                          },
                        ]}
                      >
                        {getThemeLabel(theme)}
                      </Text>
                      {themePreference === theme && (
                        <Ionicons
                          name="checkmark"
                          size={22}
                          color={Colors[effectiveTheme].primary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </Animated.View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>

        <Text style={[styles.sectionTitle, { color: Colors[effectiveTheme].secondaryText }]}>
          设置
        </Text>
        <TouchableOpacity onPress={() => router.push('/server-settings')}>
          <View
            style={[
              styles.optionItem,
              {
                backgroundColor: Colors[effectiveTheme].optionBackground,
                borderColor: Colors[effectiveTheme].optionBorder,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: Colors[effectiveTheme].text }]}>
              server设置
            </Text>
            <Ionicons
              name="chevron-forward"
              size={20}
              color={Colors[effectiveTheme].tabIconDefault}
            />
          </View>
        </TouchableOpacity>

        <View
          style={[
            styles.optionItem,
            {
              backgroundColor: Colors[effectiveTheme].optionBackground,
              borderColor: Colors[effectiveTheme].optionBorder,
            },
          ]}
        >
          <Text style={[styles.optionText, { color: Colors[effectiveTheme].text }]}>通知设置</Text>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={Colors[effectiveTheme].tabIconDefault}
          />
        </View>

        <TouchableOpacity onPress={handleSyncNotes}>
          <View
            style={[
              styles.optionItem,
              {
                backgroundColor: Colors[effectiveTheme].optionBackground,
                borderColor: Colors[effectiveTheme].optionBorder,
              },
            ]}
          >
            <Text style={[styles.optionText, { color: Colors[effectiveTheme].text }]}>
              同步笔记
            </Text>
            <Ionicons name="sync" size={20} color={Colors[effectiveTheme].tabIconDefault} />
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    ...HeaderStyles.simpleHeader,
  },
  backButton: {
    ...HeaderStyles.backButton,
  },
  headerTitle: {
    ...HeaderStyles.headerTitle,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    marginTop: 15,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 16,
  },
  themeValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeValueText: {
    fontSize: 16,
    marginRight: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  modalContent: {
    borderRadius: 12,
    width: '100%',
    maxWidth: 300,
    overflow: 'hidden',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  modalOptionText: {
    fontSize: 16,
  },
  versionText: {
    fontSize: 16,
    color: '#888',
  },
});
