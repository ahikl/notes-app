import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// 存储键名和默认值
const API_KEY_STORAGE_KEY = 'notes_api_key';
const BASE_URL_STORAGE_KEY = 'notes_base_url';
const DEFAULT_BASE_URL = '/api/notes';
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

// 保存Base URL到存储中
export const saveBaseUrl = async (baseUrl: string): Promise<void> =>
  AsyncStorage.setItem(BASE_URL_STORAGE_KEY, baseUrl);

// 从存储中获取Base URL，确保以斜杠结尾
export const getBaseUrl = async (): Promise<string> => {
  const baseUrl = await AsyncStorage.getItem(BASE_URL_STORAGE_KEY);
  const result = baseUrl ?? DEFAULT_BASE_URL;
  return result.replace(/\/?$/, '/');
};

// 删除存储的Base URL（恢复为默认值）
export const removeBaseUrl = async (): Promise<void> =>
  AsyncStorage.removeItem(BASE_URL_STORAGE_KEY);

// 验证Base URL格式
export const isValidBaseUrl = (baseUrl: string): boolean => {
  try {
    // 开发环境允许HTTP和HTTPS，生产环境只允许HTTPS
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isValidProtocol = isDevelopment
      ? baseUrl.startsWith('http://') || baseUrl.startsWith('https://')
      : baseUrl.startsWith('https://');
    return isValidProtocol ? !!new URL(baseUrl) : baseUrl.length > 0;
  } catch {
    return false;
  }
};
