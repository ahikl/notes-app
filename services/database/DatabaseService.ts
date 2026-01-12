import * as SQLite from 'expo-sqlite';
import { CreateNoteRequest, Note, UpdateNoteRequest } from '@/types/notes/NoteTypes';

const DATABASE_NAME = 'notes.db';
const NOTES_TABLE = 'notes';

// --- 状态管理 ---
let db: SQLite.SQLiteDatabase | null = null;
let initializing = false;
let isProcessing = false;
let isInsideQueueFlow = false; // 重入锁：防止嵌套调用死锁
const operationQueue: (() => Promise<any>)[] = [];

/**
 * 1. 健壮的数据库实例获取函数
 * 解决高频操作下的空指针和初始化竞争
 */
const getDb = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;

  if (initializing) {
    // 轮询等待初始化完成，带超时保护
    let attempts = 0;
    while (initializing && !db && attempts < 100) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      attempts++;
    }
    if (db) return db;
  }

  initializing = true;
  try {
    const instance = await SQLite.openDatabaseAsync(DATABASE_NAME);
    // 确保表结构存在
    await instance.execAsync(`
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
    db = instance;
    console.log('数据库连接成功');
    return db;
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  } finally {
    initializing = false;
  }
};

/**
 * 2. 核心调度器：支持重入的任务队列
 * 解决高频调用带来的并发冲突和死锁
 */
const executeDbOperation = async <T>(
  operation: (dbInstance: SQLite.SQLiteDatabase) => Promise<T>,
): Promise<T> => {
  // 如果已经在队列执行流中（嵌套调用），直接执行，不再入队排队
  if (isInsideQueueFlow) {
    const dbInstance = await getDb();
    return await operation(dbInstance);
  }

  return new Promise<T>((resolve, reject) => {
    operationQueue.push(async () => {
      isInsideQueueFlow = true;
      try {
        const dbInstance = await getDb(); // 每次操作前动态获取，解决空指针
        const result = await operation(dbInstance);
        resolve(result);
      } catch (error) {
        // 针对特定 SQLite 错误重置实例
        if (
          error instanceof Error &&
          (error.message.includes('null') || error.message.includes('prepareAsync'))
        ) {
          console.warn('检测到数据库连接问题，重置数据库实例');
          try {
            if (db) {
              await db.closeAsync();
            }
          } catch (closeError) {
            console.error('关闭数据库连接失败:', closeError);
          }
          db = null;
        }
        reject(error);
      } finally {
        isInsideQueueFlow = false;
      }
    });
    processQueue();
  });
};

const processQueue = async () => {
  if (isProcessing || operationQueue.length === 0) return;
  isProcessing = true;
  try {
    while (operationQueue.length > 0) {
      const task = operationQueue.shift();
      if (task) await task();
    }
  } finally {
    isProcessing = false;
    if (operationQueue.length > 0) setImmediate(processQueue);
  }
};

// --- 内部辅助函数（无锁版本，直接操作 dbInstance） ---

const internalUpdateSingleNote = async (
  dbInstance: SQLite.SQLiteDatabase,
  id: string,
  data: UpdateNoteRequest,
) => {
  const current = await dbInstance.getFirstAsync<Note>(
    `SELECT * FROM ${NOTES_TABLE} WHERE id = ?`,
    [id],
  );
  if (!current) return false;

  const now = new Date().toISOString();
  await dbInstance.runAsync(
    `UPDATE ${NOTES_TABLE} SET title = ?, content = ?, is_encrypted = ?, sync_status = 1, updated_at = ? WHERE id = ?`,
    [
      data.title ?? current.title,
      data.content ?? current.content,
      data.is_encrypted ?? current.is_encrypted,
      data.updated_at || now,
      id,
    ],
  );
  return true;
};

/**
 * 初始化数据库连接
 */
export const initDatabase = async (): Promise<void> => {
  try {
    await getDb();
    console.log('数据库连接成功');
  } catch (error) {
    console.error('数据库初始化失败:', error);
    throw error;
  }
};

/**
 * 3. 批量操作优化：真正实现原子性，防止"删了没建"
 */
export const batchOperationNotes = async (
  createData: CreateNoteRequest[] = [],
  updateData: { id: string; data: UpdateNoteRequest }[] = [],
  deleteIds: string[] = [],
) => {
  return executeDbOperation(async (dbInstance) => {
    let createdIds: string[] = [];
    let updatedCount = 0;

    await dbInstance.withTransactionAsync(async () => {
      // 第一步：批量删除（软删除）
      if (deleteIds.length > 0) {
        const now = new Date().toISOString();
        const placeholders = deleteIds.map(() => '?').join(',');
        await dbInstance.runAsync(
          `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 1, updated_at = ? WHERE id IN (${placeholders})`,
          [now, ...deleteIds],
        );
      }

      // 第二步：处理更新
      for (const item of updateData) {
        if (await internalUpdateSingleNote(dbInstance, item.id, item.data)) updatedCount++;
      }

      // 第三步：批量创建
      if (createData.length > 0) {
        const now = new Date().toISOString();
        for (const note of createData) {
          const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
          createdIds.push(id);
          await dbInstance.runAsync(
            `INSERT INTO ${NOTES_TABLE} (id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at) 
             VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
            [id, note.title, note.content, note.is_encrypted ?? 0, note.created_at || now, now],
          );
        }
      }
    });

    console.log(
      `批量操作完成: 创建 ${createdIds.length}, 更新 ${updatedCount}, 删除 ${deleteIds.length}`,
    );
    return { created: createdIds, updated: updatedCount, deleted: deleteIds.length };
  });
};

/**
 * 4. 同步逻辑优化：内存 Map 对比
 * 解决高频查询带来的性能瓶颈和死锁
 */
export const syncWithServer = async (serverNotes: Note[]) => {
  return executeDbOperation(async (dbInstance) => {
    // 1. 一次性获取本地所有索引，避免在循环中重复查库
    const localNotes = await dbInstance.getAllAsync<Note>(`SELECT * FROM ${NOTES_TABLE}`);
    const localMap = new Map(localNotes.map((n) => [n.id, n]));

    await dbInstance.withTransactionAsync(async () => {
      for (const sNote of serverNotes) {
        const lNote = localMap.get(sNote.id);

        if (sNote.is_deleted === 1) {
          if (lNote) {
            await dbInstance.runAsync(
              `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 0, updated_at = ? WHERE id = ?`,
              [sNote.updated_at, sNote.id],
            );
            console.log('从服务器同步删除笔记:', sNote.id);
          }
        } else if (!lNote) {
          // 本地没有，直接插入
          await dbInstance.runAsync(
            `INSERT INTO ${NOTES_TABLE} (id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, 0, 0, ?, ?)`,
            [
              sNote.id,
              sNote.title,
              sNote.content,
              sNote.is_encrypted ?? 0,
              sNote.created_at,
              sNote.updated_at,
            ],
          );
          console.log('从服务器插入新笔记:', sNote.id);
        } else {
          // 本地有，比对时间戳
          if (new Date(sNote.updated_at).getTime() > new Date(lNote.updated_at).getTime()) {
            await dbInstance.runAsync(
              `UPDATE ${NOTES_TABLE} SET title=?, content=?, is_encrypted=?, sync_status=0, updated_at=? WHERE id=?`,
              [sNote.title, sNote.content, sNote.is_encrypted ?? 0, sNote.updated_at, sNote.id],
            );
            console.log('从服务器更新笔记:', sNote.id);
          } else {
            console.log('本地笔记较新，跳过同步:', sNote.id);
          }
        }
      }
    });

    return await dbInstance.getAllAsync<Note>(`SELECT * FROM ${NOTES_TABLE} WHERE sync_status = 1`);
  });
};

// --- 其他 API (完整实现) ---

export const getAllNotes = () =>
  executeDbOperation((db) =>
    db.getAllAsync<Note>(
      `SELECT * FROM ${NOTES_TABLE} WHERE is_deleted = 0 ORDER BY updated_at DESC`,
    ),
  );

export const createNote = (data: CreateNoteRequest) =>
  executeDbOperation(async (db) => {
    const id = Date.now().toString();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO ${NOTES_TABLE} (id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)`,
      [id, data.title, data.content, data.is_encrypted ?? 0, 1, 0, data.created_at || now, now],
    );
    console.log('笔记创建成功:', id);
    return id;
  });

export const getNoteById = async (id: string): Promise<Note | null> => {
  return executeDbOperation(async (db) => {
    const result = await db.getAllAsync<Note>(
      `SELECT * FROM ${NOTES_TABLE} WHERE id = ? AND is_deleted = 0`,
      [id],
    );
    return result.length > 0 ? result[0] : null;
  });
};

export const updateNote = async (id: string, noteData: UpdateNoteRequest): Promise<void> => {
  return executeDbOperation(async (db) => {
    const success = await internalUpdateSingleNote(db, id, noteData);
    if (!success) {
      throw new Error('笔记不存在');
    }
    console.log('笔记更新成功:', id);
  });
};

export const deleteNote = async (id: string): Promise<void> => {
  return executeDbOperation(async (db) => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 1, updated_at = ? WHERE id = ?`,
      [now, id],
    );
    console.log('笔记软删除成功:', id);
  });
};

export const batchDeleteNotes = async (ids: string[]): Promise<void> => {
  return executeDbOperation(async (db) => {
    if (!ids || ids.length === 0) {
      return;
    }

    // 验证所有ID都不为空
    for (let i = 0; i < ids.length; i++) {
      if (!ids[i] || typeof ids[i] !== 'string') {
        console.error(`无效的ID在位置 ${i}:`, ids[i]);
        throw new Error(`无效的ID: ${ids[i]}`);
      }
    }

    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 1, updated_at = ? WHERE id IN (${placeholders})`,
      [now, ...ids],
    );

    console.log(`批量删除笔记成功: ${ids.length} 条`);
  });
};

export const batchUpdateNotes = async (
  notesData: { id: string; data: UpdateNoteRequest }[],
): Promise<void> => {
  return executeDbOperation(async (db) => {
    if (!notesData || notesData.length === 0) {
      return;
    }

    await db.withTransactionAsync(async () => {
      for (const noteUpdate of notesData) {
        const { id, data } = noteUpdate;
        await internalUpdateSingleNote(db, id, data);
      }
    });

    console.log(`批量更新笔记成功: ${notesData.length} 条`);
  });
};

export const batchCreateNotes = async (notesData: CreateNoteRequest[]): Promise<string[]> => {
  return executeDbOperation(async (db) => {
    if (!notesData || notesData.length === 0) {
      return [];
    }

    const ids: string[] = [];
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      for (const note of notesData) {
        const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
        ids.push(id);

        await db.runAsync(
          `INSERT INTO ${NOTES_TABLE} (id, title, content, is_encrypted, sync_status, is_deleted, created_at, updated_at) 
           VALUES (?, ?, ?, ?, 1, 0, ?, ?)`,
          [id, note.title, note.content, note.is_encrypted ?? 0, note.created_at || now, now],
        );
      }
    });

    console.log(`批量创建笔记成功: ${notesData.length} 条`);
    return ids;
  });
};

export const permanentlyDeleteNote = async (id: string): Promise<void> => {
  return executeDbOperation(async (db) => {
    await db.runAsync(`DELETE FROM ${NOTES_TABLE} WHERE id = ?`, [id]);
    console.log('笔记物理删除成功:', id);
  });
};

export const getNotesToSync = async (): Promise<Note[]> => {
  return executeDbOperation((db) =>
    db.getAllAsync<Note>(
      `SELECT * FROM ${NOTES_TABLE} WHERE sync_status = 1 ORDER BY updated_at DESC`,
    ),
  );
};

export const getDeletedNotes = async (): Promise<Note[]> => {
  return executeDbOperation((db) =>
    db.getAllAsync<Note>(
      `SELECT * FROM ${NOTES_TABLE} WHERE is_deleted = 1 ORDER BY updated_at DESC`,
    ),
  );
};

export const getAllNotesIncludingDeleted = async (): Promise<Note[]> => {
  return executeDbOperation((db) =>
    db.getAllAsync<Note>(`SELECT * FROM ${NOTES_TABLE} ORDER BY updated_at DESC`),
  );
};

export const searchNotes = async (searchTerm: string): Promise<Note[]> => {
  return executeDbOperation((db) =>
    db.getAllAsync<Note>(
      `SELECT * FROM ${NOTES_TABLE} 
       WHERE (title LIKE ? OR content LIKE ?) AND is_deleted = 0
       ORDER BY updated_at DESC`,
      [`%${searchTerm}%`, `%${searchTerm}%`],
    ),
  );
};

export const getNotesCount = async (): Promise<number> => {
  return executeDbOperation(async (db) => {
    const result = await db.getFirstAsync<{ count: number }>(
      `SELECT COUNT(*) as count FROM ${NOTES_TABLE} WHERE is_deleted = 0`,
    );
    return result?.count || 0;
  });
};

export const updateSyncStatus = async (id: string, syncStatus: number): Promise<void> => {
  return executeDbOperation(async (db) => {
    const now = new Date().toISOString();
    await db.runAsync(`UPDATE ${NOTES_TABLE} SET sync_status = ?, updated_at = ? WHERE id = ?`, [
      syncStatus,
      now,
      id,
    ]);
    console.log('笔记同步状态更新成功:', id, 'sync_status:', syncStatus);
  });
};

export const purgeDeletedNotes = async (): Promise<void> => {
  return executeDbOperation(async (db) => {
    await db.runAsync(`DELETE FROM ${NOTES_TABLE} WHERE is_deleted = 1`);
    console.log('已清理标记删除的笔记');
  });
};

export const exportAllNotes = async (): Promise<Note[]> => {
  return executeDbOperation((db) =>
    db.getAllAsync<Note>(`SELECT * FROM ${NOTES_TABLE} WHERE is_deleted = 0`),
  );
};

export const clearAllNotes = async (): Promise<void> => {
  return executeDbOperation(async (db) => {
    await db.runAsync(`DELETE FROM ${NOTES_TABLE}`);
    console.log('所有笔记已清空');
  });
};

export const getNoteByIdIncludingDeleted = async (id: string): Promise<Note | null> => {
  return executeDbOperation(async (db) => {
    const result = await db.getAllAsync<Note>(`SELECT * FROM ${NOTES_TABLE} WHERE id = ?`, [id]);
    return result.length > 0 ? result[0] : null;
  });
};

export const closeDatabase = async (): Promise<void> => {
  try {
    if (db) {
      if (db.closeAsync) {
        await db.closeAsync();
      }
      db = null;
      console.log('数据库连接已关闭');
    }
  } catch (error) {
    console.error('关闭数据库失败:', error);
    db = null;
  }
};

export default {
  initDatabase,
  batchOperationNotes,
  syncWithServer,
  getAllNotes,
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
  batchDeleteNotes,
  batchUpdateNotes,
  batchCreateNotes,
  permanentlyDeleteNote,
  getNotesToSync,
  getDeletedNotes,
  getAllNotesIncludingDeleted,
  searchNotes,
  getNotesCount,
  updateSyncStatus,
  purgeDeletedNotes,
  exportAllNotes,
  clearAllNotes,
  getNoteByIdIncludingDeleted,
  closeDatabase,
};
