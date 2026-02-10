import { EncryptedData, EncryptionKey, EncryptionOptions } from '@/types/crypto/CryptoTypes';
import { Buffer } from 'buffer';
import 'react-native-get-random-values';
import crypto from 'react-native-quick-crypto';

/**
 * 加密错误类型
 */
export class CryptoError extends Error {
  constructor(
    message: string,
    public readonly code: CryptoErrorCode,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

/**
 * 加密错误代码
 */
export enum CryptoErrorCode {
  INVALID_KEY = 'INVALID_KEY',
  INVALID_DATA = 'INVALID_DATA',
  INVALID_ALGORITHM = 'INVALID_ALGORITHM',
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  INVALID_ENCRYPTED_FORMAT = 'INVALID_ENCRYPTED_FORMAT',
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',
}

/**
 * 支持的加密算法
 */
const SUPPORTED_ALGORITHMS = [
  'aes-256-cbc',
  'aes-192-cbc',
  'aes-128-cbc',
  'aes-256-gcm', // GCM 模式（认证加密）
  'aes-192-gcm',
  'aes-128-gcm',
];

/**
 * 最大加密数据长度（10MB）
 */
const MAX_DATA_LENGTH = 10 * 1024 * 1024;

/**
 * AES加密服务
 * 提供加密、解密和密钥生成功能
 */
export class CryptoService {
  /**
   * 验证密钥长度是否有效
   * @param length 密钥长度
   * @param algorithm 加密算法
   * @returns 是否有效
   */
  private static isValidKeyLength(length: number, algorithm: string): boolean {
    // AES-256 系列（CBC 和 GCM）
    if (algorithm === 'aes-256-cbc' || algorithm === 'aes-256-gcm') return length === 32;
    // AES-192 系列
    if (algorithm === 'aes-192-cbc' || algorithm === 'aes-192-gcm') return length === 24;
    // AES-128 系列
    if (algorithm === 'aes-128-cbc' || algorithm === 'aes-128-gcm') return length === 16;
    return false;
  }

  /**
   * 验证算法是否支持
   * @param algorithm 算法名称
   * @returns 是否支持
   */
  private static isValidAlgorithm(algorithm: string): boolean {
    return SUPPORTED_ALGORITHMS.includes(algorithm);
  }

  /**
   * 验证数据有效性
   * @param data 要验证的数据
   * @param allowEmpty 是否允许空字符串
   */
  private static validateData(data: string, allowEmpty: boolean = false): void {
    if (data === null || data === undefined) {
      throw new CryptoError('数据不能为null或undefined', CryptoErrorCode.INVALID_DATA);
    }
    if (typeof data !== 'string') {
      throw new CryptoError('数据必须是字符串类型', CryptoErrorCode.INVALID_DATA);
    }
    if (!allowEmpty && data.length === 0) {
      throw new CryptoError('数据不能为空字符串', CryptoErrorCode.INVALID_DATA);
    }
    if (data.length > MAX_DATA_LENGTH) {
      throw new CryptoError(
        `数据长度超过最大限制(${MAX_DATA_LENGTH}字节)`,
        CryptoErrorCode.INVALID_DATA,
      );
    }
  }

  /**
   * 验证密钥有效性
   * @param key 密钥Buffer
   * @param algorithm 加密算法
   */
  private static validateKey(key: Buffer, algorithm: string = 'aes-256-cbc'): void {
    if (!key || !(key instanceof Buffer)) {
      throw new CryptoError('密钥必须是有效的Buffer对象', CryptoErrorCode.INVALID_KEY);
    }
    if (key.length === 0) {
      throw new CryptoError('密钥不能为空', CryptoErrorCode.INVALID_KEY);
    }
    if (!this.isValidKeyLength(key.length, algorithm)) {
      throw new CryptoError(
        `密钥长度${key.length}字节与算法${algorithm}不匹配`,
        CryptoErrorCode.INVALID_KEY,
      );
    }
  }

  /**
   * 生成随机AES密钥
   * @param length 密钥长度，默认为256位(32字节)
   * @returns 随机生成的密钥Buffer
   */
  static generateRandomKey(length: number = 32): Buffer {
    try {
      // 验证密钥长度
      if (length !== 16 && length !== 24 && length !== 32) {
        throw new CryptoError('密钥长度必须是16、24或32字节', CryptoErrorCode.INVALID_KEY);
      }
      // 在原生环境中使用react-native-quick-crypto
      return Buffer.from(crypto.randomBytes(length));
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        '生成随机密钥失败',
        CryptoErrorCode.KEY_GENERATION_FAILED,
        error as Error,
      );
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
    if (!key || !(key instanceof Buffer)) {
      throw new CryptoError('密钥必须是有效的Buffer对象', CryptoErrorCode.INVALID_KEY);
    }
    return key.toString('base64');
  }

  /**
   * 从base64字符串创建密钥Buffer
   * @param keyBase64 base64编码的密钥字符串
   * @returns 密钥Buffer
   */
  static keyFromBase64(keyBase64: string): Buffer {
    if (!keyBase64 || typeof keyBase64 !== 'string') {
      throw new CryptoError('密钥字符串不能为空', CryptoErrorCode.INVALID_KEY);
    }
    try {
      const key = Buffer.from(keyBase64, 'base64');
      if (key.length === 0) {
        throw new CryptoError('无效的base64密钥', CryptoErrorCode.INVALID_KEY);
      }
      return key;
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError('解析base64密钥失败', CryptoErrorCode.INVALID_KEY, error as Error);
    }
  }

  /**
   * 执行AES加密 (GCM 模式)
   * @param data 要加密的数据
   * @param key 加密密钥
   * @param algorithm 加密算法，默认为aes-256-gcm
   * @returns 加密后的数据（base64格式，包含 IV 和 auth tag）
   */
  static encrypt(data: string, key: Buffer, algorithm: string = 'aes-256-gcm'): string {
    try {
      // 验证输入
      this.validateData(data);
      this.validateKey(key, algorithm);

      if (!this.isValidAlgorithm(algorithm)) {
        throw new CryptoError(
          `不支持的加密算法: ${algorithm}。支持的算法: ${SUPPORTED_ALGORITHMS.join(', ')}`,
          CryptoErrorCode.INVALID_ALGORITHM,
        );
      }

      // 生成 IV（GCM 模式推荐 12 字节）
      const iv = crypto.randomFillSync(new Uint8Array(12));
      const cipher = crypto.createCipheriv(algorithm, key, iv);

      let encrypted = cipher.update(data, 'utf8', 'base64');
      encrypted += cipher.final('base64');

      // 获取 GCM 模式的认证标签
      const authTag = cipher.getAuthTag();

      // 返回格式: iv:authTag:encryptedContent
      return `${Buffer.from(iv).toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `加密失败: ${(error as Error).message}`,
        CryptoErrorCode.ENCRYPTION_FAILED,
        error as Error,
      );
    }
  }

  /**
   * 执行AES解密 (GCM 模式)
   * @param encryptedData 加密的数据（base64格式，包含 IV 和 auth tag）
   * @param key 解密密钥
   * @param algorithm 加密算法，默认为aes-256-gcm
   * @returns 解密后的原始数据
   */
  static decrypt(encryptedData: string, key: Buffer, algorithm: string = 'aes-256-gcm'): string {
    try {
      // 验证输入
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new CryptoError('加密数据不能为空', CryptoErrorCode.INVALID_DATA);
      }
      this.validateKey(key, algorithm);

      if (!this.isValidAlgorithm(algorithm)) {
        throw new CryptoError(`不支持的加密算法: ${algorithm}`, CryptoErrorCode.INVALID_ALGORITHM);
      }

      // 解析 GCM 格式: iv:authTag:encryptedContent
      const parts = encryptedData.split(':');
      if (parts.length !== 3) {
        throw new CryptoError(
          '加密数据格式错误，应为"iv:authTag:encryptedContent"格式',
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
        );
      }

      const [ivBase64, authTagBase64, encryptedContent] = parts;

      if (!ivBase64 || !authTagBase64 || !encryptedContent) {
        throw new CryptoError(
          '加密数据缺少IV、认证标签或内容部分',
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
        );
      }

      // 解析 IV
      let iv: Buffer;
      try {
        iv = Buffer.from(ivBase64, 'base64');
      } catch (error) {
        throw new CryptoError(
          'IV格式错误，无法解析base64',
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
          error as Error,
        );
      }

      // GCM 模式推荐 12 字节 IV
      if (iv.length !== 12) {
        throw new CryptoError(
          `IV长度错误: ${iv.length}字节，应为12字节（GCM模式）`,
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
        );
      }

      // 解析认证标签
      let authTag: Buffer;
      try {
        authTag = Buffer.from(authTagBase64, 'base64');
      } catch (error) {
        throw new CryptoError(
          '认证标签格式错误，无法解析base64',
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
          error as Error,
        );
      }

      // 创建解密器
      const decipher = crypto.createDecipheriv(algorithm, key, iv);

      // 设置认证标签（GCM 模式必须）
      decipher.setAuthTag(authTag as any);

      // 解密数据
      let decrypted = decipher.update(encryptedContent, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `解密失败: ${(error as Error).message}。可能是密钥不匹配或数据损坏。`,
        CryptoErrorCode.DECRYPTION_FAILED,
        error as Error,
      );
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
    try {
      // 验证输入
      this.validateData(data);
      this.validateKey(key, options?.algorithm || 'aes-256-cbc');

      const algorithm = options?.algorithm || 'aes-256-cbc';

      if (!this.isValidAlgorithm(algorithm)) {
        throw new CryptoError(`不支持的加密算法: ${algorithm}`, CryptoErrorCode.INVALID_ALGORITHM);
      }

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
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `加密失败: ${(error as Error).message}`,
        CryptoErrorCode.ENCRYPTION_FAILED,
        error as Error,
      );
    }
  }

  /**
   * 使用带元数据的格式执行AES解密
   * @param encryptedData 包含加密数据和元数据的对象
   * @param key 解密密钥
   * @returns 解密后的原始数据
   */
  static decryptWithMetadata(encryptedData: EncryptedData, key: Buffer): string {
    try {
      // 验证输入
      if (!encryptedData || typeof encryptedData !== 'object') {
        throw new CryptoError('加密数据对象不能为空', CryptoErrorCode.INVALID_DATA);
      }
      if (!encryptedData.encrypted || typeof encryptedData.encrypted !== 'string') {
        throw new CryptoError(
          '加密数据缺少encrypted字段',
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
        );
      }
      if (!encryptedData.iv || typeof encryptedData.iv !== 'string') {
        throw new CryptoError('加密数据缺少iv字段', CryptoErrorCode.INVALID_ENCRYPTED_FORMAT);
      }

      const algorithm = encryptedData.algorithm || 'aes-256-cbc';
      this.validateKey(key, algorithm);

      let iv: Buffer;
      try {
        iv = Buffer.from(encryptedData.iv, 'base64');
      } catch (error) {
        throw new CryptoError(
          'IV格式错误，无法解析base64',
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
          error as Error,
        );
      }

      if (iv.length !== 16) {
        throw new CryptoError(
          `IV长度错误: ${iv.length}字节，应为16字节`,
          CryptoErrorCode.INVALID_ENCRYPTED_FORMAT,
        );
      }

      // 创建解密器
      const decipher = crypto.createDecipheriv(algorithm, key, iv);
      decipher.setAutoPadding(true);

      // 解密数据
      let decrypted = decipher.update(encryptedData.encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `解密失败: ${(error as Error).message}`,
        CryptoErrorCode.DECRYPTION_FAILED,
        error as Error,
      );
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
    try {
      // 验证输入
      this.validateData(data);
      if (!keyString || typeof keyString !== 'string') {
        throw new CryptoError('密钥字符串不能为空', CryptoErrorCode.INVALID_KEY);
      }

      if (!this.isValidAlgorithm(algorithm)) {
        throw new CryptoError(`不支持的加密算法: ${algorithm}`, CryptoErrorCode.INVALID_ALGORITHM);
      }

      const key = Buffer.from(keyString, 'utf8');
      // 确保密钥长度正确
      if (key.length !== 32 && algorithm.includes('256')) {
        // 如果密钥长度不足32字节，进行填充或哈希处理
        const hash = Buffer.from(crypto.createHash('sha256').update(keyString).digest());
        return this.encrypt(data, hash, algorithm);
      }
      return this.encrypt(data, key, algorithm);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `加密失败: ${(error as Error).message}`,
        CryptoErrorCode.ENCRYPTION_FAILED,
        error as Error,
      );
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
    try {
      // 验证输入
      if (!encryptedText || typeof encryptedText !== 'string') {
        throw new CryptoError('加密数据不能为空', CryptoErrorCode.INVALID_DATA);
      }
      if (!keyString || typeof keyString !== 'string') {
        throw new CryptoError('密钥字符串不能为空', CryptoErrorCode.INVALID_KEY);
      }

      if (!this.isValidAlgorithm(algorithm)) {
        throw new CryptoError(`不支持的加密算法: ${algorithm}`, CryptoErrorCode.INVALID_ALGORITHM);
      }

      const key = Buffer.from(keyString, 'utf8');
      // 确保密钥长度正确
      if (key.length !== 32 && algorithm.includes('256')) {
        // 如果密钥长度不足32字节，进行填充或哈希处理
        const hash = Buffer.from(crypto.createHash('sha256').update(keyString).digest());
        return this.decrypt(encryptedText, hash, algorithm);
      }
      return this.decrypt(encryptedText, key, algorithm);
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        `解密失败: ${(error as Error).message}`,
        CryptoErrorCode.DECRYPTION_FAILED,
        error as Error,
      );
    }
  }

  /**
   * 生成随机字符串密钥
   * @param length 密钥长度，默认32字节
   * @returns 随机字符串密钥
   */
  static generateRandomStringKey(length: number = 32): string {
    try {
      if (length <= 0 || length > 128) {
        throw new CryptoError('密钥长度必须在1-128之间', CryptoErrorCode.INVALID_KEY);
      }
      const key = this.generateRandomKey(Math.min(length, 32));
      return key.toString('hex').substring(0, length); // 返回指定长度的十六进制字符串
    } catch (error) {
      if (error instanceof CryptoError) {
        throw error;
      }
      throw new CryptoError(
        '生成随机字符串密钥失败',
        CryptoErrorCode.KEY_GENERATION_FAILED,
        error as Error,
      );
    }
  }

  /**
   * 验证base64字符串是否有效
   * @param str 要验证的字符串
   * @returns 是否有效
   */
  static isValidBase64(str: string): boolean {
    if (!str || typeof str !== 'string') {
      return false;
    }
    try {
      const decoded = Buffer.from(str, 'base64');
      return decoded.toString('base64') === str;
    } catch {
      return false;
    }
  }
}
