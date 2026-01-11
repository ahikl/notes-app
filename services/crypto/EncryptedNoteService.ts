import { Note } from '@/types/notes/NoteTypes';
import { CryptoService } from '@/services';
import noteService from '../notes/NoteService';
import localNoteService from '../local/LocalNoteService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * 加密笔记服务
 * 提供对笔记内容的加密存储和检索功能
 */
export class EncryptedNoteService {
  private static readonly ENCRYPTION_KEY_STORAGE_KEY = 'ENCRYPTED_NOTES_KEY';

  /**
   * 获取或创建加密密钥
   * @returns 加密密钥
   */
  static async getOrCreateEncryptionKey(): Promise<Buffer> {
    try {
      // 尝试从存储中获取现有密钥
      const storedKey = await AsyncStorage.getItem(this.ENCRYPTION_KEY_STORAGE_KEY);

      if (storedKey) {
        return CryptoService.keyFromBase64(storedKey);
      }

      // 如果没有现有密钥，则生成新密钥并存储
      const newKey = CryptoService.generateRandomKey();
      const base64Key = CryptoService.keyToBase64(newKey);
      await AsyncStorage.setItem(this.ENCRYPTION_KEY_STORAGE_KEY, base64Key);

      return newKey;
    } catch (error) {
      console.error('获取或创建加密密钥失败:', error);
      throw new Error('无法初始化加密密钥');
    }
  }

  /**
   * 加密笔记内容
   * @param content 笔记内容
   * @param key 加密密钥
   * @returns 加密后的笔记内容
   */
  static async encryptNoteContent(content: string, key: Buffer): Promise<string> {
    try {
      return CryptoService.encrypt(content, key);
    } catch (error) {
      console.error('加密笔记内容失败:', error);
      throw new Error('加密笔记内容失败');
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
      return CryptoService.decrypt(encryptedContent, key);
    } catch (error) {
      console.error('解密笔记内容失败:', error);
      throw new Error('解密笔记内容失败');
    }
  }

  /**
   * 创建加密笔记
   * @param note 笔记对象（内容将被加密）
   * @returns 创建的笔记对象
   */
  static async createEncryptedNote(note: Omit<Note, 'id'>): Promise<Note> {
    const key = await this.getOrCreateEncryptionKey();
    const encryptedContent = await this.encryptNoteContent(note.content, key);

    // 创建笔记，但内容是加密的
    const noteToCreate = {
      ...note,
      content: encryptedContent,
      is_encrypted: 1, // 标记为加密笔记
    };

    const response = await noteService.createNote(noteToCreate);

    // 使用返回的ID获取完整的笔记对象
    return await this.getDecryptedNote(response.id);
  }

  /**
   * 获取笔记并解密内容
   * @param id 笔记ID
   * @returns 解密后的笔记对象
   */
  static async getDecryptedNote(id: string): Promise<Note> {
    const key = await this.getOrCreateEncryptionKey();
    const note = await noteService.getNoteById(id);

    if (!note) {
      throw new Error('笔记不存在');
    }

    // 解密内容
    const decryptedContent = await this.decryptNoteContent(note.content, key);

    return {
      ...note,
      content: decryptedContent,
    };
  }

  /**
   * 获取所有笔记并解密内容
   * @returns 解密后的笔记数组
   */
  static async getAllDecryptedNotes(): Promise<Note[]> {
    const key = await this.getOrCreateEncryptionKey();
    const paginatedNotes = await localNoteService.getNotes();
    const notes = paginatedNotes.data; // 从分页响应中提取数据

    return await Promise.all(
      notes.map(async (note: Note) => {
        const decryptedContent = await this.decryptNoteContent(note.content, key);
        return {
          ...note,
          content: decryptedContent,
        };
      }),
    );
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
    const key = await this.getOrCreateEncryptionKey();

    // 构建更新对象，确保包含所有必需的字段
    let noteToUpdate: any = {};

    // 复制提供的更新字段
    if (updatedNote.title !== undefined) noteToUpdate.title = updatedNote.title;
    if (updatedNote.content !== undefined) {
      noteToUpdate.content = await this.encryptNoteContent(updatedNote.content, key);
    }

    // 添加 UpdateNoteRequest 必需的字段
    noteToUpdate.is_encrypted = 1; // 标记为加密笔记
    noteToUpdate.updated_at = new Date().toISOString();

    // 更新笔记
    await noteService.updateNote(id, noteToUpdate);

    // 获取更新后的笔记并返回
    return await this.getDecryptedNote(id);
  }

  /**
   * 生成新的加密密钥
   * 注意：这将导致现有加密数据无法解密，除非备份了旧密钥
   */
  static async generateNewEncryptionKey(): Promise<void> {
    const newKey = CryptoService.generateRandomKey();
    const base64Key = CryptoService.keyToBase64(newKey);
    await AsyncStorage.setItem(this.ENCRYPTION_KEY_STORAGE_KEY, base64Key);
  }

  /**
   * 导出加密密钥
   * @returns Base64编码的加密密钥
   */
  static async exportEncryptionKey(): Promise<string> {
    const key = await this.getOrCreateEncryptionKey();
    return CryptoService.keyToBase64(key);
  }
}

export default EncryptedNoteService;
