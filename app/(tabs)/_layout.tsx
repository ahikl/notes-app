import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function TabLayout() {
  const router = useRouter();

  return (
    <>
      <View style={styles.headerContainer}>
        <View style={styles.titleContainer}>
          <Text style={styles.activeTitle}>笔记</Text>
        </View>
        <View style={styles.iconContainer}>
          <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/settings')}>
            <Ionicons name="settings-outline" size={24} color="#666" />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#fff',
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
