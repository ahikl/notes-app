/**
 * 加密相关类型定义
 */

export interface EncryptionKey {
  /** 密钥的Base64编码 */
  key: string;
  /** 密钥算法 */
  algorithm: string;
  /** 密钥长度 */
  length: number;
  /** 创建时间戳 */
  createdAt: number;
}

export interface EncryptedData {
  /** 加密后的数据 */
  encrypted: string;
  /** 初始化向量 */
  iv: string;
  /** 使用的算法 */
  algorithm: string;
  /** 时间戳 */
  timestamp: number;
}

export interface CryptoConfig {
  /** 默认加密算法 */
  defaultAlgorithm: string;
  /** 默认密钥长度 */
  defaultKeyLength: number;
  /** 是否启用自动密钥轮换 */
  enableKeyRotation: boolean;
  /** 密钥轮换间隔（毫秒） */
  keyRotationInterval: number;
}

export interface EncryptionOptions {
  /** 使用的算法 */
  algorithm?: string;
  /** 是否在加密数据中包含元数据 */
  includeMetadata?: boolean;
}
