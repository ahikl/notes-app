import AsyncStorage from '@react-native-async-storage/async-storage';
import { ColorSchemeName } from 'react-native';

export type ThemeType = 'light' | 'dark' | 'auto';

const THEME_STORAGE_KEY = 'notes_theme_preference';

/**
 * 从存储中获取主题偏好
 * @returns 用户设置的主题偏好，默认为 'auto'
 */
export async function getThemePreference(): Promise<ThemeType> {
  try {
    const preference = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (preference === 'light' || preference === 'dark' || preference === 'auto') {
      return preference;
    }
    return 'auto';
  } catch (error) {
    console.error('获取主题偏好失败:', error);
    return 'auto';
  }
}

/**
 * 保存主题偏好到存储
 * @param theme 主题类型
 */
export async function saveThemePreference(theme: ThemeType): Promise<void> {
  try {
    await AsyncStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    console.error('保存主题偏好失败:', error);
  }
}

/**
 * 根据偏好和系统设置计算实际主题
 * @param preference 用户偏好
 * @param systemScheme 系统主题
 * @returns 实际应用的主题
 */
export function getEffectiveTheme(
  preference: ThemeType,
  systemScheme: ColorSchemeName,
): 'light' | 'dark' {
  if (preference === 'auto') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}
