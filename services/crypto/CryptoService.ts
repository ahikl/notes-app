import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import * as crypto from 'react-native-quick-crypto';
import { EncryptionKey, EncryptedData, EncryptionOptions } from '@/types/crypto/CryptoTypes';

/**
 * AES加密服务
 * 提供加密、解密和密钥生成功能
 */
export class CryptoService {
  /**
   * 生成随机AES密钥
   * @param length 密钥长度，默认为256位(32字节)
   * @returns 随机生成的密钥Buffer
   */
  static generateRandomKey(length: number = 32): Buffer {
    return Buffer.from(crypto.randomBytes(length));
  }

  /**
   * 生成带元数据的加密密钥
   * @param length 密钥长度，默认为256位(32字节)
   * @param algorithm 加密算法，默认为aes-256-cbc
   * @returns 包含元数据的加密密钥对象
   */
  static generateEncryptionKey(
    length: number = 32,
    algorithm: string = 'aes-256-cbc',
  ): EncryptionKey {
    const keyBuffer = Buffer.from(crypto.randomBytes(length));
    return {
      key: keyBuffer.toString('base64'),
      algorithm,
      length,
      createdAt: Date.now(),
    };
  }

  /**
   * 将密钥转换为base64字符串
   * @param key 密钥Buffer
   * @returns base64编码的密钥字符串
   */
  static keyToBase64(key: Buffer): string {
    return key.toString('base64');
  }

  /**
   * 从base64字符串转换为密钥
   * @param keyBase64 base64编码的密钥字符串
   * @returns 密钥Buffer
   */
  static keyFromBase64(keyBase64: string): Buffer {
    return Buffer.from(keyBase64, 'base64');
  }

  /**
   * AES加密
   * @param data 要加密的数据
   * @param key 加密密钥
   * @param algorithm 加密算法，默认为aes-256-cbc
   * @returns 加密后的数据（base64格式）
   */
  static encrypt(data: string, key: Buffer, algorithm: string = 'aes-256-cbc'): string {
    try {
      // 生成随机初始化向量(IV)
      const iv = Buffer.from(crypto.randomBytes(16));

      // 创建加密器
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAutoPadding(true);

      // 加密数据
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // 将IV和加密数据组合在一起
      const ivBase64 = iv.toString('base64');
      return `${ivBase64}:${encrypted}`;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`加密失败: ${errorMessage}`);
    }
  }

  /**
   * AES加密并返回包含元数据的对象
   * @param data 要加密的数据
   * @param key 加密密钥
   * @param options 加密选项
   * @returns 包含加密数据和元数据的对象
   */
  static encryptWithMetadata(
    data: string,
    key: Buffer,
    options?: EncryptionOptions,
  ): EncryptedData {
    try {
      const algorithm = options?.algorithm || 'aes-256-cbc';

      // 生成随机初始化向量(IV)
      const iv = Buffer.from(crypto.randomBytes(16));

      // 创建加密器
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      cipher.setAutoPadding(true);

      // 加密数据
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      return {
        encrypted: `${iv.toString('base64')}:${encrypted}`,
        iv: iv.toString('base64'),
        algorithm,
        timestamp: Date.now(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`加密失败: ${errorMessage}`);
    }
  }

  /**
   * AES解密
   * @param encryptedData 加密的数据（base64格式，包含IV）
   * @param key 解密密钥
   * @param algorithm 解密算法，默认为aes-256-cbc
   * @returns 解密后的原始数据
   */
  static decrypt(encryptedData: string, key: Buffer, algorithm: string = 'aes-256-cbc'): string {
    try {
      // 从加密数据中分离IV和加密内容
      const [ivBase64, encryptedContent] = encryptedData.split(':');

      if (!ivBase64 || !encryptedContent) {
        throw new Error('加密数据格式错误');
      }

      // 将IV从base64转换为Buffer
      const iv = Buffer.from(ivBase64, 'base64');

      // 创建解密器
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAutoPadding(true);

      // 解密数据
      let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`解密失败: ${errorMessage}`);
    }
  }

  /**
   * 从包含元数据的加密对象中解密数据
   * @param encryptedData 包含加密数据和元数据的对象
   * @param key 解密密钥
   * @returns 解密后的原始数据
   */
  static decryptWithMetadata(encryptedData: EncryptedData, key: Buffer): string {
    try {
      // 将IV从base64转换为Buffer
      const iv = Buffer.from(encryptedData.iv, 'base64');

      // 从加密数据中提取加密内容
      const parts = encryptedData.encrypted.split(':');
      if (parts.length !== 2) {
        throw new Error('加密数据格式错误');
      }
      const [, encryptedContent] = parts;

      // 创建解密器
      const decipher = crypto.createDecipheriv(encryptedData.algorithm, key, iv);
      decipher.setAutoPadding(true);

      // 解密数据
      let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      throw new Error(`解密失败: ${errorMessage}`);
    }
  }

  /**
   * 使用字符串密钥进行AES加密
   * @param data 要加密的数据
   * @param keyString 密钥字符串
   * @param algorithm 加密算法，默认为aes-256-cbc
   * @returns 加密后的数据（base64格式）
   */
  static encryptWithKeyString(
    data: string,
    keyString: string,
    algorithm: string = 'aes-256-cbc',
  ): string {
    const key = Buffer.from(keyString, 'utf8');
    // 确保密钥长度正确
    if (key.length !== 32 && algorithm.includes('256')) {
      // 如果密钥长度不足32字节，进行填充或哈希处理
      const hash = Buffer.from(crypto.createHash('sha256').update(keyString).digest());
      return this.encrypt(data, hash, algorithm);
    }
    return this.encrypt(data, key, algorithm);
  }

  /**
   * 使用字符串密钥进行AES解密
   * @param encryptedData 加密的数据（base64格式，包含IV）
   * @param keyString 密钥字符串
   * @param algorithm 解密算法，默认为aes-256-cbc
   * @returns 解密后的原始数据
   */
  static decryptWithKeyString(
    encryptedData: string,
    keyString: string,
    algorithm: string = 'aes-256-cbc',
  ): string {
    const key = Buffer.from(keyString, 'utf8');
    // 确保密钥长度正确
    if (key.length !== 32 && algorithm.includes('256')) {
      // 如果密钥长度不足32字节，进行填充或哈希处理
      const hash = Buffer.from(crypto.createHash('sha256').update(keyString).digest());
      return this.decrypt(encryptedData, hash, algorithm);
    }
    return this.decrypt(encryptedData, key, algorithm);
  }

  /**
   * 生成安全的随机字符串密钥
   * @param length 密钥长度，默认为32字节
   * @returns 随机字符串密钥
   */
  static generateRandomStringKey(length: number = 32): string {
    const buffer = Buffer.from(crypto.randomBytes(length));
    return buffer.toString('hex');
  }
}

export default CryptoService;
