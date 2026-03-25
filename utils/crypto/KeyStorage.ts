import { CryptoService } from '@/services/crypto/CryptoService';
import * as SecureStore from 'expo-secure-store';
import { AppError } from '@/utils/errors/AppError';
import { ErrorCode, ErrorLevel } from '@/utils/errors/ErrorConstants';

/**
 * 密钥元数据
 */
export interface KeyMetadata {
  version: number;
  createdAt: number;
  algorithm: string;
  keyId: string;
}

/**
 * 存储的密钥项
 */
interface StoredKeyItem {
  key: string;
  metadata: KeyMetadata;
}

// 存储键名常量
const KEY_STORAGE_PREFIX = 'encrypted_notes_key_';
const KEY_METADATA_KEY = 'encrypted_notes_key_metadata';
const KEY_BACKUP_PREFIX = 'encrypted_notes_key_backup_';

/**
 * 密钥存储服务
 * 使用 Expo SecureStore 安全地存储加密密钥
 * 提供密钥备份、恢复和版本管理功能
 */
export class KeyStorage {
  /**
   * 检查 SecureStore 是否可用
   * @returns 是否可用
   */
  static async isAvailable(): Promise<boolean> {
    return await SecureStore.isAvailableAsync();
  }

  /**
   * 存储加密密钥
   * @param keyId 密钥标识符
   * @param keyBase64 Base64编码的密钥
   * @param metadata 密钥元数据
   */
  static async storeKey(keyId: string, keyBase64: string, metadata: KeyMetadata): Promise<void> {
    try {
      // 验证输入
      if (!keyId || typeof keyId !== 'string') {
        throw new AppError('密钥ID不能为空', ErrorCode.ENCRYPTION_KEY_INVALID);
      }
      if (!keyBase64 || typeof keyBase64 !== 'string') {
        throw new AppError('密钥不能为空', ErrorCode.ENCRYPTION_KEY_INVALID);
      }
      if (!CryptoService.isValidBase64(keyBase64)) {
        throw new AppError('密钥必须是有效的base64编码', ErrorCode.ENCRYPTION_KEY_INVALID);
      }

      const keyBuffer = Buffer.from(keyBase64, 'base64');
      if (keyBuffer.length !== 16 && keyBuffer.length !== 24 && keyBuffer.length !== 32) {
        throw new AppError(
          `密钥长度${keyBuffer.length}字节无效，必须是16、24或32字节`,
          ErrorCode.ENCRYPTION_KEY_INVALID,
        );
      }

      const storageKey = `${KEY_STORAGE_PREFIX}${keyId}`;
      const storedItem: StoredKeyItem = {
        key: keyBase64,
        metadata,
      };

      await SecureStore.setItemAsync(storageKey, JSON.stringify(storedItem));

      // 更新元数据索引
      await this.updateMetadataIndex(keyId, metadata);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `存储密钥失败: ${(error as Error).message}`,
        ErrorCode.KEY_STORAGE_FAILED,
        ErrorLevel.ERROR,
        error as Error,
      );
    }
  }

  /**
   * 检索加密密钥
   * @param keyId 密钥标识符
   * @returns 密钥和元数据
   */
  static async retrieveKey(keyId: string): Promise<{ key: string; metadata: KeyMetadata }> {
    try {
      if (!keyId || typeof keyId !== 'string') {
        throw new AppError('密钥ID不能为空', ErrorCode.ENCRYPTION_KEY_INVALID);
      }

      const storageKey = `${KEY_STORAGE_PREFIX}${keyId}`;
      const storedJson = await SecureStore.getItemAsync(storageKey);

      if (!storedJson) {
        throw new AppError(`密钥不存在: ${keyId}`, ErrorCode.KEY_NOT_FOUND);
      }

      const storedItem: StoredKeyItem = JSON.parse(storedJson);

      // 验证密钥格式
      if (!CryptoService.isValidBase64(storedItem.key)) {
        throw new AppError('存储的密钥格式无效', ErrorCode.ENCRYPTION_KEY_INVALID);
      }

      return {
        key: storedItem.key,
        metadata: storedItem.metadata,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `检索密钥失败: ${(error as Error).message}`,
        ErrorCode.KEY_RETRIEVE_FAILED,
        ErrorLevel.ERROR,
        error as Error,
      );
    }
  }

  /**
   * 删除加密密钥
   * @param keyId 密钥标识符
   */
  static async deleteKey(keyId: string): Promise<void> {
    try {
      if (!keyId || typeof keyId !== 'string') {
        throw new AppError('密钥ID不能为空', ErrorCode.ENCRYPTION_KEY_INVALID);
      }

      const storageKey = `${KEY_STORAGE_PREFIX}${keyId}`;
      await SecureStore.deleteItemAsync(storageKey);

      // 从元数据索引中移除
      await this.removeFromMetadataIndex(keyId);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `删除密钥失败: ${(error as Error).message}`,
        ErrorCode.KEY_DELETE_FAILED,
        ErrorLevel.ERROR,
        error as Error,
      );
    }
  }

  /**
   * 备份密钥
   * @param keyId 密钥标识符
   * @param backupId 备份标识符（可选，默认为时间戳）
   * @returns 备份标识符
   */
  static async backupKey(keyId: string, backupId?: string): Promise<string> {
    try {
      if (!keyId || typeof keyId !== 'string') {
        throw new AppError('密钥ID不能为空', ErrorCode.ENCRYPTION_KEY_INVALID);
      }

      const { key, metadata } = await this.retrieveKey(keyId);

      const backupKeyId = backupId || `backup_${Date.now()}`;
      const storageKey = `${KEY_BACKUP_PREFIX}${keyId}_${backupKeyId}`;

      const backupItem: StoredKeyItem = {
        key,
        metadata: {
          ...metadata,
          keyId: backupKeyId,
        },
      };

      await SecureStore.setItemAsync(storageKey, JSON.stringify(backupItem));

      return backupKeyId;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `备份密钥失败: ${(error as Error).message}`,
        ErrorCode.KEY_BACKUP_FAILED,
        ErrorLevel.ERROR,
        error as Error,
      );
    }
  }

  /**
   * 恢复密钥
   * @param keyId 原密钥标识符
   * @param backupId 备份标识符
   */
  static async restoreKey(keyId: string, backupId: string): Promise<void> {
    try {
      if (!keyId || typeof keyId !== 'string') {
        throw new AppError('密钥ID不能为空', ErrorCode.ENCRYPTION_KEY_INVALID);
      }
      if (!backupId || typeof backupId !== 'string') {
        throw new AppError('备份ID不能为空', ErrorCode.ENCRYPTION_KEY_INVALID);
      }

      const storageKey = `${KEY_BACKUP_PREFIX}${keyId}_${backupId}`;
      const backupJson = await SecureStore.getItemAsync(storageKey);

      if (!backupJson) {
        throw new AppError(`备份不存在: ${backupId}`, ErrorCode.KEY_NOT_FOUND);
      }

      const backupItem: StoredKeyItem = JSON.parse(backupJson);

      // 恢复密钥
      await this.storeKey(keyId, backupItem.key, backupItem.metadata);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `恢复密钥失败: ${(error as Error).message}`,
        ErrorCode.KEY_RESTORE_FAILED,
        ErrorLevel.ERROR,
        error as Error,
      );
    }
  }

  /**
   * 获取所有密钥的元数据
   * @returns 密钥元数据列表
   */
  static async getAllKeyMetadata(): Promise<{ keyId: string; metadata: KeyMetadata }[]> {
    try {
      const metadataJson = await SecureStore.getItemAsync(KEY_METADATA_KEY);
      if (!metadataJson) {
        return [];
      }

      const metadataMap: Record<string, KeyMetadata> = JSON.parse(metadataJson);
      return Object.entries(metadataMap).map(([keyId, metadata]) => ({
        keyId,
        metadata,
      }));
    } catch (error) {
      console.error('获取密钥元数据失败:', error);
      return [];
    }
  }

  /**
   * 检查密钥是否存在
   * @param keyId 密钥标识符
   * @returns 是否存在
   */
  static async hasKey(keyId: string): Promise<boolean> {
    try {
      const storageKey = `${KEY_STORAGE_PREFIX}${keyId}`;
      const value = await SecureStore.getItemAsync(storageKey);
      return value !== null;
    } catch {
      return false;
    }
  }

  /**
   * 生成新的加密密钥并存储
   * @param keyId 密钥标识符
   * @param length 密钥长度（16、24或32字节）
   * @returns 生成的密钥和元数据
   */
  static async generateAndStoreKey(
    keyId: string,
    length: number = 32,
  ): Promise<{ key: string; metadata: KeyMetadata }> {
    try {
      // 生成新密钥
      const keyBuffer = CryptoService.generateRandomKey(length);
      const keyBase64 = CryptoService.keyToBase64(keyBuffer);

      const metadata: KeyMetadata = {
        version: 1,
        createdAt: Date.now(),
        algorithm: 'aes-256-cbc',
        keyId,
      };

      // 如果密钥已存在，先备份
      if (await this.hasKey(keyId)) {
        await this.backupKey(keyId, `auto_backup_${Date.now()}`);
      }

      // 存储新密钥
      await this.storeKey(keyId, keyBase64, metadata);

      return { key: keyBase64, metadata };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        `生成并存储密钥失败: ${(error as Error).message}`,
        ErrorCode.KEY_STORAGE_FAILED,
        ErrorLevel.ERROR,
        error as Error,
      );
    }
  }

  /**
   * 更新元数据索引
   * @param keyId 密钥标识符
   * @param metadata 密钥元数据
   */
  private static async updateMetadataIndex(keyId: string, metadata: KeyMetadata): Promise<void> {
    try {
      const metadataJson = await SecureStore.getItemAsync(KEY_METADATA_KEY);
      const metadataMap: Record<string, KeyMetadata> = metadataJson ? JSON.parse(metadataJson) : {};

      metadataMap[keyId] = metadata;

      await SecureStore.setItemAsync(KEY_METADATA_KEY, JSON.stringify(metadataMap));
    } catch (error) {
      console.error('更新元数据索引失败:', error);
    }
  }

  /**
   * 从元数据索引中移除
   * @param keyId 密钥标识符
   */
  private static async removeFromMetadataIndex(keyId: string): Promise<void> {
    try {
      const metadataJson = await SecureStore.getItemAsync(KEY_METADATA_KEY);
      if (!metadataJson) return;

      const metadataMap: Record<string, KeyMetadata> = JSON.parse(metadataJson);
      delete metadataMap[keyId];

      await SecureStore.setItemAsync(KEY_METADATA_KEY, JSON.stringify(metadataMap));
    } catch (error) {
      console.error('从元数据索引移除失败:', error);
    }
  }
}

export default KeyStorage;
