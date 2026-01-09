import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// 存储键名和默认值
const API_KEY_STORAGE_KEY = 'notes_api_key'; // API密钥存储的键名
const API_URL_STORAGE_KEY = 'notes_api_url'; // API URL存储的键名
const ENCRYPTION_KEY_STORAGE_KEY = 'notes_encryption_key'; // 加密密钥存储的键名
const API_KEY_REGEX = /^[A-Za-z0-9\-_]+$/;

// 保存API密钥到安全存储中
export const saveApiKey = async (apiKey: string): Promise<void> =>
  SecureStore.setItemAsync(API_KEY_STORAGE_KEY, apiKey);

// 从安全存储中获取API密钥
export const getApiKey = async (): Promise<string | null> =>
  SecureStore.getItemAsync(API_KEY_STORAGE_KEY);

// 删除存储的API密钥
export const removeApiKey = async (): Promise<void> =>
  SecureStore.deleteItemAsync(API_KEY_STORAGE_KEY);

// 验证API密钥格式
export const isValidApiKey = (apiKey: string): boolean =>
  apiKey.trim().length > 0 && API_KEY_REGEX.test(apiKey);

// 从环境变量或安全存储中获取API密钥
export const getApiKeyWithFallback = async (): Promise<string | null> => {
  const envApiKey = process.env.NEXT_PUBLIC_API_KEY || process.env.EXPO_PUBLIC_API_KEY;
  return envApiKey && isValidApiKey(envApiKey) ? envApiKey : await getApiKey();
};

// 添加API URL的存储相关函数
// 保存API URL到存储中
export const saveApiUrl = async (apiUrl: string): Promise<void> =>
  AsyncStorage.setItem(API_URL_STORAGE_KEY, apiUrl);

// 从存储中获取API URL
export const getApiUrl = async (): Promise<string | null> =>
  AsyncStorage.getItem(API_URL_STORAGE_KEY);

// 删除存储的API URL
export const removeApiUrl = async (): Promise<void> => AsyncStorage.removeItem(API_URL_STORAGE_KEY);

// 验证API URL格式
export const isValidApiUrl = (apiUrl: string): boolean => {
  try {
    // 开发环境允许HTTP和HTTPS，生产环境只允许HTTPS
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isValidProtocol = isDevelopment
      ? apiUrl.startsWith('http://') || apiUrl.startsWith('https://')
      : apiUrl.startsWith('https://');
    return isValidProtocol ? !!new URL(apiUrl) : apiUrl.length > 0;
  } catch {
    return false;
  }
};

// 添加加密密钥的存储相关函数
// 保存加密密钥到安全存储中
export const saveEncryptionKey = async (encryptionKey: string): Promise<void> =>
  SecureStore.setItemAsync(ENCRYPTION_KEY_STORAGE_KEY, encryptionKey);

// 从安全存储中获取加密密钥
export const getEncryptionKey = async (): Promise<string | null> =>
  SecureStore.getItemAsync(ENCRYPTION_KEY_STORAGE_KEY);

// 删除存储的加密密钥
export const removeEncryptionKey = async (): Promise<void> =>
  SecureStore.deleteItemAsync(ENCRYPTION_KEY_STORAGE_KEY);
