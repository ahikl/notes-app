import { CryptoError, CryptoService } from '@/services';
import { Note } from '@/types/notes/NoteTypes';
import { KeyStorage, KeyStorageError } from '@/utils/crypto/KeyStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import localNoteService from '../local/LocalNoteService';
import noteService from '../notes/NoteService';

// 类型守卫函数
const isCryptoError = (error: unknown): error is CryptoError => {
  return error instanceof CryptoError;
};

const isKeyStorageError = (error: unknown): error is KeyStorageError => {
  return error instanceof KeyStorageError;
};

/**
 * 加密笔记服务错误
 */
export class EncryptedNoteServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'EncryptedNoteServiceError';
  }
}

/**
 * 密钥元数据接口
 */
interface KeyMetadata {
  version: number;
  createdAt: number;
  algorithm: string;
}

/**
 * 加密笔记服务
 * 提供对笔记内容的加密存储和检索功能
 */
export class EncryptedNoteService {
  private static readonly ENCRYPTION_KEY_STORAGE_KEY = 'ENCRYPTED_NOTES_KEY';
  private static readonly KEY_METADATA_STORAGE_KEY = 'ENCRYPTED_NOTES_KEY_METADATA';
  private static readonly CURRENT_KEY_VERSION = 1;
  private static readonly KEY_ID = 'default_encryption_key';
  private static useSecureStorage: boolean = true;

  /**
   * 获取密钥元数据
   */
  private static async getKeyMetadata(): Promise<KeyMetadata | null> {
    try {
      const metadataJson = await AsyncStorage.getItem(this.KEY_METADATA_STORAGE_KEY);
      if (metadataJson) {
        return JSON.parse(metadataJson) as KeyMetadata;
      }
      return null;
    } catch (error) {
      console.error('获取密钥元数据失败:', error);
      return null;
    }
  }

  /**
   * 保存密钥元数据
   */
  private static async saveKeyMetadata(metadata: KeyMetadata): Promise<void> {
    try {
      await AsyncStorage.setItem(this.KEY_METADATA_STORAGE_KEY, JSON.stringify(metadata));
    } catch (error) {
      console.error('保存密钥元数据失败:', error);
      throw new EncryptedNoteServiceError(
        '保存密钥元数据失败',
        'KEY_METADATA_SAVE_FAILED',
        error as Error,
      );
    }
  }

  /**
   * 检查是否可以使用安全存储
   */
  static async checkSecureStorageAvailability(): Promise<boolean> {
    try {
      const available = await KeyStorage.isAvailable();
      this.useSecureStorage = available;
      return available;
    } catch {
      this.useSecureStorage = false;
      return false;
    }
  }

  /**
   * 获取或创建加密密钥
   * 优先使用 SecureStore，如果不支持则回退到 AsyncStorage
   * @returns 加密密钥
   */
  static async getOrCreateEncryptionKey(): Promise<Buffer> {
    try {
      // 检查 SecureStore 是否可用
      if (this.useSecureStorage) {
        try {
          const isAvailable = await KeyStorage.isAvailable();
          if (isAvailable) {
            // 尝试从 SecureStore 获取密钥
            const hasKey = await KeyStorage.hasKey(this.KEY_ID);
            if (hasKey) {
              const { key } = await KeyStorage.retrieveKey(this.KEY_ID);
              return CryptoService.keyFromBase64(key);
            }

            // 生成新密钥并存储到 SecureStore
            const { key } = await KeyStorage.generateAndStoreKey(this.KEY_ID, 32);
            return CryptoService.keyFromBase64(key);
          }
        } catch (secureStoreError) {
          console.warn('SecureStore 不可用，回退到 AsyncStorage:', secureStoreError);
          this.useSecureStorage = false;
        }
      }

      // 回退到 AsyncStorage
      return await this.getOrCreateKeyFromAsyncStorage();
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      if (isCryptoError(error)) {
        throw new EncryptedNoteServiceError(
          `密钥操作失败: ${(error as CryptoError).message}`,
          (error as CryptoError).code,
          error as Error,
        );
      }
      if (isKeyStorageError(error)) {
        throw new EncryptedNoteServiceError(
          `密钥存储操作失败: ${(error as KeyStorageError).message}`,
          (error as KeyStorageError).code,
          error as Error,
        );
      }
      console.error('获取或创建加密密钥失败:', error);
      throw new EncryptedNoteServiceError(
        '无法初始化加密密钥',
        'KEY_INITIALIZATION_FAILED',
        error as Error,
      );
    }
  }

  /**
   * 从 AsyncStorage 获取或创建密钥（回退方案）
   */
  private static async getOrCreateKeyFromAsyncStorage(): Promise<Buffer> {
    // 尝试从存储中获取现有密钥
    const storedKey = await AsyncStorage.getItem(this.ENCRYPTION_KEY_STORAGE_KEY);

    if (storedKey) {
      // 验证密钥格式
      if (!CryptoService.isValidBase64(storedKey)) {
        throw new EncryptedNoteServiceError('存储的密钥格式无效', 'INVALID_STORED_KEY');
      }
      return CryptoService.keyFromBase64(storedKey);
    }

    // 如果没有现有密钥，则生成新密钥并存储
    const newKey = CryptoService.generateRandomKey();
    const base64Key = CryptoService.keyToBase64(newKey);
    await AsyncStorage.setItem(this.ENCRYPTION_KEY_STORAGE_KEY, base64Key);

    // 保存密钥元数据
    const metadata: KeyMetadata = {
      version: this.CURRENT_KEY_VERSION,
      createdAt: Date.now(),
      algorithm: 'aes-256-cbc',
    };
    await this.saveKeyMetadata(metadata);

    return newKey;
  }

  /**
   * 加密笔记内容
   * @param content 笔记内容
   * @param key 加密密钥
   * @returns 加密后的笔记内容
   */
  static async encryptNoteContent(content: string, key: Buffer): Promise<string> {
    try {
      if (!content || typeof content !== 'string') {
        throw new EncryptedNoteServiceError('笔记内容不能为空', 'INVALID_CONTENT');
      }
      if (!key || !(key instanceof Buffer)) {
        throw new EncryptedNoteServiceError('加密密钥无效', 'INVALID_KEY');
      }
      return CryptoService.encrypt(content, key);
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      if (isCryptoError(error)) {
        throw new EncryptedNoteServiceError(
          `加密笔记内容失败: ${(error as CryptoError).message}`,
          (error as CryptoError).code,
          error as Error,
        );
      }
      console.error('加密笔记内容失败:', error);
      throw new EncryptedNoteServiceError('加密笔记内容失败', 'ENCRYPTION_FAILED', error as Error);
    }
  }

  /**
   * 解密笔记内容
   * @param encryptedContent 加密的笔记内容
   * @param key 解密密钥
   * @returns 解密后的笔记内容
   */
  static async decryptNoteContent(encryptedContent: string, key: Buffer): Promise<string> {
    try {
      if (!encryptedContent || typeof encryptedContent !== 'string') {
        throw new EncryptedNoteServiceError('加密内容不能为空', 'INVALID_CONTENT');
      }
      if (!key || !(key instanceof Buffer)) {
        throw new EncryptedNoteServiceError('解密密钥无效', 'INVALID_KEY');
      }
      return CryptoService.decrypt(encryptedContent, key);
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      if (isCryptoError(error)) {
        throw new EncryptedNoteServiceError(
          `解密笔记内容失败: ${(error as CryptoError).message}`,
          (error as CryptoError).code,
          error as Error,
        );
      }
      console.error('解密笔记内容失败:', error);
      throw new EncryptedNoteServiceError('解密笔记内容失败', 'DECRYPTION_FAILED', error as Error);
    }
  }

  /**
   * 创建加密笔记
   * @param note 笔记对象（内容将被加密）
   * @returns 创建的笔记对象
   */
  static async createEncryptedNote(note: Omit<Note, 'id'>): Promise<Note> {
    try {
      // 验证输入
      if (!note || typeof note !== 'object') {
        throw new EncryptedNoteServiceError('笔记对象不能为空', 'INVALID_NOTE');
      }
      if (!note.title || typeof note.title !== 'string') {
        throw new EncryptedNoteServiceError('笔记标题不能为空', 'INVALID_TITLE');
      }
      if (!note.content || typeof note.content !== 'string') {
        throw new EncryptedNoteServiceError('笔记内容不能为空', 'INVALID_CONTENT');
      }

      const key = await this.getOrCreateEncryptionKey();
      const encryptedContent = await this.encryptNoteContent(note.content, key);

      // 创建笔记，但内容是加密的
      const noteToCreate = {
        ...note,
        content: encryptedContent,
        is_encrypted: 1, // 标记为加密笔记
        created_at: note.created_at || new Date().toISOString(),
        updated_at: note.updated_at || new Date().toISOString(),
      };

      const response = await noteService.createNote(noteToCreate);

      if (!response || !response.id) {
        throw new EncryptedNoteServiceError('创建笔记失败：服务器未返回有效ID', 'CREATE_FAILED');
      }

      // 使用返回的ID获取完整的笔记对象
      return await this.getDecryptedNote(response.id);
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      console.error('创建加密笔记失败:', error);
      throw new EncryptedNoteServiceError('创建加密笔记失败', 'CREATE_FAILED', error as Error);
    }
  }

  /**
   * 获取笔记并解密内容
   * @param id 笔记ID
   * @returns 解密后的笔记对象
   */
  static async getDecryptedNote(id: string): Promise<Note> {
    try {
      if (!id || typeof id !== 'string') {
        throw new EncryptedNoteServiceError('笔记ID不能为空', 'INVALID_ID');
      }

      const key = await this.getOrCreateEncryptionKey();
      const note = await noteService.getNoteById(id);

      if (!note) {
        throw new EncryptedNoteServiceError('笔记不存在', 'NOTE_NOT_FOUND');
      }

      // 检查笔记是否为加密笔记
      if (note.is_encrypted !== 1) {
        // 如果不是加密笔记，直接返回
        return note;
      }

      // 解密内容
      try {
        const decryptedContent = await this.decryptNoteContent(note.content, key);
        return {
          ...note,
          content: decryptedContent,
        };
      } catch (decryptError) {
        // 解密失败时返回原始笔记，但标记解密失败
        console.error(`解密笔记 ${id} 失败:`, decryptError);
        throw new EncryptedNoteServiceError(
          '无法解密笔记内容，可能是密钥不匹配或数据损坏',
          'DECRYPTION_FAILED',
          decryptError as Error,
        );
      }
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      console.error('获取解密笔记失败:', error);
      throw new EncryptedNoteServiceError('获取解密笔记失败', 'FETCH_FAILED', error as Error);
    }
  }

  /**
   * 获取所有笔记并解密内容
   * @returns 解密后的笔记数组
   */
  static async getAllDecryptedNotes(): Promise<Note[]> {
    try {
      const key = await this.getOrCreateEncryptionKey();
      const paginatedNotes = await localNoteService.getNotes();
      const notes = paginatedNotes.data; // 从分页响应中提取数据

      const decryptedNotes: Note[] = [];
      const decryptionErrors: string[] = [];

      for (const note of notes) {
        try {
          // 只解密加密笔记
          if (note.is_encrypted === 1) {
            const decryptedContent = await this.decryptNoteContent(note.content, key);
            decryptedNotes.push({
              ...note,
              content: decryptedContent,
            });
          } else {
            // 非加密笔记直接添加
            decryptedNotes.push(note);
          }
        } catch (error) {
          console.error(`解密笔记 ${note.id} 失败:`, error);
          decryptionErrors.push(note.id);
          // 对于解密失败的笔记，保留原始内容并添加错误标记
          decryptedNotes.push({
            ...note,
            content: '[解密失败]',
          });
        }
      }

      if (decryptionErrors.length > 0) {
        console.warn(`以下笔记解密失败: ${decryptionErrors.join(', ')}`);
      }

      return decryptedNotes;
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      console.error('获取所有解密笔记失败:', error);
      throw new EncryptedNoteServiceError(
        '获取所有解密笔记失败',
        'FETCH_ALL_FAILED',
        error as Error,
      );
    }
  }

  /**
   * 更新加密笔记
   * @param id 笔记ID
   * @param updatedNote 更新的笔记对象（内容将被加密）
   * @returns 更新的笔记对象
   */
  static async updateEncryptedNote(
    id: string,
    updatedNote: Partial<Omit<Note, 'id'>>,
  ): Promise<Note> {
    try {
      if (!id || typeof id !== 'string') {
        throw new EncryptedNoteServiceError('笔记ID不能为空', 'INVALID_ID');
      }
      if (!updatedNote || typeof updatedNote !== 'object') {
        throw new EncryptedNoteServiceError('更新数据不能为空', 'INVALID_UPDATE_DATA');
      }

      const key = await this.getOrCreateEncryptionKey();

      // 构建更新对象，确保包含所有必需的字段
      let noteToUpdate: any = {};

      // 复制提供的更新字段
      if (updatedNote.title !== undefined) {
        if (typeof updatedNote.title !== 'string') {
          throw new EncryptedNoteServiceError('标题必须是字符串', 'INVALID_TITLE');
        }
        noteToUpdate.title = updatedNote.title;
      }

      if (updatedNote.content !== undefined) {
        if (typeof updatedNote.content !== 'string') {
          throw new EncryptedNoteServiceError('内容必须是字符串', 'INVALID_CONTENT');
        }
        noteToUpdate.content = await this.encryptNoteContent(updatedNote.content, key);
      }

      // 添加 UpdateNoteRequest 必需的字段
      noteToUpdate.is_encrypted = 1; // 标记为加密笔记
      noteToUpdate.updated_at = new Date().toISOString();

      // 更新笔记
      await noteService.updateNote(id, noteToUpdate);

      // 获取更新后的笔记并返回
      return await this.getDecryptedNote(id);
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      if (isCryptoError(error)) {
        throw new EncryptedNoteServiceError(
          `更新加密笔记失败: ${(error as CryptoError).message}`,
          (error as CryptoError).code,
          error as Error,
        );
      }
      console.error('更新加密笔记失败:', error);
      throw new EncryptedNoteServiceError('更新加密笔记失败', 'UPDATE_FAILED', error as Error);
    }
  }

  /**
   * 删除加密笔记
   * @param id 笔记ID
   */
  static async deleteEncryptedNote(id: string): Promise<void> {
    try {
      if (!id || typeof id !== 'string') {
        throw new EncryptedNoteServiceError('笔记ID不能为空', 'INVALID_ID');
      }

      await noteService.deleteNote(id);
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      console.error('删除加密笔记失败:', error);
      throw new EncryptedNoteServiceError('删除加密笔记失败', 'DELETE_FAILED', error as Error);
    }
  }

  /**
   * 生成新的加密密钥
   * 注意：这将导致现有加密数据无法解密，除非备份了旧密钥
   * @param backupOldKey 是否备份旧密钥
   * @returns 如果backupOldKey为true，返回旧密钥
   */
  static async generateNewEncryptionKey(
    backupOldKey: boolean = false,
  ): Promise<string | undefined> {
    try {
      let oldKey: string | undefined;

      if (backupOldKey) {
        const storedKey = await AsyncStorage.getItem(this.ENCRYPTION_KEY_STORAGE_KEY);
        if (storedKey) {
          oldKey = storedKey;
          // 保存备份
          const backupKey = `${this.ENCRYPTION_KEY_STORAGE_KEY}_backup_${Date.now()}`;
          await AsyncStorage.setItem(backupKey, storedKey);
        }
      }

      const newKey = CryptoService.generateRandomKey();
      const base64Key = CryptoService.keyToBase64(newKey);
      await AsyncStorage.setItem(this.ENCRYPTION_KEY_STORAGE_KEY, base64Key);

      // 更新密钥元数据
      const metadata: KeyMetadata = {
        version: this.CURRENT_KEY_VERSION + 1,
        createdAt: Date.now(),
        algorithm: 'aes-256-cbc',
      };
      await this.saveKeyMetadata(metadata);

      return oldKey;
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      if (isCryptoError(error)) {
        throw new EncryptedNoteServiceError(
          `生成新密钥失败: ${(error as CryptoError).message}`,
          (error as CryptoError).code,
          error as Error,
        );
      }
      console.error('生成新加密密钥失败:', error);
      throw new EncryptedNoteServiceError(
        '生成新加密密钥失败',
        'KEY_GENERATION_FAILED',
        error as Error,
      );
    }
  }

  /**
   * 导出加密密钥
   * @returns Base64编码的加密密钥
   */
  static async exportEncryptionKey(): Promise<string> {
    try {
      // 优先尝试从 SecureStore 导出
      if (this.useSecureStorage) {
        try {
          const isAvailable = await KeyStorage.isAvailable();
          if (isAvailable) {
            const hasKey = await KeyStorage.hasKey(this.KEY_ID);
            if (hasKey) {
              const { key } = await KeyStorage.retrieveKey(this.KEY_ID);
              return key;
            }
          }
        } catch (secureStoreError) {
          console.warn('从 SecureStore 导出失败，回退到 AsyncStorage:', secureStoreError);
        }
      }

      // 回退到 AsyncStorage
      const key = await this.getOrCreateEncryptionKey();
      return CryptoService.keyToBase64(key);
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      if (isKeyStorageError(error)) {
        throw new EncryptedNoteServiceError(
          `导出密钥失败: ${(error as KeyStorageError).message}`,
          (error as KeyStorageError).code,
          error as Error,
        );
      }
      console.error('导出加密密钥失败:', error);
      throw new EncryptedNoteServiceError('导出加密密钥失败', 'EXPORT_FAILED', error as Error);
    }
  }

  /**
   * 导入加密密钥
   * @param keyBase64 Base64编码的加密密钥
   * @param backupCurrent 是否备份当前密钥
   */
  static async importEncryptionKey(
    keyBase64: string,
    backupCurrent: boolean = true,
  ): Promise<void> {
    try {
      if (!keyBase64 || typeof keyBase64 !== 'string') {
        throw new EncryptedNoteServiceError('密钥不能为空', 'INVALID_KEY');
      }

      // 验证密钥格式
      if (!CryptoService.isValidBase64(keyBase64)) {
        throw new EncryptedNoteServiceError(
          '密钥格式无效，必须是有效的base64编码',
          'INVALID_KEY_FORMAT',
        );
      }

      // 验证密钥长度
      const keyBuffer = Buffer.from(keyBase64, 'base64');
      if (keyBuffer.length !== 16 && keyBuffer.length !== 24 && keyBuffer.length !== 32) {
        throw new EncryptedNoteServiceError(
          `密钥长度${keyBuffer.length}字节无效，必须是16、24或32字节`,
          'INVALID_KEY_LENGTH',
        );
      }

      // 优先使用 SecureStore
      if (this.useSecureStorage) {
        try {
          const isAvailable = await KeyStorage.isAvailable();
          if (isAvailable) {
            // 备份当前密钥
            if (backupCurrent) {
              const hasKey = await KeyStorage.hasKey(this.KEY_ID);
              if (hasKey) {
                await KeyStorage.backupKey(this.KEY_ID, `import_backup_${Date.now()}`);
              }
            }

            // 存储新密钥
            const metadata = {
              version: this.CURRENT_KEY_VERSION,
              createdAt: Date.now(),
              algorithm: 'aes-256-cbc' as const,
              keyId: this.KEY_ID,
            };
            await KeyStorage.storeKey(this.KEY_ID, keyBase64, metadata);
            return;
          }
        } catch (secureStoreError) {
          console.warn('SecureStore 导入失败，回退到 AsyncStorage:', secureStoreError);
        }
      }

      // 回退到 AsyncStorage
      // 备份当前密钥
      if (backupCurrent) {
        const currentKey = await AsyncStorage.getItem(this.ENCRYPTION_KEY_STORAGE_KEY);
        if (currentKey) {
          const backupKey = `${this.ENCRYPTION_KEY_STORAGE_KEY}_backup_${Date.now()}`;
          await AsyncStorage.setItem(backupKey, currentKey);
        }
      }

      // 保存新密钥
      await AsyncStorage.setItem(this.ENCRYPTION_KEY_STORAGE_KEY, keyBase64);

      // 更新密钥元数据
      const metadata: KeyMetadata = {
        version: this.CURRENT_KEY_VERSION,
        createdAt: Date.now(),
        algorithm: 'aes-256-cbc',
      };
      await this.saveKeyMetadata(metadata);
    } catch (error) {
      if (error instanceof EncryptedNoteServiceError) {
        throw error;
      }
      if (isKeyStorageError(error)) {
        throw new EncryptedNoteServiceError(
          `导入密钥失败: ${(error as KeyStorageError).message}`,
          (error as KeyStorageError).code,
          error as Error,
        );
      }
      console.error('导入加密密钥失败:', error);
      throw new EncryptedNoteServiceError('导入加密密钥失败', 'IMPORT_FAILED', error as Error);
    }
  }

  /**
   * 检查笔记是否已加密
   * @param note 笔记对象
   * @returns 是否已加密
   */
  static isNoteEncrypted(note: Note): boolean {
    return note.is_encrypted === 1;
  }

  /**
   * 获取加密笔记的同步数据
   * 用于同步时保持加密状态
   * @param note 笔记对象
   * @returns 用于同步的笔记数据（保持加密）
   */
  static getNoteForSync(note: Note): Note {
    // 返回原始笔记，保持加密状态
    return { ...note };
  }
}

export default EncryptedNoteService;
