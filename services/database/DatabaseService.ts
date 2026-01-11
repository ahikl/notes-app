import * as SQLite from 'expo-sqlite';
import { CreateNoteRequest, Note, UpdateNoteRequest } from '@/types/notes/NoteTypes';

// 数据库名称
const DATABASE_NAME = 'notes.db';

// 表名
const NOTES_TABLE = 'notes';

// 数据库版本
const DATABASE_VERSION = 2;

// 数据库实例
let db: SQLite.SQLiteDatabase | null = null;

/**
 * 初始化数据库连接
 */
export const initDatabase = async (): Promise<void> => {
  try {
    if (!db) {
      db = await SQLite.openDatabaseAsync(DATABASE_NAME);
      console.log('数据库连接成功');
      await createTables();
    }
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

/**
 * 创建数据表
 */
const createTables = async (): Promise<void> => {
  try {
    if (!db) throw new Error('数据库未初始化');

    // 创建笔记表 - 使用SQL语句定义笔记数据结构
    // 表包含以下字段：
    // - id: 主键，文本类型，不能为空，用于唯一标识每条笔记
    // - title: 笔记标题，文本类型，不能为空
    // - content: 笔记内容，文本类型，不能为空
    // - is_encrypted: 加密状态标志，整数类型，默认值为0（未加密）
    // - sync_status: 同步状态标志，整数类型，0表示已同步，1表示本地已修改待同步
    // - is_deleted: 删除状态标志，整数类型，0表示正常，1表示标记删除
    // - created_at: 创建时间，文本类型，不能为空，存储UTC ISO格式的时间字符串
    // - updated_at: 更新时间，文本类型，不能为空，存储UTC ISO格式的时间字符串
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS ${NOTES_TABLE} (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        is_encrypted INTEGER DEFAULT 0,
        sync_status INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    console.log('数据表创建成功');
  } catch (error) {
    console.error('创建数据表失败:', error);
    throw error;
  }
};

/**
 * 获取所有笔记
 */
export const getAllNotes = async (): Promise<Note[]> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const result = await db.getAllAsync<Note>(
      `SELECT id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at FROM ${NOTES_TABLE} WHERE is_deleted = 0 ORDER BY updated_at DESC`,
    );

    return result as Note[];
  } catch (error) {
    console.error('获取笔记列表失败:', error);
    throw error;
  }
};

/**
 * 根据ID获取笔记
 */
export const getNoteById = async (id: string): Promise<Note | null> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const result = await db.getAllAsync<Note>(
      `SELECT id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at FROM ${NOTES_TABLE} WHERE id = ? AND is_deleted = 0`,
      [id],
    );

    return result.length > 0 ? (result[0] as Note) : null;
  } catch (error) {
    console.error('获取笔记失败:', error);
    throw error;
  }
};

/**
 * 搜索笔记
 */
export const searchNotes = async (searchTerm: string): Promise<Note[]> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const result = await db.getAllAsync<Note>(
      `SELECT id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at 
       FROM ${NOTES_TABLE} 
       WHERE (title LIKE ? OR content LIKE ?) AND is_deleted = 0
       ORDER BY updated_at DESC`,
      [`%${searchTerm}%`, `%${searchTerm}%`],
    );

    return result as Note[];
  } catch (error) {
    console.error('搜索笔记失败:', error);
    throw error;
  }
};

/**
 * 创建笔记
 */
export const createNote = async (noteData: CreateNoteRequest): Promise<string> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const id = Date.now().toString(); // 简单的ID生成策略
    const createdAt = noteData.created_at || new Date().toISOString();
    const updatedAt = noteData.updated_at || new Date().toISOString();

    await (db.runAsync as any)(
      `INSERT INTO ${NOTES_TABLE} (id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        noteData.title,
        noteData.content,
        noteData.is_encrypted || 0,
        1,
        0,
        createdAt,
        updatedAt,
      ], // 新建笔记设为待同步状态
    );

    console.log('笔记创建成功:', id);
    return id;
  } catch (error) {
    console.error('创建笔记失败:', error);
    throw error;
  }
};

/**
 * 更新笔记
 */
export const updateNote = async (id: string, noteData: UpdateNoteRequest): Promise<void> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const updatedAt = noteData.updated_at || new Date().toISOString();

    await (db.runAsync as any)(
      `UPDATE ${NOTES_TABLE} SET title = ?, content = ?, is_encrypted = ?, sync_status = 1, updated_at = ? WHERE id = ?`,
      [noteData.title, noteData.content, noteData.is_encrypted, 1, updatedAt, id], // 强制设置 sync_status 为 1
    );

    console.log('笔记更新成功:', id);
  } catch (error) {
    console.error('更新笔记失败:', error);
    throw error;
  }
};

/**
 * 删除笔记（软删除）
 */
export const deleteNote = async (id: string): Promise<void> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const updatedAt = new Date().toISOString();
    await (db.runAsync as any)(
      `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 1, updated_at = ? WHERE id = ?`,
      [updatedAt, id],
    );

    console.log('笔记软删除成功:', id);
  } catch (error) {
    console.error('删除笔记失败:', error);
    throw error;
  }
};

/**
 * 批量导出所有笔记
 */
export const exportAllNotes = async (): Promise<Note[]> => {
  try {
    return await getAllNotes();
  } catch (error) {
    console.error('导出笔记失败:', error);
    throw error;
  }
};

/**
 * 清空所有笔记（谨慎使用）
 */
export const clearAllNotes = async (): Promise<void> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    await (db.runAsync as any)(`DELETE FROM ${NOTES_TABLE}`);

    console.log('所有笔记已清空');
  } catch (error) {
    console.error('清空笔记失败:', error);
    throw error;
  }
};

/**
 * 获取笔记总数
 */
export const getNotesCount = async (): Promise<number> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${NOTES_TABLE} WHERE is_deleted = 0`,
    );

    return result?.count || 0;
  } catch (error) {
    console.error('获取笔记数量失败:', error);
    throw error;
  }
};

/**
 * 获取需要同步的笔记（本地已修改但未同步到服务器的笔记）
 */
export const getNotesToSync = async (): Promise<Note[]> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    const result = await db.getAllAsync<Note>(
      `SELECT id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at 
       FROM ${NOTES_TABLE} 
       WHERE sync_status = 1
       ORDER BY updated_at DESC`,
    );

    return result as Note[];
  } catch (error) {
    console.error('获取待同步笔记失败:', error);
    throw error;
  }
};

/**
 * 物理删除已同步的删除标记笔记
 */
export const purgeDeletedNotes = async (): Promise<void> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    await (db.runAsync as any)(`DELETE FROM ${NOTES_TABLE} WHERE is_deleted = 1`);

    console.log('已清理标记删除的笔记');
  } catch (error) {
    console.error('清理删除标记笔记失败:', error);
    throw error;
  }
};

/**
 * 同步服务器数据到本地
 */
export const syncWithServer = async (serverNotes: Note[]): Promise<Note[]> => {
  try {
    if (!db) await initDatabase();
    if (!db) throw new Error('数据库未初始化');

    // 遍历服务器笔记数据
    for (const serverNote of serverNotes) {
      // 检查本地是否已存在该笔记
      const localNote = await getNoteById(serverNote.id);

      if (!localNote) {
        // 如果本地不存在该笔记，直接插入
        await (db.runAsync as any)(
          `INSERT INTO ${NOTES_TABLE} (id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            serverNote.id,
            serverNote.title,
            serverNote.content,
            serverNote.is_encrypted || 0,
            0,
            0,
            serverNote.created_at,
            serverNote.updated_at,
          ],
        );
        console.log('从服务器插入新笔记:', serverNote.id);
      } else {
        // 如果本地存在，比较更新时间
        const serverUpdatedAt = new Date(serverNote.updated_at).getTime();
        const localUpdatedAt = new Date(localNote.updated_at).getTime();

        if (serverUpdatedAt > localUpdatedAt) {
          // 服务器数据较新，使用服务器数据覆盖本地
          await (db.runAsync as any)(
            `UPDATE ${NOTES_TABLE} SET title = ?, content = ?, is_encrypted = ?, sync_status = 0, is_deleted = ?, updated_at = ? WHERE id = ?`,
            [
              serverNote.title,
              serverNote.content,
              serverNote.is_encrypted,
              serverNote.is_deleted,
              serverNote.updated_at,
              serverNote.id,
            ],
          );
          console.log('从服务器更新笔记:', serverNote.id);
        } else if (localUpdatedAt > serverUpdatedAt && localNote.sync_status === 1) {
          // 本地数据较新且待同步，不处理，等待后续上传
          console.log('本地笔记较新，跳过同步:', serverNote.id);
        }
      }
    }

    // 获取本地特有的待同步数据
    const localNotesToSync = await getNotesToSync();

    // 清理已同步的删除标记笔记
    await purgeDeletedNotes();

    return localNotesToSync;
  } catch (error) {
    console.error('同步服务器数据失败:', error);
    throw error;
  }
};

/**
 * 关闭数据库连接
 */
export const closeDatabase = async (): Promise<void> => {
  try {
    if (db) {
      await db.closeAsync();
      db = null;
      console.log('数据库连接已关闭');
    }
  } catch (error) {
    console.error('关闭数据库失败:', error);
    throw error;
  }
};

export default {
  initDatabase,
  getAllNotes,
  getNoteById,
  searchNotes,
  createNote,
  updateNote,
  deleteNote,
  exportAllNotes,
  clearAllNotes,
  getNotesCount,
  getNotesToSync,
  purgeDeletedNotes,
  syncWithServer,
  closeDatabase,
};
