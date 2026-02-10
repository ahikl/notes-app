import { useNotification } from '@/components/NotificationManager';
import {
  decryptText,
  decryptTextWithStringKey,
  encryptText,
  encryptTextWithStringKey,
  generateEncryptionKey,
  generateRandomStringKey,
  sanitizeKey,
  validateEncryptedData,
  validateKeyFormat,
} from '@/utils/crypto/EncryptionUtils';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Button,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface OperationState {
  isLoading: boolean;
  operation: string | null;
}

const EncryptionExample: React.FC = () => {
  const [originalText, setOriginalText] = useState<string>('');
  const [encryptedText, setEncryptedText] = useState<string>('');
  const [decryptedText, setDecryptedText] = useState<string>('');
  const [key, setKey] = useState<string>('');
  const [stringKey, setStringKey] = useState<string>('');
  const [operationState, setOperationState] = useState<OperationState>({
    isLoading: false,
    operation: null,
  });
  const [keyStrength, setKeyStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [history, setHistory] = useState<
    { operation: string; timestamp: Date; success: boolean }[]
  >([]);

  const { showSuccess, showError, showInfo } = useNotification();

  // 计算密钥强度
  const calculateKeyStrength = useCallback((k: string): 'weak' | 'medium' | 'strong' | null => {
    if (!k || k.length < 8) return null;
    let score = 0;
    if (k.length >= 16) score++;
    if (k.length >= 32) score++;
    if (/[a-z]/.test(k)) score++;
    if (/[A-Z]/.test(k)) score++;
    if (/[0-9]/.test(k)) score++;
    if (/[^a-zA-Z0-9]/.test(k)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'medium';
    return 'strong';
  }, []);

  // 添加历史记录
  const addHistory = useCallback((operation: string, success: boolean) => {
    setHistory((prev) => [
      { operation, timestamp: new Date(), success },
      ...prev.slice(0, 9), // 只保留最近10条
    ]);
  }, []);

  // 开始操作
  const startOperation = useCallback((operation: string) => {
    setOperationState({ isLoading: true, operation });
  }, []);

  // 结束操作
  const endOperation = useCallback(() => {
    setOperationState({ isLoading: false, operation: null });
  }, []);

  const handleGenerateKey = async () => {
    startOperation('generateKey');
    try {
      const newKey = generateEncryptionKey();
      setKey(newKey);
      setKeyStrength('strong');
      showSuccess('已生成新的加密密钥 (256位)');
      addHistory('生成Base64密钥', true);
    } catch (error) {
      showError(`生成密钥失败: ${(error as Error).message}`);
      addHistory('生成Base64密钥', false);
    } finally {
      endOperation();
    }
  };

  const handleGenerateStringKey = async () => {
    startOperation('generateStringKey');
    try {
      const newKey = generateRandomStringKey(32);
      setStringKey(newKey);
      setKeyStrength(calculateKeyStrength(newKey));
      showSuccess('已生成新的字符串密钥 (32字符)');
      addHistory('生成字符串密钥', true);
    } catch (error) {
      showError(`生成密钥失败: ${(error as Error).message}`);
      addHistory('生成字符串密钥', false);
    } finally {
      endOperation();
    }
  };

  const handleEncrypt = async () => {
    if (!originalText.trim()) {
      showError('请输入要加密的文本');
      return;
    }
    if (!key) {
      showError('请先生成或输入密钥');
      return;
    }
    if (!validateKeyFormat(key)) {
      showError('密钥格式无效，必须是有效的base64编码且长度为16、24或32字节');
      return;
    }

    startOperation('encrypt');
    try {
      const encrypted = encryptText(originalText, key);
      setEncryptedText(encrypted);
      setDecryptedText(''); // 清空解密文本
      showSuccess('文本已加密成功');
      addHistory('加密 (Base64密钥)', true);
    } catch (error) {
      const errorMsg = (error as Error).message;
      showError(`加密失败: ${errorMsg}`);
      addHistory('加密 (Base64密钥)', false);
    } finally {
      endOperation();
    }
  };

  const handleDecrypt = async () => {
    if (!encryptedText.trim()) {
      showError('请先进行加密操作或输入加密文本');
      return;
    }
    if (!key) {
      showError('请先生成或输入密钥');
      return;
    }
    if (!validateEncryptedData(encryptedText)) {
      showError('加密数据格式无效，应为"iv:encryptedContent"格式');
      return;
    }
    if (!validateKeyFormat(key)) {
      showError('密钥格式无效');
      return;
    }

    startOperation('decrypt');
    try {
      const decrypted = decryptText(encryptedText, key);
      setDecryptedText(decrypted);
      showSuccess('文本已解密成功');
      addHistory('解密 (Base64密钥)', true);
    } catch (error) {
      const errorMsg = (error as Error).message;
      showError(`解密失败: ${errorMsg}`);
      addHistory('解密 (Base64密钥)', false);
    } finally {
      endOperation();
    }
  };

  const handleStringKeyEncrypt = async () => {
    if (!originalText.trim()) {
      showError('请输入要加密的文本');
      return;
    }
    if (!stringKey.trim()) {
      showError('请先生成或输入字符串密钥');
      return;
    }

    startOperation('stringEncrypt');
    try {
      const encrypted = encryptTextWithStringKey(originalText, stringKey);
      setEncryptedText(encrypted);
      setDecryptedText(''); // 清空解密文本
      showSuccess('文本已使用字符串密钥加密成功');
      addHistory('加密 (字符串密钥)', true);
    } catch (error) {
      const errorMsg = (error as Error).message;
      showError(`加密失败: ${errorMsg}`);
      addHistory('加密 (字符串密钥)', false);
    } finally {
      endOperation();
    }
  };

  const handleStringKeyDecrypt = async () => {
    if (!encryptedText.trim()) {
      showError('请先进行加密操作或输入加密文本');
      return;
    }
    if (!stringKey.trim()) {
      showError('请先生成或输入字符串密钥');
      return;
    }
    if (!validateEncryptedData(encryptedText)) {
      showError('加密数据格式无效');
      return;
    }

    startOperation('stringDecrypt');
    try {
      const decrypted = decryptTextWithStringKey(encryptedText, stringKey);
      setDecryptedText(decrypted);
      showSuccess('文本已使用字符串密钥解密成功');
      addHistory('解密 (字符串密钥)', true);
    } catch (error) {
      const errorMsg = (error as Error).message;
      showError(`解密失败: ${errorMsg}`);
      addHistory('解密 (字符串密钥)', false);
    } finally {
      endOperation();
    }
  };

  // 处理密钥输入变化
  const handleKeyChange = (text: string) => {
    setKey(text);
    if (text) {
      const isValid = validateKeyFormat(text);
      setKeyStrength(isValid ? 'strong' : null);
    } else {
      setKeyStrength(null);
    }
  };

  // 处理字符串密钥输入变化
  const handleStringKeyChange = (text: string) => {
    const sanitized = sanitizeKey(text);
    setStringKey(text);
    setKeyStrength(calculateKeyStrength(sanitized));
  };

  // 清空所有数据
  const handleClearAll = () => {
    setOriginalText('');
    setEncryptedText('');
    setDecryptedText('');
    setKey('');
    setStringKey('');
    setKeyStrength(null);
    showInfo('已清空所有数据');
  };

  // 复制加密文本到剪贴板
  const handleCopyEncrypted = () => {
    if (!encryptedText) {
      showError('没有可复制的加密文本');
      return;
    }
    // 在实际应用中，这里应该使用 Clipboard API
    showSuccess('加密文本已复制到剪贴板');
  };

  // 获取密钥强度颜色
  const getKeyStrengthColor = () => {
    switch (keyStrength) {
      case 'weak':
        return '#f44336';
      case 'medium':
        return '#ff9800';
      case 'strong':
        return '#4caf50';
      default:
        return '#999';
    }
  };

  // 获取密钥强度文本
  const getKeyStrengthText = () => {
    switch (keyStrength) {
      case 'weak':
        return '弱';
      case 'medium':
        return '中';
      case 'strong':
        return '强';
      default:
        return '';
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>AES 加密/解密示例</Text>

      {operationState.isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>
            {operationState.operation === 'encrypt' && '正在加密...'}
            {operationState.operation === 'decrypt' && '正在解密...'}
            {operationState.operation === 'stringEncrypt' && '正在加密...'}
            {operationState.operation === 'stringDecrypt' && '正在解密...'}
            {operationState.operation === 'generateKey' && '正在生成密钥...'}
            {operationState.operation === 'generateStringKey' && '正在生成密钥...'}
          </Text>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.label}>原文:</Text>
        <TextInput
          style={styles.input}
          value={originalText}
          onChangeText={setOriginalText}
          placeholder="输入要加密的文本"
          multiline
          numberOfLines={3}
          editable={!operationState.isLoading}
        />
        <Text style={styles.charCount}>{originalText.length} 字符</Text>
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="生成密钥"
          onPress={handleGenerateKey}
          color="#2196F3"
          disabled={operationState.isLoading}
        />
        <Button
          title="生成字符串密钥"
          onPress={handleGenerateStringKey}
          color="#2196F3"
          disabled={operationState.isLoading}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>Base64密钥:</Text>
          {key && (
            <Text
              style={[
                styles.keyStrength,
                { color: validateKeyFormat(key) ? '#4caf50' : '#f44336' },
              ]}
            >
              {validateKeyFormat(key) ? '有效' : '无效'}
            </Text>
          )}
        </View>
        <TextInput
          style={[styles.input, key && !validateKeyFormat(key) && styles.inputError]}
          value={key}
          onChangeText={handleKeyChange}
          placeholder="Base64格式的加密密钥"
          multiline
          numberOfLines={2}
          editable={!operationState.isLoading}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>字符串密钥:</Text>
          {keyStrength && (
            <Text style={[styles.keyStrength, { color: getKeyStrengthColor() }]}>
              强度: {getKeyStrengthText()}
            </Text>
          )}
        </View>
        <TextInput
          style={styles.input}
          value={stringKey}
          onChangeText={handleStringKeyChange}
          placeholder="字符串格式的加密密钥"
          multiline
          numberOfLines={2}
          editable={!operationState.isLoading}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="加密 (Base64密钥)"
          onPress={handleEncrypt}
          color="#4CAF50"
          disabled={operationState.isLoading}
        />
        <Button
          title="解密 (Base64密钥)"
          onPress={handleDecrypt}
          color="#FF9800"
          disabled={operationState.isLoading}
        />
      </View>

      <View style={styles.buttonRow}>
        <Button
          title="加密 (字符串密钥)"
          onPress={handleStringKeyEncrypt}
          color="#4CAF50"
          disabled={operationState.isLoading}
        />
        <Button
          title="解密 (字符串密钥)"
          onPress={handleStringKeyDecrypt}
          color="#FF9800"
          disabled={operationState.isLoading}
        />
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>加密后:</Text>
          {encryptedText && (
            <TouchableOpacity onPress={handleCopyEncrypted}>
              <Text style={styles.copyButton}>复制</Text>
            </TouchableOpacity>
          )}
        </View>
        <TextInput
          style={[styles.input, styles.encryptedInput]}
          value={encryptedText}
          onChangeText={setEncryptedText}
          placeholder="加密后的文本 (格式: iv:encryptedContent)"
          multiline
          numberOfLines={4}
          editable={!operationState.isLoading}
        />
        {encryptedText && !validateEncryptedData(encryptedText) && (
          <Text style={styles.errorText}>格式无效，应为 "iv:encryptedContent"</Text>
        )}
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
          editable={!operationState.isLoading}
        />
        {decryptedText && decryptedText === originalText && (
          <Text style={styles.successText}>解密成功，与原文匹配</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>操作历史:</Text>
          {history.length > 0 && (
            <TouchableOpacity onPress={() => setHistory([])}>
              <Text style={styles.clearHistoryButton}>清除</Text>
            </TouchableOpacity>
          )}
        </View>
        {history.length === 0 ? (
          <Text style={styles.emptyHistory}>暂无操作记录</Text>
        ) : (
          <View style={styles.historyContainer}>
            {history.map((item, index) => (
              <View key={index} style={styles.historyItem}>
                <Text
                  style={[styles.historyStatus, { color: item.success ? '#4caf50' : '#f44336' }]}
                >
                  {item.success ? '✓' : '✗'}
                </Text>
                <Text style={styles.historyText}>{item.operation}</Text>
                <Text style={styles.historyTime}>{item.timestamp.toLocaleTimeString()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.clearButtonContainer}>
        <Button
          title="清空所有数据"
          onPress={handleClearAll}
          color="#f44336"
          disabled={operationState.isLoading}
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
  loadingContainer: {
    alignItems: 'center',
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
  },
  loadingText: {
    marginTop: 8,
    color: '#2196F3',
    fontSize: 14,
  },
  section: {
    marginBottom: 15,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  keyStrength: {
    fontSize: 12,
    fontWeight: '600',
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
  inputError: {
    borderColor: '#f44336',
    backgroundColor: '#ffebee',
  },
  encryptedInput: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  charCount: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  copyButton: {
    color: '#2196F3',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#f44336',
    fontSize: 12,
    marginTop: 4,
  },
  successText: {
    color: '#4caf50',
    fontSize: 12,
    marginTop: 4,
  },
  clearButtonContainer: {
    marginTop: 20,
    marginBottom: 30,
  },
  historyContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  historyStatus: {
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
    width: 20,
  },
  historyText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  historyTime: {
    fontSize: 12,
    color: '#999',
  },
  emptyHistory: {
    color: '#999',
    fontStyle: 'italic',
    padding: 10,
  },
  clearHistoryButton: {
    color: '#f44336',
    fontSize: 14,
  },
});

export default EncryptionExample;
