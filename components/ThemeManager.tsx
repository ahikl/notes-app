import {
  ThemeType,
  getEffectiveTheme,
  getThemePreference,
  saveThemePreference,
} from '@/utils/theme/ThemeUtils';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

interface ThemeContextType {
  themePreference: ThemeType;
  effectiveTheme: 'light' | 'dark';
  setThemePreference: (theme: ThemeType) => Promise<void>;
  isLoading: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

/**
 * 获取实际生效的主题（light 或 dark）
 * 用于替代 react-native 的 useColorScheme
 */
export function useActualColorScheme(): 'light' | 'dark' {
  const systemScheme = useSystemColorScheme();
  const context = useContext(ThemeContext);

  if (context === undefined) {
    // 如果不在 Provider 中，回退到系统主题
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return context.effectiveTheme;
}

interface ThemeProviderProps {
  children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useSystemColorScheme();
  const [themePreference, setThemePreferenceState] = useState<ThemeType>('auto');
  const [isLoading, setIsLoading] = useState(true);

  // 初始化时加载保存的主题偏好
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const savedTheme = await getThemePreference();
        setThemePreferenceState(savedTheme);
      } catch (error) {
        console.error('加载主题偏好失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // 计算实际生效的主题
  const effectiveTheme = getEffectiveTheme(themePreference, systemColorScheme);

  // 设置主题偏好
  const setThemePreference = useCallback(async (theme: ThemeType) => {
    try {
      await saveThemePreference(theme);
      setThemePreferenceState(theme);
    } catch (error) {
      console.error('设置主题偏好失败:', error);
    }
  }, []);

  const value: ThemeContextType = {
    themePreference,
    effectiveTheme,
    setThemePreference,
    isLoading,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
