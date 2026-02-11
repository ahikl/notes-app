import React, { createContext, ReactNode, useContext, useState } from 'react';
import { Platform, StyleSheet, Text, ToastAndroid, View } from 'react-native';

interface NotificationContextProps {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showInfo: (message: string) => void;
  showWarning: (message: string) => void;
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
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info' | 'warning'>('info');

  const showCustomToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    setToastMessage(message);
    setToastType(type);
    setToastVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  const showSuccess = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      showCustomToast(message, 'success');
    }
  };

  const showError = (message: string) => {
    // 使用 Toast 而不是模态框，避免阻塞用户交互
    showCustomToast(message, 'error');
  };

  const showInfo = (message: string) => {
    // 使用 Toast 而不是模态框，避免阻塞用户交互
    showCustomToast(message, 'info');
  };

  const showWarning = (message: string) => {
    // 使用 Toast 而不是模态框，避免阻塞用户交互
    showCustomToast(message, 'warning');
  };

  // 获取通知类型对应的颜色
  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'success':
        return '#4CAF50';
      case 'error':
        return '#F44336';
      case 'warning':
        return '#FF9800';
      case 'info':
      default:
        return '#2196F3';
    }
  };

  return (
    <>
      <NotificationContext.Provider
        value={{
          showSuccess,
          showError,
          showInfo,
          showWarning,
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
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
});
