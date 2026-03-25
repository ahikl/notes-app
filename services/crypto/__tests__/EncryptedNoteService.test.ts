import { Note } from '@/types/notes/NoteTypes';
import { EncryptedNoteService, EncryptedNoteServiceError } from '../EncryptedNoteService';

// Mock 依赖
jest.mock('@/services', () => ({
  CryptoService: {
    generateRandomKey: jest.fn(() => Buffer.alloc(32, 'x')),
    keyToBase64: jest.fn((key: Buffer) => key.toString('base64')),
    keyFromBase64: jest.fn((base64: string) => Buffer.from(base64, 'base64')),
    isValidBase64: jest.fn((str: string) => {
      try {
        return Buffer.from(str, 'base64').toString('base64') === str;
      } catch {
        return false;
      }
    }),
    encrypt: jest.fn((data: string, key: Buffer) => `iv:${Buffer.from(data).toString('base64')}`),
    decrypt: jest.fn((encrypted: string, key: Buffer) => {
      const parts = encrypted.split(':');
      if (parts.length !== 2) throw new Error('Invalid format');
      return Buffer.from(parts[1], 'base64').toString();
    }),
  },
  CryptoError: class AppError extends Error {
    constructor(
      message: string,
      public code: string,
    ) {
      super(message);
      this.name = 'AppError';
    }
  },
}));

jest.mock('../../notes/NoteService', () => ({
  getNoteById: jest.fn(),
  createNote: jest.fn(),
  updateNote: jest.fn(),
  deleteNote: jest.fn(),
}));

jest.mock('../../local/LocalNoteService', () => ({
  getNotes: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

describe('EncryptedNoteService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getOrCreateEncryptionKey', () => {
    it('应该返回现有密钥', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const mockKey = Buffer.alloc(32, 'x').toString('base64');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockKey);

      const key = await EncryptedNoteService.getOrCreateEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(key.length).toBe(32);
    });

    it('应该在密钥不存在时创建新密钥', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const key = await EncryptedNoteService.getOrCreateEncryptionKey();
      expect(key).toBeInstanceOf(Buffer);
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    it('应该抛出错误当存储的密钥格式无效', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-base64!!!');

      await expect(EncryptedNoteService.getOrCreateEncryptionKey()).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });
  });

  describe('encryptNoteContent / decryptNoteContent', () => {
    it('应该正确加密笔记内容', async () => {
      const key = Buffer.alloc(32, 'x');
      const content = 'Hello, World!';
      const encrypted = await EncryptedNoteService.encryptNoteContent(content, key);
      expect(typeof encrypted).toBe('string');
    });

    it('应该正确解密笔记内容', async () => {
      const key = Buffer.alloc(32, 'x');
      const content = 'Hello, World!';
      const encrypted = await EncryptedNoteService.encryptNoteContent(content, key);
      const decrypted = await EncryptedNoteService.decryptNoteContent(encrypted, key);
      expect(decrypted).toBe(content);
    });

    it('应该抛出错误当内容为空', async () => {
      const key = Buffer.alloc(32, 'x');
      await expect(EncryptedNoteService.encryptNoteContent('', key)).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });

    it('应该抛出错误当密钥无效', async () => {
      await expect(EncryptedNoteService.encryptNoteContent('test', null as any)).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });
  });

  describe('createEncryptedNote', () => {
    it('应该创建加密笔记', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const mockKey = Buffer.alloc(32, 'x').toString('base64');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockKey);

      const noteService = await import('../../notes/NoteService');
      (noteService.createNote as jest.Mock).mockResolvedValue({ id: '123', success: true });

      const mockNote = await import('../../notes/NoteService');
      (mockNote.getNoteById as jest.Mock).mockResolvedValue({
        id: '123',
        title: 'Test',
        content: 'iv:dGVzdA==',
        is_encrypted: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const noteData = {
        title: 'Test Note',
        content: 'Test Content',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = await EncryptedNoteService.createEncryptedNote(noteData);
      expect(result).toHaveProperty('id');
    });

    it('应该抛出错误当标题为空', async () => {
      const noteData = {
        title: '',
        content: 'Test Content',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await expect(EncryptedNoteService.createEncryptedNote(noteData)).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });

    it('应该抛出错误当内容为空', async () => {
      const noteData = {
        title: 'Test',
        content: '',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await expect(EncryptedNoteService.createEncryptedNote(noteData)).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });
  });

  describe('getDecryptedNote', () => {
    it('应该获取并解密笔记', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const mockKey = Buffer.alloc(32, 'x').toString('base64');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockKey);

      const noteService = await import('../../notes/NoteService');
      (noteService.getNoteById as jest.Mock).mockResolvedValue({
        id: '123',
        title: 'Test',
        content: 'iv:SGVsbG8sIFdvcmxkIQ==',
        is_encrypted: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await EncryptedNoteService.getDecryptedNote('123');
      expect(result).toHaveProperty('id', '123');
    });

    it('应该返回非加密笔记而不解密', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const mockKey = Buffer.alloc(32, 'x').toString('base64');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockKey);

      const noteService = await import('../../notes/NoteService');
      (noteService.getNoteById as jest.Mock).mockResolvedValue({
        id: '123',
        title: 'Test',
        content: 'Plain text content',
        is_encrypted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await EncryptedNoteService.getDecryptedNote('123');
      expect(result.content).toBe('Plain text content');
    });

    it('应该抛出错误当笔记不存在', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const mockKey = Buffer.alloc(32, 'x').toString('base64');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockKey);

      const noteService = await import('../../notes/NoteService');
      (noteService.getNoteById as jest.Mock).mockResolvedValue(null);

      await expect(EncryptedNoteService.getDecryptedNote('999')).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });

    it('应该抛出错误当ID为空', async () => {
      await expect(EncryptedNoteService.getDecryptedNote('')).rejects.toThrow(
        EncryptedNoteServiceError,
      );
      await expect(EncryptedNoteService.getDecryptedNote(null as any)).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });
  });

  describe('updateEncryptedNote', () => {
    it('应该更新加密笔记', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const mockKey = Buffer.alloc(32, 'x').toString('base64');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockKey);

      const noteService = await import('../../notes/NoteService');
      (noteService.updateNote as jest.Mock).mockResolvedValue({ success: true });
      (noteService.getNoteById as jest.Mock).mockResolvedValue({
        id: '123',
        title: 'Updated',
        content: 'iv:VXBkYXRlZA==',
        is_encrypted: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      const result = await EncryptedNoteService.updateEncryptedNote('123', {
        title: 'Updated Title',
        content: 'Updated Content',
      });
      expect(result).toHaveProperty('id', '123');
    });

    it('应该抛出错误当ID为空', async () => {
      await expect(EncryptedNoteService.updateEncryptedNote('', { title: 'Test' })).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });

    it('应该抛出错误当更新数据为空', async () => {
      await expect(EncryptedNoteService.updateEncryptedNote('123', null as any)).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });
  });

  describe('deleteEncryptedNote', () => {
    it('应该删除加密笔记', async () => {
      const noteService = await import('../../notes/NoteService');
      (noteService.deleteNote as jest.Mock).mockResolvedValue({ success: true });

      await expect(EncryptedNoteService.deleteEncryptedNote('123')).resolves.not.toThrow();
    });

    it('应该抛出错误当ID为空', async () => {
      await expect(EncryptedNoteService.deleteEncryptedNote('')).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });
  });

  describe('exportEncryptionKey', () => {
    it('应该导出加密密钥', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      const mockKey = Buffer.alloc(32, 'x').toString('base64');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(mockKey);

      const exportedKey = await EncryptedNoteService.exportEncryptionKey();
      expect(typeof exportedKey).toBe('string');
      expect(exportedKey.length).toBeGreaterThan(0);
    });
  });

  describe('importEncryptionKey', () => {
    it('应该导入有效的加密密钥', async () => {
      const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage');
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
      (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

      const validKey = Buffer.alloc(32, 'x').toString('base64');
      await expect(EncryptedNoteService.importEncryptionKey(validKey)).resolves.not.toThrow();
    });

    it('应该抛出错误当密钥格式无效', async () => {
      await expect(EncryptedNoteService.importEncryptionKey('invalid-key')).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });

    it('应该抛出错误当密钥长度无效', async () => {
      const shortKey = Buffer.alloc(10).toString('base64');
      await expect(EncryptedNoteService.importEncryptionKey(shortKey)).rejects.toThrow(
        EncryptedNoteServiceError,
      );
    });
  });

  describe('isNoteEncrypted', () => {
    it('应该正确识别加密笔记', () => {
      const encryptedNote: Note = {
        id: '1',
        title: 'Test',
        content: 'encrypted',
        is_encrypted: 1,
        sync_status: 0,
        is_deleted: 0,
        created_at: '',
        updated_at: '',
      };
      expect(EncryptedNoteService.isNoteEncrypted(encryptedNote)).toBe(true);
    });

    it('应该正确识别非加密笔记', () => {
      const normalNote: Note = {
        id: '1',
        title: 'Test',
        content: 'plain',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: '',
        updated_at: '',
      };
      expect(EncryptedNoteService.isNoteEncrypted(normalNote)).toBe(false);
    });
  });

  describe('getNoteForSync', () => {
    it('应该返回笔记的副本用于同步', () => {
      const note: Note = {
        id: '1',
        title: 'Test',
        content: 'encrypted-content',
        is_encrypted: 1,
        sync_status: 0,
        is_deleted: 0,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };
      const syncNote = EncryptedNoteService.getNoteForSync(note);
      expect(syncNote).toEqual(note);
      expect(syncNote).not.toBe(note); // 应该是不同的对象
    });
  });
});
