import React, { useState } from 'react';
import { Button, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import {
  decryptText,
  decryptTextWithStringKey,
  encryptText,
  encryptTextWithStringKey,
  generateEncryptionKey,
  generateRandomStringKey,
} from '@/utils/crypto/EncryptionUtils';
import { useNotification } from '@/components/NotificationManager';

const EncryptionExample: React.FC = () => {
  const [originalText, setOriginalText] = useState<string>('');
  const [encryptedText, setEncryptedText] = useState<string>('');
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [key, setKey] = useState<string>('');
  const [stringKey, setStringKey] = useState<string>('');

  const { showSuccess, showError } = useNotification();

  const handleGenerateKey = () => {
    const newKey = generateEncryptionKey();
    setKey(newKey);
    showSuccess('已生成新的加密密钥');
  };

  const handleGenerateStringKey = () => {
    const newKey = generateRandomStringKey();
    setStringKey(newKey);
    showSuccess('已生成新的字符串密钥');
  };

  const handleEncrypt = () => {
    if (!originalText) {
      showError('请输入要加密的文本');
      return;
    }
    if (!key) {
      showError('请先生成或输入密钥');
      return;
    }

    try {
      const encrypted = encryptText(originalText, key);
      setEncryptedText(encrypted);
      setDecryptedText(''); // 清空解密文本
      showSuccess('文本已加密');
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleDecrypt = () => {
    if (!encryptedText) {
      showError('请先进行加密操作或输入加密文本');
      return;
    }
    if (!key) {
      showError('请先生成或输入密钥');
      return;
    }

    try {
      const decrypted = decryptText(encryptedText, key);
      setDecryptedText(decrypted);
      showSuccess('文本已解密');
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleStringKeyEncrypt = () => {
    if (!originalText) {
      showError('请输入要加密的文本');
      return;
    }
    if (!stringKey) {
      showError('请先生成或输入字符串密钥');
      return;
    }

    try {
      const encrypted = encryptTextWithStringKey(originalText, stringKey);
      setEncryptedText(encrypted);
      setDecryptedText(''); // 清空解密文本
      showSuccess('文本已使用字符串密钥加密');
    } catch (error) {
      showError((error as Error).message);
    }
  };

  const handleStringKeyDecrypt = () => {
    if (!encryptedText) {
      showError('请先进行加密操作或输入加密文本');
      return;
    }
    if (!stringKey) {
      showError('请先生成或输入字符串密钥');
      return;
    }

    try {
      const decrypted = decryptTextWithStringKey(encryptedText, stringKey);
      setDecryptedText(decrypted);
      showSuccess('文本已使用字符串密钥解密');
    } catch (error) {
      showError((error as Error).message);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AES 加密/解密示例</Text>

      <View style={styles.section}>
        <Text style={styles.label}>原文:</Text>
        <TextInput
          style={styles.input}
          value={originalText}
          onChangeText={setOriginalText}
          placeholder="输入要加密的文本"
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button title="生成密钥" onPress={handleGenerateKey} color="#2196F3" />
        <Button title="生成字符串密钥" onPress={handleGenerateStringKey} color="#2196F3" />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Base64密钥:</Text>
        <TextInput
          style={styles.input}
          value={key}
          onChangeText={setKey}
          placeholder="Base64格式的加密密钥"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>字符串密钥:</Text>
        <TextInput
          style={styles.input}
          value={stringKey}
          onChangeText={setStringKey}
          placeholder="字符串格式的加密密钥"
          multiline
          numberOfLines={2}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button title="加密 (Base64密钥)" onPress={handleEncrypt} color="#4CAF50" />
        <Button title="解密 (Base64密钥)" onPress={handleDecrypt} color="#FF9800" />
      </View>

      <View style={styles.buttonRow}>
        <Button title="加密 (字符串密钥)" onPress={handleStringKeyEncrypt} color="#4CAF50" />
        <Button title="解密 (字符串密钥)" onPress={handleStringKeyDecrypt} color="#FF9800" />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>加密后:</Text>
        <TextInput
          style={styles.input}
          value={encryptedText}
          onChangeText={setEncryptedText}
          placeholder="加密后的文本"
          multiline
          numberOfLines={4}
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>解密后:</Text>
        <TextInput
          style={styles.input}
          value={decryptedText}
          onChangeText={setDecryptedText}
          placeholder="解密后的文本"
          multiline
          numberOfLines={3}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  section: {
    marginBottom: 15,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    backgroundColor: '#fff',
    minHeight: 50,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
});

export default EncryptionExample;
