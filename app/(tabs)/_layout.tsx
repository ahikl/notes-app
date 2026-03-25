import { useActualColorScheme } from '@/components/ThemeManager';
import Colors from '@/constants/Colors';
import { HeaderStyles } from '@/constants/HeaderStyles';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const router = useRouter();
  const theme = useActualColorScheme();

  return (
    <>
      <View
        style={[
          styles.headerContainer,
          {
            backgroundColor: Colors[theme].headerBackground,
            borderBottomColor: Colors[theme].headerBorder,
          },
        ]}
      >
        <View style={styles.titleContainer}>
          <Text style={[styles.activeTitle, { color: Colors[theme].text }]}>笔记</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color={Colors[theme].secondaryText} />
          </TouchableOpacity>
        </View>
      </View>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    ...HeaderStyles.standardHeader,
    borderBottomWidth: 1,
  },
  titleContainer: {
    flexDirection: 'row',
  },
  activeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 20,
  },
  inactiveTitle: {
    fontSize: 24,
    color: '#888',
    fontWeight: 'normal',
  },
  iconContainer: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 15,
  },
});
