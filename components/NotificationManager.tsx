import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Platform, StyleSheet, Text, ToastAndroid, useColorScheme, View } from 'react-native';

interface NotificationContextProps {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
  showLoading: (message: string) => void;
  hideLoading: () => void;
}

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const theme = systemColorScheme === 'dark' ? 'dark' : 'light';

  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning' | 'loading'>(
    'info',
  );
  const [loadingVisible, setLoadingVisible] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');

  const showCustomToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'loading' = 'info',
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  const showLoading = (message: string) => {
    setLoadingMessage(message);
    setLoadingVisible(true);
  };

  const hideLoading = () => {
    setLoadingVisible(false);
  };

  const showSuccess = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      showCustomToast(message, 'success');
    }
  };

  const showError = (message: string) => {
    showCustomToast(message, 'error');
  };

  const showInfo = (message: string) => {
    showCustomToast(message, 'info');
  };

  const showWarning = (message: string) => {
    showCustomToast(message, 'warning');
  };

  // 获取通知类型对应的颜色
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return theme === 'dark' ? 'rgba(76, 175, 80, 0.85)' : 'rgba(76, 175, 80, 0.9)';
      case 'error':
        return theme === 'dark' ? 'rgba(244, 67, 54, 0.85)' : 'rgba(244, 67, 54, 0.9)';
      case 'warning':
        return theme === 'dark' ? 'rgba(255, 152, 0, 0.85)' : 'rgba(255, 152, 0, 0.9)';
      case 'loading':
        return theme === 'dark' ? 'rgba(176, 176, 176, 0.85)' : 'rgba(117, 117, 117, 0.9)';
      case 'info':
      default:
        return theme === 'dark' ? 'rgba(10, 132, 255, 0.85)' : 'rgba(47, 149, 220, 0.9)';
    }
  };

  const getLoadingBackgroundColor = () => {
    return theme === 'dark' ? 'rgba(60, 60, 60, 0.85)' : 'rgba(50, 50, 50, 0.85)';
  };

  const getLoadingTextColor = () => {
    return 'rgba(255, 255, 255, 0.95)';
  };

  return (
    <>
      <NotificationContext.Provider
        value={{
          showSuccess,
          showError,
          showInfo,
          showWarning,
          showLoading,
          hideLoading,
        }}
      >
        {children}
      </NotificationContext.Provider>

      {/* Toast通知 - 非阻塞性提示 */}
      {toastVisible && (
        <View style={styles.toastContainer} pointerEvents="none">
          <View style={[styles.toast, { backgroundColor: getNotificationColor(toastType) }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}

      {/* 加载提示 - 底部显示 */}
      {loadingVisible && (
        <View style={styles.loadingContainer} pointerEvents="none">
          <View style={[styles.loadingToast, { backgroundColor: getLoadingBackgroundColor() }]}>
            <Text style={[styles.loadingText, { color: getLoadingTextColor() }]}>
              {loadingMessage}
            </Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    top: 80,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  toast: {
    padding: 15,
    borderRadius: 8,
    minWidth: 200,
  },
  toastText: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  loadingToast: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  loadingText: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});
