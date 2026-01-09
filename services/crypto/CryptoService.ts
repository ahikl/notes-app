import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import { EncryptedData, EncryptionKey, EncryptionOptions } from '@/types/crypto/CryptoTypes';
import crypto from 'react-native-quick-crypto';

// 检查是否在Web环境中，如果是则使用模拟实现
const isWebEnvironment = typeof window !== 'undefined';

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
    if (isWebEnvironment) {
      // 在Web环境中使用简单的模拟实现
      const array = new Uint8Array(length);
      for (let i = 0; i < length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return Buffer.from(array);
    } else {
      // 在原生环境中使用react-native-quick-crypto
      return Buffer.from(crypto.randomBytes(length));
    }
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
    const keyBuffer = this.generateRandomKey(length);
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
   * 从base64字符串创建密钥Buffer
   * @param keyBase64 base64编码的密钥字符串
   * @returns 密钥Buffer
   */
  static keyFromBase64(keyBase64: string): Buffer {
    return Buffer.from(keyBase64, 'base64');
  }

  /**
   * 执行AES加密
   * @param data 要加密的数据
   * @param key 加密密钥
   * @param algorithm 加密算法，默认为aes-256-cbc
   * @returns 加密后的数据（base64格式）
   */
  static encrypt(data: string, key: Buffer, algorithm: string = 'aes-256-cbc'): string {
    if (isWebEnvironment) {
      // Web环境中的模拟加密：简单base64编码加上时间戳
      const timestamp = Date.now().toString();
      const dataWithTimestamp = `${data}|${timestamp}`;
      return Buffer.from(dataWithTimestamp).toString('base64');
    } else {
      // 原生环境使用真正的加密
      const iv = crypto.randomFillSync(new Uint8Array(16));
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // 将IV和加密数据组合在一起
      return `${Buffer.from(iv).toString('base64')}:${encrypted}`;
    }
  }

  /**
   * 执行AES解密
   * @param encryptedData 加密的数据（base64格式）
   * @param key 解密密钥
   * @param algorithm 加密算法，默认为aes-256-cbc
   * @returns 解密后的原始数据
   */
  static decrypt(encryptedData: string, key: Buffer, algorithm: string = 'aes-256-cbc'): string {
    if (isWebEnvironment) {
      // Web环境中的模拟解密：解码base64并移除时间戳
      try {
        const decoded = Buffer.from(encryptedData, 'base64').toString('utf8');
        const parts = decoded.split('|');
        return parts[0]; // 返回原始数据部分
      } catch (error) {
        throw new Error(`Web解密失败: ${(error as Error).message}`);
      }
    } else {
      // 原生环境解密
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('加密数据格式错误');
      }
      const [ivBase64, encryptedContent] = parts;
      const iv = Buffer.from(ivBase64, 'base64');

      // 创建解密器
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAutoPadding(true);

      // 解密数据
      let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    }
  }

  /**
   * 使用带元数据的格式执行AES加密
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
    if (isWebEnvironment) {
      // Web环境中的模拟加密
      const timestamp = Date.now().toString();
      const dataWithTimestamp = `${data}|${timestamp}`;
      const encryptedData = Buffer.from(dataWithTimestamp).toString('base64');

      return {
        encrypted: encryptedData,
        iv: Buffer.from('web_simulation_iv').toString('base64'), // 模拟IV
        algorithm: options?.algorithm || 'aes-256-cbc',
        timestamp: Date.now(),
      };
    } else {
      const algorithm = options?.algorithm || 'aes-256-cbc';
      const iv = crypto.randomFillSync(new Uint8Array(16));

      const cipher = crypto.createCipheriv(algorithm, key, iv);
      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      return {
        encrypted: encrypted,
        iv: Buffer.from(iv).toString('base64'),
        algorithm,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * 使用带元数据的格式执行AES解密
   * @param encryptedData 包含加密数据和元数据的对象
   * @param key 解密密钥
   * @returns 解密后的原始数据
   */
  static decryptWithMetadata(encryptedData: EncryptedData, key: Buffer): string {
    if (isWebEnvironment) {
      // Web环境中的模拟解密
      try {
        const decoded = Buffer.from(encryptedData.encrypted, 'base64').toString('utf8');
        const parts = decoded.split('|');
        return parts[0]; // 返回原始数据部分
      } catch (error) {
        throw new Error(`Web解密失败: ${(error as Error).message}`);
      }
    } else {
      const iv = Buffer.from(encryptedData.iv, 'base64');
      const algorithm = encryptedData.algorithm || 'aes-256-cbc';

      // 创建解密器
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAutoPadding(true);

      // 解密数据
      let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
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
    if (isWebEnvironment) {
      // Web环境中的模拟加密
      const timestamp = Date.now().toString();
      const dataWithTimestamp = `${data}|${timestamp}`;
      return Buffer.from(dataWithTimestamp).toString('base64');
    } else {
      const key = Buffer.from(keyString, 'utf8');
      // 确保密钥长度正确
      if (key.length !== 32 && algorithm.includes('256')) {
        // 如果密钥长度不足32字节，进行填充或哈希处理
        const hash = Buffer.from(crypto.createHash('sha256').update(keyString).digest());
        return this.encrypt(data, hash, algorithm);
      }
      return this.encrypt(data, key, algorithm);
    }
  }

  /**
   * 使用字符串密钥进行AES解密
   * @param encryptedText 加密的文本数据
   * @param keyString 密钥字符串
   * @param algorithm 加密算法，默认为aes-256-cbc
   * @returns 解密后的原始数据
   */
  static decryptWithKeyString(
    encryptedText: string,
    keyString: string,
    algorithm: string = 'aes-256-cbc',
  ): string {
    if (isWebEnvironment) {
      // Web环境中的模拟解密
      try {
        const decoded = Buffer.from(encryptedText, 'base64').toString('utf8');
        const parts = decoded.split('|');
        return parts[0]; // 返回原始数据部分
      } catch (error) {
        throw new Error(`Web解密失败: ${(error as Error).message}`);
      }
    } else {
      const key = Buffer.from(keyString, 'utf8');
      // 确保密钥长度正确
      if (key.length !== 32 && algorithm.includes('256')) {
        // 如果密钥长度不足32字节，进行填充或哈希处理
        const hash = Buffer.from(crypto.createHash('sha256').update(keyString).digest());
        return this.decrypt(encryptedText, hash, algorithm);
      }
      return this.decrypt(encryptedText, key, algorithm);
    }
  }

  /**
   * 生成随机字符串密钥
   * @param length 密钥长度，默认32字节
   * @returns 随机字符串密钥
   */
  static generateRandomStringKey(length: number = 32): string {
    if (isWebEnvironment) {
      // Web环境中的模拟实现
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    } else {
      const key = this.generateRandomKey(length);
      return key.toString('hex').substring(0, length); // 返回指定长度的十六进制字符串
    }
  }
}
