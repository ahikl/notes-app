import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SettingsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>设置</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>账户设置</Text>
        <View style={styles.optionItem}>
          <Text style={styles.optionText}>个人资料</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>

        <Text style={styles.sectionTitle}>应用设置</Text>
        <View style={styles.optionItem}>
          <Text style={styles.optionText}>主题设置</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
        <View style={styles.optionItem}>
          <Text style={styles.optionText}>通知设置</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>
        <View style={styles.optionItem}>
          <Text style={styles.optionText}>隐私设置</Text>
          <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </View>

        <Text style={styles.sectionTitle}>关于</Text>
        <View style={styles.optionItem}>
          <Text style={styles.optionText}>版本信息</Text>
          <Text style={styles.versionText}>v1.0.0</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 5,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 10,
    marginTop: 15,
  },
  optionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  optionText: {
    fontSize: 16,
    color: '#333',
  },
  versionText: {
    fontSize: 16,
    color: '#888',
  },
});
