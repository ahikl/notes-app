// Jest 全局类型声明
import { Note } from '@/types/notes/NoteTypes';
import * as Y from 'yjs';
import { YjsNoteService } from '../YjsNoteService';

declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: () => void) => void;
declare const expect: (value: any) => any;
declare const beforeEach: (fn: () => void) => void;
declare const afterEach: (fn: () => void) => void;

describe('YjsNoteService', () => {
  beforeEach(() => {
    // 初始化 CRDT 服务
    YjsNoteService.initialize();
  });

  afterEach(() => {
    // 清理所有文档
    YjsNoteService.cleanupAll();
  });

  describe('initialize', () => {
    it('应该生成唯一的客户端 ID', () => {
      const clientId = YjsNoteService.getClientId();
      expect(clientId).toBeDefined();
      expect(clientId.length).toBeGreaterThan(0);
      expect(clientId).toContain('-');
    });

    it('多次调用应该返回相同的客户端 ID', () => {
      const clientId1 = YjsNoteService.getClientId();
      const clientId2 = YjsNoteService.getClientId();
      expect(clientId1).toBe(clientId2);
    });
  });

  describe('createDocument', () => {
    it('应该创建包含正确数据的 Yjs 文档', () => {
      const note = {
        id: 'test-note-1',
        title: '测试笔记',
        content: '这是测试内容',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const doc = YjsNoteService.createDocument(note);

      expect(doc).toBeDefined();
      expect(doc.guid).toBe(note.id);

      const extractedNote = YjsNoteService.extractNoteFromDocument(doc, note.id);
      expect(extractedNote.title).toBe(note.title);
      expect(extractedNote.content).toBe(note.content);
      expect(extractedNote.is_encrypted).toBe(note.is_encrypted);
    });

    it('应该正确处理加密笔记标记', () => {
      const note = {
        id: 'test-note-encrypted',
        title: '加密笔记',
        content: '加密内容',
        is_encrypted: 1,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const doc = YjsNoteService.createDocument(note);
      const extractedNote = YjsNoteService.extractNoteFromDocument(doc, note.id);

      expect(extractedNote.is_encrypted).toBe(1);
    });
  });

  describe('noteToCRDTUpdate and crdtUpdateToNote', () => {
    it('应该正确将笔记转换为 CRDT 更新并恢复', () => {
      const originalNote: Note = {
        id: 'test-note-2',
        title: '原始标题',
        content: '原始内容',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const update = YjsNoteService.noteToCRDTUpdate(originalNote);
      expect(update).toBeInstanceOf(Uint8Array);
      expect(update.length).toBeGreaterThan(0);

      const restoredNote = YjsNoteService.crdtUpdateToNote(originalNote.id, update);
      expect(restoredNote.title).toBe(originalNote.title);
      expect(restoredNote.content).toBe(originalNote.content);
      expect(restoredNote.is_encrypted).toBe(originalNote.is_encrypted);
    });
  });

  describe('mergeUpdates', () => {
    it('应该正确合并两个 CRDT 更新', () => {
      const noteId = 'test-merge-note';

      // 创建第一个更新
      const doc1 = new Y.Doc({ guid: noteId });
      const yText1 = doc1.getText('content');
      yText1.insert(0, 'Hello ');
      const update1 = Y.encodeStateAsUpdate(doc1);

      // 创建第二个更新（添加更多内容）
      const doc2 = new Y.Doc({ guid: noteId });
      const yText2 = doc2.getText('content');
      yText2.insert(0, 'World');
      const update2 = Y.encodeStateAsUpdate(doc2);

      // 合并更新
      const mergedUpdate = YjsNoteService.mergeUpdates(noteId, update1, update2);

      // 验证合并结果
      const mergedDoc = new Y.Doc({ guid: noteId });
      Y.applyUpdate(mergedDoc, mergedUpdate);
      const mergedContent = mergedDoc.getText('content').toString();

      // CRDT 应该自动合并内容
      expect(mergedContent).toContain('Hello');
      expect(mergedContent).toContain('World');

      doc1.destroy();
      doc2.destroy();
      mergedDoc.destroy();
    });
  });

  describe('hasConflict', () => {
    it('应该检测到时间戳不同的笔记存在冲突', () => {
      const localNote: Note = {
        id: 'conflict-test',
        title: '本地标题',
        content: '本地内容',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date(Date.now() - 1000).toISOString(), // 1秒前
      };

      const serverNote: Note = {
        id: 'conflict-test',
        title: '服务器标题',
        content: '服务器内容',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(), // 现在
      };

      // 时间差小于5秒，应该认为是冲突
      expect(YjsNoteService.hasConflict(localNote, serverNote)).toBe(true);
    });

    it('应该认为内容相同的笔记没有冲突', () => {
      const now = new Date().toISOString();
      const localNote: Note = {
        id: 'no-conflict-test',
        title: '相同标题',
        content: '相同内容',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: now,
        updated_at: now,
      };

      const serverNote: Note = {
        id: 'no-conflict-test',
        title: '相同标题',
        content: '相同内容',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: now,
        updated_at: new Date(Date.now() - 10000).toISOString(), // 10秒前
      };

      // 内容相同，应该认为没有冲突
      expect(YjsNoteService.hasConflict(localNote, serverNote)).toBe(false);
    });

    it('应该认为时间戳相同的笔记没有冲突', () => {
      const now = new Date().toISOString();
      const localNote: Note = {
        id: 'same-time-test',
        title: '标题A',
        content: '内容A',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: now,
        updated_at: now,
      };

      const serverNote: Note = {
        id: 'same-time-test',
        title: '标题B',
        content: '内容B',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: now,
        updated_at: now,
      };

      // 时间戳相同，应该认为没有冲突
      expect(YjsNoteService.hasConflict(localNote, serverNote)).toBe(false);
    });
  });

  describe('updateToBase64 and base64ToUpdate', () => {
    it('应该正确转换 Uint8Array 和 Base64', () => {
      const originalData = new Uint8Array([1, 2, 3, 4, 5, 255, 254, 253]);

      const base64 = YjsNoteService.updateToBase64(originalData);
      expect(typeof base64).toBe('string');
      expect(base64.length).toBeGreaterThan(0);

      const restoredData = YjsNoteService.base64ToUpdate(base64);
      expect(restoredData).toEqual(originalData);
    });
  });

  describe('cleanupDocument', () => {
    it('应该正确清理指定文档', () => {
      const note = {
        id: 'cleanup-test',
        title: '清理测试',
        content: '内容',
        is_encrypted: 0,
        sync_status: 0,
        is_deleted: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const doc = YjsNoteService.createDocument(note);
      expect(doc).toBeDefined();

      // 清理文档
      YjsNoteService.cleanupDocument(note.id);

      // 文档应该被销毁，再次清理不应该报错
      expect(() => YjsNoteService.cleanupDocument(note.id)).not.toThrow();
    });
  });
});
