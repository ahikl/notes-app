import { Note } from '@/types/notes/NoteTypes';
import * as Y from 'yjs';

/**
 * CRDT 笔记服务错误
 */
export class YjsNoteServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'YjsNoteServiceError';
  }
}

/**
 * CRDT 同步状态
 */
export interface CRDTSyncState {
  clientId: string;
  lastSyncTime: number;
  version: number;
}

/**
 * 笔记 CRDT 文档结构
 */
export interface NoteCRDTDocument {
  id: string;
  title: Y.Text;
  content: Y.Text;
  isEncrypted: Y.Map<boolean>;
  createdAt: string;
  updatedAt: Y.Map<number>;
  clientId: string;
}

/**
 * Yjs CRDT 笔记服务
 *
 * 使用 Yjs 实现无冲突复制数据类型，解决多设备同步冲突问题：
 * 1. 将笔记内容拆分为原子操作（字符级别的插入/删除）
 * 2. 自动合并多个客户端的并发修改
 * 3. 与透明加密服务兼容，支持加密笔记的 CRDT 同步
 */
export class YjsNoteService {
  private static clientId: string = '';
  private static docs: Map<string, Y.Doc> = new Map();

  /**
   * 初始化 CRDT 服务
   */
  static initialize(): void {
    // 生成唯一的客户端 ID（基于时间戳和随机数）
    this.clientId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    console.log('Yjs CRDT 服务初始化完成，客户端 ID:', this.clientId);
  }

  /**
   * 获取客户端 ID
   */
  static getClientId(): string {
    if (!this.clientId) {
      this.initialize();
    }
    return this.clientId;
  }

  /**
   * 创建新的 CRDT 文档
   *
   * @param note 笔记数据
   * @returns Yjs 文档
   */
  static createDocument(note: Partial<Note> & { id: string }): Y.Doc {
    const doc = new Y.Doc({
      guid: note.id,
    });

    // 创建共享数据结构
    const yTitle = doc.getText('title');
    const yContent = doc.getText('content');
    const yIsEncrypted = doc.getMap<boolean>('isEncrypted');
    const yUpdatedAt = doc.getMap<number>('updatedAt');

    // 初始化数据
    if (note.title) {
      yTitle.insert(0, note.title);
    }
    if (note.content) {
      yContent.insert(0, note.content);
    }
    yIsEncrypted.set('value', note.is_encrypted === 1);
    yUpdatedAt.set('timestamp', new Date(note.updated_at || Date.now()).getTime());

    // 存储文档引用
    this.docs.set(note.id, doc);

    return doc;
  }

  /**
   * 从 Yjs 文档提取笔记数据
   *
   * @param doc Yjs 文档
   * @param noteId 笔记 ID
   * @param originalNote
   * @returns 笔记数据
   */
  static extractNoteFromDocument(doc: Y.Doc, noteId: string, originalNote?: Note): Note {
    const yTitle = doc.getText('title');
    const yContent = doc.getText('content');
    const yIsEncrypted = doc.getMap<boolean>('isEncrypted');
    const yUpdatedAt = doc.getMap<number>('updatedAt');

    const updatedAtTimestamp = yUpdatedAt.get('timestamp') || Date.now();

    return {
      id: noteId,
      title: yTitle.toString(),
      content: yContent.toString(),
      is_encrypted: yIsEncrypted.get('value') ? 1 : 0,
      sync_status: 1,
      is_deleted: originalNote?.is_deleted ?? 0,
      created_at: originalNote?.created_at ?? new Date().toISOString(),
      updated_at: new Date(updatedAtTimestamp).toISOString(),
    };
  }

  /**
   * 将笔记转换为 CRDT 更新数据
   *
   * @param note 笔记数据
   * @returns CRDT 更新数据 (Uint8Array)
   */
  static noteToCRDTUpdate(note: Note): Uint8Array {
    const doc = this.createDocument(note);
    const update = Y.encodeStateAsUpdate(doc);

    // 清理临时文档
    doc.destroy();
    this.docs.delete(note.id);

    return update;
  }

  /**
   * 从 CRDT 更新数据恢复笔记
   *
   * @param noteId 笔记 ID
   * @param update CRDT 更新数据
   * @returns 笔记数据
   */
  static crdtUpdateToNote(noteId: string, update: Uint8Array): Note {
    const doc = new Y.Doc({ guid: noteId });
    Y.applyUpdate(doc, update);

    const note = this.extractNoteFromDocument(doc, noteId);

    // 清理文档
    doc.destroy();

    return note;
  }

  /**
   * 合并两个 CRDT 更新
   *
   * @param noteId 笔记 ID
   * @param update1 第一个更新
   * @param update2 第二个更新
   * @returns 合并后的更新
   */
  static mergeUpdates(noteId: string, update1: Uint8Array, update2: Uint8Array): Uint8Array {
    const doc = new Y.Doc({ guid: noteId });

    // 应用两个更新
    Y.applyUpdate(doc, update1);
    Y.applyUpdate(doc, update2);

    // 获取合并后的状态
    const mergedUpdate = Y.encodeStateAsUpdate(doc);

    // 清理文档
    doc.destroy();

    return mergedUpdate;
  }

  /**
   * 合并多个笔记的 CRDT 状态
   *
   * @param noteId 笔记 ID
   * @param localNote 本地笔记（明文内容）
   * @param serverNote 服务器笔记（明文内容）
   * @returns 合并后的笔记（明文内容）
   */
  static mergeNotes(noteId: string, localNote: Note, serverNote: Note): Note {
    try {
      // 创建 CRDT 文档并应用本地状态
      const doc = new Y.Doc({ guid: noteId });

      // 初始化本地状态
      const yTitle = doc.getText('title');
      const yContent = doc.getText('content');
      const yIsEncrypted = doc.getMap<boolean>('isEncrypted');
      const yUpdatedAt = doc.getMap<number>('updatedAt');

      yTitle.insert(0, localNote.title);
      yContent.insert(0, localNote.content);
      yIsEncrypted.set('value', localNote.is_encrypted === 1);
      yUpdatedAt.set('timestamp', new Date(localNote.updated_at).getTime());

      // 创建服务器状态的更新
      const serverDoc = new Y.Doc({ guid: noteId });
      const serverYTitle = serverDoc.getText('title');
      const serverYContent = serverDoc.getText('content');
      const serverYIsEncrypted = serverDoc.getMap<boolean>('isEncrypted');
      const serverYUpdatedAt = serverDoc.getMap<number>('updatedAt');

      serverYTitle.insert(0, serverNote.title);
      serverYContent.insert(0, serverNote.content);
      serverYIsEncrypted.set('value', serverNote.is_encrypted === 1);
      serverYUpdatedAt.set('timestamp', new Date(serverNote.updated_at).getTime());

      const serverUpdate = Y.encodeStateAsUpdate(serverDoc);

      // 应用服务器更新到本地文档（自动合并）
      Y.applyUpdate(doc, serverUpdate);

      // 确定合并后的删除状态：如果任一方已删除，则保持删除状态
      const mergedIsDeleted = localNote.is_deleted === 1 || serverNote.is_deleted === 1 ? 1 : 0;

      // 确定合并后的时间戳：使用较新的时间戳
      const localTime = new Date(localNote.updated_at).getTime();
      const serverTime = new Date(serverNote.updated_at).getTime();
      const mergedUpdatedAt = localTime > serverTime ? localNote.updated_at : serverNote.updated_at;

      // 提取合并后的结果
      const mergedNote: Note = {
        id: noteId,
        title: yTitle.toString(),
        content: yContent.toString(),
        is_encrypted: (yIsEncrypted.get('value') ? 1 : 0) as 0 | 1,
        sync_status: 0,
        is_deleted: mergedIsDeleted,
        created_at: localNote.created_at,
        updated_at: mergedUpdatedAt,
      };

      // 清理文档
      doc.destroy();
      serverDoc.destroy();

      console.log(`笔记 ${noteId} 的 CRDT 合并完成`);
      return mergedNote;
    } catch (error) {
      throw new YjsNoteServiceError(
        `合并笔记失败: ${(error as Error).message}`,
        'MERGE_FAILED',
        error as Error,
      );
    }
  }

  /**
   * 批量合并笔记
   *
   * @param conflicts 冲突的笔记对数组（笔记内容应为明文）
   * @returns 合并后的笔记数组（明文内容）
   */
  static batchMergeNotes(
    conflicts: {
      id: string;
      local: Note;
      server: Note;
    }[],
  ): Note[] {
    const mergedNotes: Note[] = [];
    const errors: { id: string; error: Error }[] = [];

    for (const conflict of conflicts) {
      try {
        const merged = this.mergeNotes(conflict.id, conflict.local, conflict.server);
        mergedNotes.push(merged);
      } catch (error) {
        console.error(`合并笔记 ${conflict.id} 失败:`, error);
        errors.push({ id: conflict.id, error: error as Error });
        // 合并失败时使用本地版本
        mergedNotes.push(conflict.local);
      }
    }

    if (errors.length > 0) {
      console.warn(`${errors.length} 条笔记合并失败，使用本地版本`);
    }

    return mergedNotes;
  }

  /**
   * 检测冲突
   *
   * @param localNote 本地笔记
   * @param serverNote 服务器笔记
   * @returns 是否冲突
   */
  static hasConflict(localNote: Note, serverNote: Note): boolean {
    // 如果时间戳相同，认为没有冲突
    if (localNote.updated_at === serverNote.updated_at) {
      return false;
    }

    // 如果内容相同，认为没有冲突
    if (localNote.title === serverNote.title && localNote.content === serverNote.content) {
      return false;
    }

    // 本地较新
    const localTime = new Date(localNote.updated_at).getTime();
    const serverTime = new Date(serverNote.updated_at).getTime();

    // 如果本地和服务器都有修改（时间差在5秒内认为是并发修改）
    const timeDiff = Math.abs(localTime - serverTime);
    return timeDiff < 5000;
  }

  /**
   * 将 Uint8Array 转换为 Base64 字符串（用于传输）
   *
   * @param update Uint8Array
   * @returns Base64 字符串
   */
  static updateToBase64(update: Uint8Array): string {
    let binary = '';
    const bytes = new Uint8Array(update);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  /**
   * 将 Base64 字符串转换为 Uint8Array
   *
   * @param base64 Base64 字符串
   * @returns Uint8Array
   */
  static base64ToUpdate(base64: string): Uint8Array {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  /**
   * 清理指定笔记的 CRDT 文档
   *
   * @param noteId 笔记 ID
   */
  static cleanupDocument(noteId: string): void {
    const doc = this.docs.get(noteId);
    if (doc) {
      doc.destroy();
      this.docs.delete(noteId);
    }
  }

  /**
   * 清理所有 CRDT 文档
   */
  static cleanupAll(): void {
    this.docs.forEach((doc) => doc.destroy());
    this.docs.clear();
  }
}

export default YjsNoteService;
