import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider as NavigationThemeProvider,
} from '@react-navigation/native';
import { Buffer } from 'buffer';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-get-random-values';
import 'react-native-reanimated';

import { NotificationProvider } from '@/components/NotificationManager';
import { ThemeProvider, useActualColorScheme } from '@/components/ThemeManager';
import { initLocalStorage } from '@/services';
import AppInitializationService from '@/services/AppInitializationService';

if (typeof global.Buffer === 'undefined') {
  global.Buffer = Buffer;
}
export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

export const unstable_settings = {
  // Ensure that reloading on `/modal` keeps a back button present.
  initialRouteName: '(tabs)',
};

// Prevent the splash screen from auto-hiding before asset loading is complete.
void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [isStorageInitialized, setIsStorageInitialized] = useState(false);

  // 初始化本地存储和定时任务服务
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // 先初始化本地存储（包含数据库和加密服务）
        await initLocalStorage();
        setIsStorageInitialized(true);

        // 再初始化定时任务服务
        await AppInitializationService.initialize();
      } catch (error) {
        console.error('应用初始化失败:', error);
      }
    };

    initializeApp();
  }, []);

  // Expo Router uses Error Boundaries to catch errors in the navigation tree.
  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  // 等待字体加载和存储初始化完成
  if (!loaded || !isStorageInitialized) {
    return null;
  }

  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  const effectiveTheme = useActualColorScheme();
  const isDark = effectiveTheme === 'dark';

  return (
    <NavigationThemeProvider value={isDark ? DarkTheme : DefaultTheme}>
      <NotificationProvider>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="edit" options={{ headerShown: false }} />
          <Stack.Screen name="settings" options={{ headerShown: false }} />
          <Stack.Screen name="server-settings" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        </Stack>
        {/* 状态栏样式：浅色模式使用深色文字，深色模式使用浅色文字 */}
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </NotificationProvider>
    </NavigationThemeProvider>
  );
}
