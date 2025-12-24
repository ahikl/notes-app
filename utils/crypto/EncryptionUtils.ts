import { CryptoService } from '@/services/crypto/CryptoService';
import { EncryptionKey, EncryptedData, EncryptionOptions } from '@/types/crypto/CryptoTypes';

/**
 * 加密工具函数
 * 基于CryptoService提供便捷的加密功能
 */

/**
 * 生成AES加密密钥
 * @param length 密钥长度，默认32字节(256位)
 * @returns base64格式的密钥字符串
 */
export const generateEncryptionKey = (length: number = 32): string => {
  const key = CryptoService.generateRandomKey(length);
  return CryptoService.keyToBase64(key);
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
  return CryptoService.generateEncryptionKey(length, algorithm);
};

/**
 * 加密文本数据
 * @param text 要加密的文本
 * @param keyBase64 base64格式的密钥
 * @returns 加密后的数据(base64格式)
 */
export const encryptText = (text: string, keyBase64: string): string => {
  const key = CryptoService.keyFromBase64(keyBase64);
  return CryptoService.encrypt(text, key);
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
  const key = CryptoService.keyFromBase64(keyBase64);
  return CryptoService.encryptWithMetadata(text, key, options);
};

/**
 * 解密文本数据
 * @param encryptedText 加密的文本数据
 * @param keyBase64 base64格式的密钥
 * @returns 解密后的原始文本
 */
export const decryptText = (encryptedText: string, keyBase64: string): string => {
  const key = CryptoService.keyFromBase64(keyBase64);
  return CryptoService.decrypt(encryptedText, key);
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
  const key = CryptoService.keyFromBase64(keyBase64);
  return CryptoService.decryptWithMetadata(encryptedData, key);
};

/**
 * 使用字符串密钥加密文本
 * @param text 要加密的文本
 * @param keyString 字符串格式的密钥
 * @returns 加密后的数据(base64格式)
 */
export const encryptTextWithStringKey = (text: string, keyString: string): string => {
  return CryptoService.encryptWithKeyString(text, keyString);
};

/**
 * 使用字符串密钥解密文本
 * @param encryptedText 加密的文本数据
 * @param keyString 字符串格式的密钥
 * @returns 解密后的原始文本
 */
export const decryptTextWithStringKey = (encryptedText: string, keyString: string): string => {
  return CryptoService.decryptWithKeyString(encryptedText, keyString);
};

/**
 * 生成随机字符串密钥
 * @param length 密钥长度，默认32字节
 * @returns 随机字符串密钥
 */
export const generateRandomStringKey = (length: number = 32): string => {
  return CryptoService.generateRandomStringKey(length);
};
