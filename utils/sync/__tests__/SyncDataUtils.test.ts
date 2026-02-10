import { DatabaseNote, SyncNote } from '@/types/notes/NoteTypes';
import { databaseNoteToSyncNote, syncNoteToDatabaseNote } from '../SyncDataUtils';

describe('SyncDataUtils - Base64 编解码', () => {
  const mockTimestamp = '2024-01-01T00:00:00.000Z';

  describe('明文笔记处理', () => {
    it('发送时应该将明文内容 Base64 编码', () => {
      const plainNote: DatabaseNote = {
        id: 'test-1',
        title: '测试笔记',
        content: 'Hello World! 你好世界！',
        iv: undefined,
        auth_tag: undefined,
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      };

      const syncNote = databaseNoteToSyncNote(plainNote);

      // 验证 content 已被 Base64 编码
      expect(syncNote.content).not.toBe('Hello World! 你好世界！');
      expect(syncNote.content).toBe(
        Buffer.from('Hello World! 你好世界！', 'utf8').toString('base64'),
      );
      expect(syncNote.iv).toBeUndefined();
      expect(syncNote.auth_tag).toBeUndefined();
      expect(syncNote.is_encrypted).toBe(0);
    });

    it('接收时应该将明文内容 Base64 解码', () => {
      const syncNote: SyncNote = {
        id: 'test-2',
        title: '测试笔记',
        content: Buffer.from('Hello World! 你好世界！', 'utf8').toString('base64'),
        iv: undefined,
        auth_tag: undefined,
        is_encrypted: 0,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      };

      const dbNote = syncNoteToDatabaseNote(syncNote);

      // 验证 content 已被解码回明文
      expect(dbNote.content).toBe('Hello World! 你好世界！');
      expect(dbNote.iv).toBeUndefined();
      expect(dbNote.auth_tag).toBeUndefined();
      expect(dbNote.is_encrypted).toBe(0);
    });
  });

  describe('加密笔记处理', () => {
    it('发送时应该保持加密内容的 Base64 格式', () => {
      const encryptedNote: DatabaseNote = {
        id: 'test-3',
        title: '加密笔记',
        content: 'ZW5jcnlwdGVkQ29udGVudA==', // 已经是 Base64
        iv: 'cmFuZG9tSVY=',
        auth_tag: 'YXV0aFRhZw==',
        is_encrypted: 1,
        sync_status: 0,
        is_deleted: 0,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      };

      const syncNote = databaseNoteToSyncNote(encryptedNote);

      // 验证加密内容保持不变
      expect(syncNote.content).toBe('ZW5jcnlwdGVkQ29udGVudA==');
      expect(syncNote.iv).toBe('cmFuZG9tSVY=');
      expect(syncNote.auth_tag).toBe('YXV0aFRhZw==');
      expect(syncNote.is_encrypted).toBe(1);
    });

    it('接收时应该保持加密内容的 Base64 格式', () => {
      const syncNote: SyncNote = {
        id: 'test-4',
        title: '加密笔记',
        content: 'ZW5jcnlwdGVkQ29udGVudA==',
        iv: 'cmFuZG9tSVY=',
        auth_tag: 'YXV0aFRhZw==',
        is_encrypted: 1,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      };

      const dbNote = syncNoteToDatabaseNote(syncNote);

      // 验证加密内容保持不变
      expect(dbNote.content).toBe('ZW5jcnlwdGVkQ29udGVudA==');
      expect(dbNote.iv).toBe('cmFuZG9tSVY=');
      expect(dbNote.auth_tag).toBe('YXV0aFRhZw==');
      expect(dbNote.is_encrypted).toBe(1);
    });
  });

  describe('往返转换测试', () => {
    it('明文笔记往返转换应该保持内容一致', () => {
      const originalContent = 'Hello World! 你好世界！🎉';
      const dbNote: DatabaseNote = {
        id: 'test-5',
        title: '测试',
        content: originalContent,
        iv: undefined,
        auth_tag: undefined,
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      };

      // 往返转换
      const syncNote = databaseNoteToSyncNote(dbNote);
      const restoredNote = syncNoteToDatabaseNote(syncNote);

      expect(restoredNote.content).toBe(originalContent);
    });

    it('加密笔记往返转换应该保持内容一致', () => {
      const originalContent = 'ZW5jcnlwdGVkQ29udGVudA==';
      const dbNote: DatabaseNote = {
        id: 'test-6',
        title: '测试',
        content: originalContent,
        iv: 'cmFuZG9tSVY=',
        auth_tag: 'YXV0aFRhZw==',
        is_encrypted: 1,
        sync_status: 0,
        is_deleted: 0,
        created_at: mockTimestamp,
        updated_at: mockTimestamp,
      };

      // 往返转换
      const syncNote = databaseNoteToSyncNote(dbNote);
      const restoredNote = syncNoteToDatabaseNote(syncNote);

      expect(restoredNote.content).toBe(originalContent);
    });
  });
});
