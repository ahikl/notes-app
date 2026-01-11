import React, { createContext, ReactNode, useContext, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  Text,
  ToastAndroid,
  TouchableOpacity,
  View,
} from 'react-native';

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
  const [modalVisible, setModalVisible] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<
    'success' | 'error' | 'info' | 'warning'
  >('info');
  const fadeAnim = new Animated.Value(0);
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showCustomToast = (
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    setToastMessage(message);
    setToastVisible(true);

    setTimeout(() => {
      setToastVisible(false);
    }, 3000);
  };

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' = 'info',
  ) => {
    setNotificationMessage(message);
    setNotificationType(type);
    setModalVisible(true);

    // 动画效果
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const hideAlert = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
    });
  };

  const showSuccess = (message: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      showCustomToast(message, 'success');
    }
  };

  const showError = (message: string) => {
    showAlert('错误', message, 'error');
  };

  const showInfo = (message: string) => {
    showAlert('提示', message, 'info');
  };

  const showWarning = (message: string) => {
    showAlert('警告', message, 'warning');
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

      {/* 自定义模态通知 */}
      <Modal
        animationType="none"
        transparent={true}
        visible={modalVisible}
        onRequestClose={hideAlert}
      >
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={hideAlert}>
          <Animated.View style={[styles.modalContainer, { opacity: fadeAnim }]}>
            <View
              style={[
                styles.modalContent,
                { borderLeftColor: getNotificationColor(notificationType), borderLeftWidth: 5 },
              ]}
            >
              <Text style={styles.modalTitle}>
                {notificationType === 'error'
                  ? '错误'
                  : notificationType === 'warning'
                    ? '警告'
                    : notificationType === 'success'
                      ? '成功'
                      : '提示'}
              </Text>
              <Text style={styles.modalMessage}>{notificationMessage}</Text>
              <TouchableOpacity style={styles.modalButton} onPress={hideAlert}>
                <Text style={styles.modalButtonText}>确定</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </TouchableOpacity>
      </Modal>

      {/* Toast通知 */}
      {toastVisible && (
        <View style={styles.toastContainer}>
          <View style={[styles.toast, { backgroundColor: getNotificationColor('info') }]}>
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        </View>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContainer: {
    width: '80%',
    maxWidth: 300,
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  modalMessage: {
    fontSize: 16,
    marginBottom: 15,
    color: '#666',
    lineHeight: 22,
  },
  modalButton: {
    alignSelf: 'flex-end',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 5,
  },
  modalButtonText: {
    color: '#333',
    fontSize: 16,
  },
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
