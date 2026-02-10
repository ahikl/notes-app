import { CryptoError, CryptoService } from '@/services/crypto/CryptoService';
import { EncryptedData, EncryptionKey, EncryptionOptions } from '@/types/crypto/CryptoTypes';

/**
 * 加密工具错误
 */
export class EncryptionUtilsError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'EncryptionUtilsError';
  }
}

/**
 * 加密工具函数
 * 基于CryptoService提供便捷的加密功能
 */

/**
 * 验证base64字符串是否有效
 * @param str 要验证的字符串
 * @returns 是否有效
 */
export const isValidBase64 = (str: string): boolean => {
  return CryptoService.isValidBase64(str);
};

/**
 * 验证密钥格式是否有效
 * @param keyBase64 base64格式的密钥
 * @returns 是否有效
 */
export const validateKeyFormat = (keyBase64: string): boolean => {
  if (!keyBase64 || typeof keyBase64 !== 'string') {
    return false;
  }
  // 检查是否为有效的base64
  if (!isValidBase64(keyBase64)) {
    return false;
  }
  // 检查解码后的长度
  try {
    const decoded = Buffer.from(keyBase64, 'base64');
    // AES密钥长度必须是16、24或32字节
    return decoded.length === 16 || decoded.length === 24 || decoded.length === 32;
  } catch {
    return false;
  }
};

/**
 * 验证加密数据格式是否有效
 * @param data 加密数据（格式: iv:encryptedContent）
 * @returns 是否有效
 */
export const validateEncryptedData = (data: string): boolean => {
  if (!data || typeof data !== 'string') {
    return false;
  }
  const parts = data.split(':');
  if (parts.length !== 2) {
    return false;
  }
  const [ivBase64, encryptedContent] = parts;
  // 验证IV部分
  if (!ivBase64 || !isValidBase64(ivBase64)) {
    return false;
  }
  // 验证IV长度（16字节 = 24个base64字符）
  try {
    const iv = Buffer.from(ivBase64, 'base64');
    if (iv.length !== 16) {
      return false;
    }
  } catch {
    return false;
  }
  // 验证加密内容部分
  if (!encryptedContent || encryptedContent.length === 0) {
    return false;
  }
  return true;
};

/**
 * 清理密钥字符串
 * @param key 原始密钥字符串
 * @returns 清理后的密钥
 */
export const sanitizeKey = (key: string): string => {
  if (!key || typeof key !== 'string') {
    return '';
  }
  // 移除前后空白字符
  let sanitized = key.trim();
  // 移除所有空白字符
  sanitized = sanitized.replace(/\s/g, '');
  return sanitized;
};

/**
 * 生成AES加密密钥
 * @param length 密钥长度，默认32字节(256位)
 * @returns base64格式的密钥字符串
 */
export const generateEncryptionKey = (length: number = 32): string => {
  try {
    if (length !== 16 && length !== 24 && length !== 32) {
      throw new EncryptionUtilsError('密钥长度必须是16、24或32字节', 'INVALID_KEY_LENGTH');
    }
    const key = CryptoService.generateRandomKey(length);
    return CryptoService.keyToBase64(key);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`生成密钥失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('生成加密密钥失败', 'KEY_GENERATION_FAILED', error as Error);
  }
};

/**
 * 生成带元数据的加密密钥
 * @param length 密钥长度，默认32字节(256位)
 * @param algorithm 加密算法，默认为aes-256-cbc
 * @returns 包含元数据的加密密钥对象
 */
export const generateEncryptionKeyWithMetadata = (
  length: number = 32,
  algorithm: string = 'aes-256-cbc',
): EncryptionKey => {
  try {
    if (length !== 16 && length !== 24 && length !== 32) {
      throw new EncryptionUtilsError('密钥长度必须是16、24或32字节', 'INVALID_KEY_LENGTH');
    }
    const supportedAlgorithms = ['aes-256-cbc', 'aes-192-cbc', 'aes-128-cbc'];
    if (!supportedAlgorithms.includes(algorithm)) {
      throw new EncryptionUtilsError(
        `不支持的加密算法: ${algorithm}. 支持的算法: ${supportedAlgorithms.join(', ')}`,
        'INVALID_ALGORITHM',
      );
    }
    return CryptoService.generateEncryptionKey(length, algorithm);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`生成密钥失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('生成加密密钥失败', 'KEY_GENERATION_FAILED', error as Error);
  }
};

/**
 * 加密文本数据
 * @param text 要加密的文本
 * @param keyBase64 base64格式的密钥
 * @returns 加密后的数据(base64格式)
 */
export const encryptText = (text: string, keyBase64: string): string => {
  try {
    // 验证输入
    if (!text || typeof text !== 'string') {
      throw new EncryptionUtilsError('要加密的文本不能为空', 'INVALID_DATA');
    }
    if (!validateKeyFormat(keyBase64)) {
      throw new EncryptionUtilsError(
        '密钥格式无效，必须是有效的base64编码且长度为16、24或32字节',
        'INVALID_KEY_FORMAT',
      );
    }
    const key = CryptoService.keyFromBase64(keyBase64);
    return CryptoService.encrypt(text, key);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`加密失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('加密文本失败', 'ENCRYPTION_FAILED', error as Error);
  }
};

/**
 * 加密文本数据并返回包含元数据的对象
 * @param text 要加密的文本
 * @param keyBase64 base64格式的密钥
 * @param options 加密选项
 * @returns 包含加密数据和元数据的对象
 */
export const encryptTextWithMetadata = (
  text: string,
  keyBase64: string,
  options?: EncryptionOptions,
): EncryptedData => {
  try {
    // 验证输入
    if (!text || typeof text !== 'string') {
      throw new EncryptionUtilsError('要加密的文本不能为空', 'INVALID_DATA');
    }
    if (!validateKeyFormat(keyBase64)) {
      throw new EncryptionUtilsError(
        '密钥格式无效，必须是有效的base64编码且长度为16、24或32字节',
        'INVALID_KEY_FORMAT',
      );
    }
    const key = CryptoService.keyFromBase64(keyBase64);
    return CryptoService.encryptWithMetadata(text, key, options);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`加密失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('加密文本失败', 'ENCRYPTION_FAILED', error as Error);
  }
};

/**
 * 解密文本数据
 * @param encryptedText 加密的文本数据
 * @param keyBase64 base64格式的密钥
 * @returns 解密后的原始文本
 */
export const decryptText = (encryptedText: string, keyBase64: string): string => {
  try {
    // 验证输入
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new EncryptionUtilsError('要解密的文本不能为空', 'INVALID_DATA');
    }
    if (!validateEncryptedData(encryptedText)) {
      throw new EncryptionUtilsError(
        '加密数据格式无效，应为"iv:encryptedContent"格式',
        'INVALID_ENCRYPTED_FORMAT',
      );
    }
    if (!validateKeyFormat(keyBase64)) {
      throw new EncryptionUtilsError(
        '密钥格式无效，必须是有效的base64编码且长度为16、24或32字节',
        'INVALID_KEY_FORMAT',
      );
    }
    const key = CryptoService.keyFromBase64(keyBase64);
    return CryptoService.decrypt(encryptedText, key);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`解密失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('解密文本失败', 'DECRYPTION_FAILED', error as Error);
  }
};

/**
 * 从包含元数据的加密对象中解密文本数据
 * @param encryptedData 包含加密数据和元数据的对象
 * @param keyBase64 base64格式的密钥
 * @returns 解密后的原始文本
 */
export const decryptTextWithMetadata = (
  encryptedData: EncryptedData,
  keyBase64: string,
): string => {
  try {
    // 验证输入
    if (!encryptedData || typeof encryptedData !== 'object') {
      throw new EncryptionUtilsError('加密数据对象不能为空', 'INVALID_DATA');
    }
    if (!encryptedData.encrypted || !encryptedData.iv) {
      throw new EncryptionUtilsError(
        '加密数据对象缺少必要字段(encrypted, iv)',
        'INVALID_ENCRYPTED_FORMAT',
      );
    }
    if (!validateKeyFormat(keyBase64)) {
      throw new EncryptionUtilsError(
        '密钥格式无效，必须是有效的base64编码且长度为16、24或32字节',
        'INVALID_KEY_FORMAT',
      );
    }
    const key = CryptoService.keyFromBase64(keyBase64);
    return CryptoService.decryptWithMetadata(encryptedData, key);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`解密失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('解密文本失败', 'DECRYPTION_FAILED', error as Error);
  }
};

/**
 * 使用字符串密钥加密文本
 * @param text 要加密的文本
 * @param keyString 字符串格式的密钥
 * @returns 加密后的数据(base64格式)
 */
export const encryptTextWithStringKey = (text: string, keyString: string): string => {
  try {
    // 验证输入
    if (!text || typeof text !== 'string') {
      throw new EncryptionUtilsError('要加密的文本不能为空', 'INVALID_DATA');
    }
    if (!keyString || typeof keyString !== 'string') {
      throw new EncryptionUtilsError('密钥不能为空', 'INVALID_KEY');
    }
    const sanitizedKey = sanitizeKey(keyString);
    if (sanitizedKey.length === 0) {
      throw new EncryptionUtilsError('密钥不能为空或仅包含空白字符', 'INVALID_KEY');
    }
    return CryptoService.encryptWithKeyString(text, sanitizedKey);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`加密失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('加密文本失败', 'ENCRYPTION_FAILED', error as Error);
  }
};

/**
 * 使用字符串密钥解密文本
 * @param encryptedText 加密的文本数据
 * @param keyString 字符串格式的密钥
 * @returns 解密后的原始文本
 */
export const decryptTextWithStringKey = (encryptedText: string, keyString: string): string => {
  try {
    // 验证输入
    if (!encryptedText || typeof encryptedText !== 'string') {
      throw new EncryptionUtilsError('要解密的文本不能为空', 'INVALID_DATA');
    }
    if (!validateEncryptedData(encryptedText)) {
      throw new EncryptionUtilsError(
        '加密数据格式无效，应为"iv:encryptedContent"格式',
        'INVALID_ENCRYPTED_FORMAT',
      );
    }
    if (!keyString || typeof keyString !== 'string') {
      throw new EncryptionUtilsError('密钥不能为空', 'INVALID_KEY');
    }
    const sanitizedKey = sanitizeKey(keyString);
    if (sanitizedKey.length === 0) {
      throw new EncryptionUtilsError('密钥不能为空或仅包含空白字符', 'INVALID_KEY');
    }
    return CryptoService.decryptWithKeyString(encryptedText, sanitizedKey);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`解密失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError('解密文本失败', 'DECRYPTION_FAILED', error as Error);
  }
};

/**
 * 生成随机字符串密钥
 * @param length 密钥长度，默认32字节
 * @returns 随机字符串密钥
 */
export const generateRandomStringKey = (length: number = 32): string => {
  try {
    if (length <= 0 || length > 128) {
      throw new EncryptionUtilsError('密钥长度必须在1-128之间', 'INVALID_KEY_LENGTH');
    }
    return CryptoService.generateRandomStringKey(length);
  } catch (error) {
    if (error instanceof EncryptionUtilsError) {
      throw error;
    }
    if (error instanceof CryptoError) {
      throw new EncryptionUtilsError(`生成密钥失败: ${error.message}`, error.code, error);
    }
    throw new EncryptionUtilsError(
      '生成随机字符串密钥失败',
      'KEY_GENERATION_FAILED',
      error as Error,
    );
  }
};

/**
 * 安全地比较两个密钥是否相等（防止时序攻击）
 * @param key1 第一个密钥
 * @param key2 第二个密钥
 * @returns 是否相等
 */
export const secureCompareKeys = (key1: string, key2: string): boolean => {
  if (typeof key1 !== 'string' || typeof key2 !== 'string') {
    return false;
  }
  if (key1.length !== key2.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < key1.length; i++) {
    result |= key1.charCodeAt(i) ^ key2.charCodeAt(i);
  }
  return result === 0;
};
