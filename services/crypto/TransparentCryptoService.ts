import { Note } from '@/types/notes/NoteTypes';
import { EncryptedNoteService, EncryptedNoteServiceError } from './EncryptedNoteService';

/**
 * 透明加密服务错误
 */
export class TransparentCryptoServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'TransparentCryptoServiceError';
  }
}

/**
 * 内存中的明文笔记数据
 */
export interface PlainNoteData {
  id: string;
  title: string;
  content: string;
  is_encrypted: number;
  sync_status: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

/**
 * 加密结果接口
 * 包含加密后的内容和加密参数
 */
export interface EncryptionResult {
  encryptedContent: string; // Base64编码的加密内容
  iv: string; // Base64编码的初始化向量
  authTag?: string; // Base64编码的认证标签（GCM模式）
}

/**
 * 透明加密服务
 *
 * 实现本地透明加密方案：
 * 1. 内存中始终处理明文
 * 2. 持久化时自动加密为密文
 * 3. 读取时自动解密为明文
 *
 * 这确保了：
 * - 本地数据库只存储密文
 * - 用户界面始终看到明文
 * - 加密/解密过程对用户完全透明
 */
export class TransparentCryptoService {
  private static encryptionKey: Buffer | null = null;

  /**
   * 初始化加密服务
   * 获取或创建加密密钥
   */
  static async initialize(): Promise<void> {
    try {
      this.encryptionKey = await EncryptedNoteService.getOrCreateEncryptionKey();
    } catch (error) {
      throw new TransparentCryptoServiceError(
        '初始化透明加密服务失败',
        'INIT_FAILED',
        error as Error,
      );
    }
  }

  /**
   * 检查服务是否已初始化
   */
  static isInitialized(): boolean {
    return this.encryptionKey !== null;
  }

  /**
   * 确保服务已初始化
   */
  private static ensureInitialized(): Buffer {
    if (!this.encryptionKey) {
      throw new TransparentCryptoServiceError(
        '透明加密服务未初始化，请先调用 initialize()',
        'NOT_INITIALIZED',
      );
    }
    return this.encryptionKey;
  }

  /**
   * 加密笔记内容（透明加密）
   *
   * 将内存中的明文笔记转换为存储用的密文笔记
   * 只加密内容字段，保留元数据明文以便索引
   * 支持 iv 和 auth_tag 字段
   *
   * @param plainNote 明文笔记数据
   * @returns 加密后的笔记数据（适合数据库存储）
   */
  static async encryptNote(plainNote: PlainNoteData): Promise<Note> {
    try {
      // 如果笔记不需要加密，直接返回
      if (plainNote.is_encrypted !== 1) {
        return {
          ...plainNote,
          is_encrypted: 0,
        };
      }

      // 检查内容是否为空，为空则不加密（允许空笔记）
      if (!plainNote.content || plainNote.content.trim() === '') {
        return {
          ...plainNote,
          content: '',
          is_encrypted: 0, // 空内容不加密
          iv: undefined,
          auth_tag: undefined,
        };
      }

      const key = this.ensureInitialized();

      // 加密内容
      const encryptedContent = await EncryptedNoteService.encryptNoteContent(
        plainNote.content,
        key,
      );

      // 解析加密结果（格式: "iv:authTag:ciphertext" 或 "iv:ciphertext"）
      const encryptionResult = this.parseEncryptedContent(encryptedContent);

      // 返回加密后的笔记（保留标题明文以便显示，包含 iv 和 auth_tag）
      return {
        ...plainNote,
        content: encryptionResult.encryptedContent,
        iv: encryptionResult.iv,
        auth_tag: encryptionResult.authTag,
        is_encrypted: 1,
      };
    } catch (error) {
      if (error instanceof TransparentCryptoServiceError) {
        throw error;
      }
      if (error instanceof EncryptedNoteServiceError) {
        throw new TransparentCryptoServiceError(
          `加密笔记失败: ${error.message}`,
          error.code,
          error,
        );
      }
      throw new TransparentCryptoServiceError(
        '加密笔记时发生未知错误',
        'ENCRYPT_ERROR',
        error as Error,
      );
    }
  }

  /**
   * 解析加密内容字符串
   * 支持格式："iv:authTag:ciphertext" (GCM模式) 或 "iv:ciphertext" (CBC模式)
   *
   * @param encryptedContent 加密内容字符串
   * @returns 解析后的加密结果
   */
  private static parseEncryptedContent(encryptedContent: string): EncryptionResult {
    const parts = encryptedContent.split(':');

    if (parts.length === 3) {
      // GCM 模式: iv:authTag:ciphertext
      return {
        iv: parts[0],
        authTag: parts[1],
        encryptedContent: parts[2],
      };
    } else if (parts.length === 2) {
      // CBC 模式: iv:ciphertext (无 auth_tag)
      return {
        iv: parts[0],
        encryptedContent: parts[1],
        authTag: undefined, // CBC 模式不需要 auth_tag
      };
    } else {
      // 未知格式，假设整个内容是密文
      return {
        iv: '',
        encryptedContent: encryptedContent,
        authTag: undefined,
      };
    }
  }

  /**
   * 组合加密内容为字符串
   * 格式："iv:authTag:ciphertext" 或 "iv:ciphertext"
   *
   * @param result 加密结果
   * @returns 组合后的加密字符串
   */
  private static composeEncryptedContent(result: EncryptionResult): string {
    if (result.authTag) {
      // GCM 模式
      return `${result.iv}:${result.authTag}:${result.encryptedContent}`;
    } else {
      // CBC 模式
      return `${result.iv}:${result.encryptedContent}`;
    }
  }

  /**
   * 解密笔记内容（透明解密）
   *
   * 将数据库中的密文笔记转换为内存中的明文笔记
   * 支持包含 iv 和 auth_tag 的加密笔记
   *
   * @param encryptedNote 加密后的笔记数据（来自数据库）
   * @returns 明文笔记数据（适合UI显示）
   */
  static async decryptNote(encryptedNote: Note): Promise<PlainNoteData> {
    try {
      const key = this.ensureInitialized();

      // 如果笔记未加密，直接返回
      if (encryptedNote.is_encrypted !== 1) {
        return {
          ...encryptedNote,
          is_encrypted: 0,
        };
      }

      // 组合加密内容（包含 iv 和 auth_tag）
      const encryptionResult: EncryptionResult = {
        iv: encryptedNote.iv || '',
        authTag: encryptedNote.auth_tag,
        encryptedContent: encryptedNote.content,
      };

      const composedContent = this.composeEncryptedContent(encryptionResult);

      // 解密内容
      const decryptedContent = await EncryptedNoteService.decryptNoteContent(composedContent, key);

      // 返回明文笔记
      return {
        ...encryptedNote,
        content: decryptedContent,
        is_encrypted: 1,
      };
    } catch (error) {
      if (error instanceof TransparentCryptoServiceError) {
        throw error;
      }
      if (error instanceof EncryptedNoteServiceError) {
        throw new TransparentCryptoServiceError(
          `解密笔记失败: ${error.message}。可能是密钥不匹配或数据损坏。`,
          error.code,
          error,
        );
      }
      throw new TransparentCryptoServiceError(
        '解密笔记时发生未知错误',
        'DECRYPT_ERROR',
        error as Error,
      );
    }
  }

  /**
   * 批量加密笔记
   *
   * @param plainNotes 明文笔记数组
   * @returns 加密后的笔记数组
   */
  static async encryptNotes(plainNotes: PlainNoteData[]): Promise<Note[]> {
    const encryptedNotes: Note[] = [];
    const errors: { id: string; error: Error }[] = [];

    for (const plainNote of plainNotes) {
      try {
        const encrypted = await this.encryptNote(plainNote);
        encryptedNotes.push(encrypted);
      } catch (error) {
        console.error(`加密笔记 ${plainNote.id} 失败:`, error);
        errors.push({ id: plainNote.id, error: error as Error });
        // 对于加密失败的笔记，保留原始数据但标记为未加密
        encryptedNotes.push({
          ...plainNote,
          is_encrypted: 0,
        });
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} 条笔记加密失败`);
    }

    return encryptedNotes;
  }

  /**
   * 批量解密笔记
   *
   * @param encryptedNotes 加密笔记数组
   * @returns 明文笔记数组
   */
  static async decryptNotes(encryptedNotes: Note[]): Promise<PlainNoteData[]> {
    const plainNotes: PlainNoteData[] = [];
    const errors: { id: string; error: Error }[] = [];

    for (const encryptedNote of encryptedNotes) {
      try {
        const plain = await this.decryptNote(encryptedNote);
        plainNotes.push(plain);
      } catch (error) {
        console.error(`解密笔记 ${encryptedNote.id} 失败:`, error);
        errors.push({ id: encryptedNote.id, error: error as Error });
        // 对于解密失败的笔记，保留密文但标记错误
        plainNotes.push({
          ...encryptedNote,
          content: '[解密失败 - 密钥不匹配或数据损坏]',
          is_encrypted: 1,
        });
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} 条笔记解密失败`);
    }

    return plainNotes;
  }

  /**
   * 切换笔记的加密状态
   *
   * @param note 当前笔记数据
   * @param shouldEncrypt 是否启用加密
   * @returns 切换加密状态后的笔记数据
   */
  static async toggleEncryption(
    note: PlainNoteData,
    shouldEncrypt: boolean,
  ): Promise<PlainNoteData> {
    return {
      ...note,
      is_encrypted: shouldEncrypt ? 1 : 0,
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * 准备笔记用于数据库存储
   * 自动根据 is_encrypted 标志决定是否加密
   *
   * @param plainNote 明文笔记
   * @returns 适合存储的笔记数据
   */
  static async prepareForStorage(plainNote: PlainNoteData): Promise<Note> {
    return this.encryptNote(plainNote);
  }

  /**
   * 从数据库读取笔记后处理
   * 自动根据 is_encrypted 标志决定是否解密
   *
   * @param storedNote 数据库中的笔记数据
   * @returns 明文笔记数据
   */
  static async processAfterReading(storedNote: Note): Promise<PlainNoteData> {
    return this.decryptNote(storedNote);
  }
}

export default TransparentCryptoService;
