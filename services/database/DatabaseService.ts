import { CreateNoteRequest, Note, UpdateNoteRequest } from '@/types/notes/NoteTypes';
import type { SQLiteBindValue } from 'expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { AppError } from '@/utils/errors/AppError';
import { error, info, logError } from '@/utils/Logger';
import { ErrorCode } from '@/utils/errors/ErrorConstants';

const DATABASE_NAME = 'notes.db';
const NOTES_TABLE = 'notes';
const CURRENT_DB_VERSION = 3; // 数据库版本号，用于迁移管理（v3: 添加 deleted_at 字段）

// --- 状态管理 ---
let db: SQLite.SQLiteDatabase | null = null;
let initializing = false;
let isProcessing = false;
let isInsideQueueFlow = false; // 重入锁：防止嵌套调用死锁
const operationQueue: (() => Promise<any>)[] = [];

/**
 * 数据库迁移：添加 iv、auth_tag 和 deleted_at 字段
 */
const migrateDatabase = async (instance: SQLite.SQLiteDatabase): Promise<void> => {
  try {
    // 检查是否需要添加字段
    const tableInfo = await instance.getAllAsync<{ name: string }>(
      `PRAGMA table_info(${NOTES_TABLE})`,
    );

    const columns = tableInfo.map((col) => col.name);

    // 添加 iv 字段（如果不存在）
    if (!columns.includes('iv')) {
      await instance.execAsync(`ALTER TABLE ${NOTES_TABLE} ADD COLUMN iv TEXT;`);
      info('数据库迁移：添加 iv 字段');
    }

    // 添加 auth_tag 字段（如果不存在）
    if (!columns.includes('auth_tag')) {
      await instance.execAsync(`ALTER TABLE ${NOTES_TABLE} ADD COLUMN auth_tag TEXT;`);
      info('数据库迁移：添加 auth_tag 字段');
    }

    // 添加 deleted_at 字段（如果不存在）- 用于软删除保留期管理
    if (!columns.includes('deleted_at')) {
      await instance.execAsync(`ALTER TABLE ${NOTES_TABLE} ADD COLUMN deleted_at TEXT;`);
      info('数据库迁移：添加 deleted_at 字段');
    }

    console.log(`数据库迁移完成，当前版本: ${CURRENT_DB_VERSION}`);
  } catch (err) {
    error('数据库迁移失败', err);
    throw err;
  }
};

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
    // 确保表结构存在（包含 iv、auth_tag 和 deleted_at 字段）
    await instance.execAsync(`
      CREATE TABLE IF NOT EXISTS ${NOTES_TABLE} (
        id TEXT PRIMARY KEY NOT NULL,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        iv TEXT,                    -- 初始化向量（Base64编码）
        auth_tag TEXT,              -- 认证标签（Base64编码，GCM模式使用）
        is_encrypted INTEGER DEFAULT 0,
        sync_status INTEGER DEFAULT 0,
        is_deleted INTEGER DEFAULT 0,
        deleted_at TEXT,            -- 软删除时间戳（用于保留期管理）
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // 执行数据库迁移（添加新字段到现有表）
    await migrateDatabase(instance);

    db = instance;
    info('数据库连接成功');
    return db;
  } catch (err) {
    error('数据库初始化失败', err);
    throw err;
  } finally {
    initializing = false;
  }
};

/**
 * 2. 核心调度器：支持重入的任务队列
 * 解决高频调用带来的并发冲突和死锁
 */
const executeDbOperation = async <T>(
  operation: (_dbInstance: SQLite.SQLiteDatabase) => Promise<T>,
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
      } catch (err) {
        // 针对特定 SQLite 错误重置实例
        if (
          err instanceof Error &&
          (err.message.includes('null') || err.message.includes('prepareAsync'))
        ) {
          console.warn('检测到数据库连接问题，重置数据库实例');
          try {
            if (db) {
              await db.closeAsync();
            }
          } catch (closeError) {
            error('关闭数据库连接失败', closeError);
          }
          db = null;
        }
        reject(err);
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
    `UPDATE ${NOTES_TABLE} SET title = ?, content = ?, iv = ?, auth_tag = ?, is_encrypted = ?, sync_status = 1, updated_at = ? WHERE id = ?`,
    [
      data.title ?? current.title,
      data.content ?? current.content,
      data.iv ?? current.iv ?? null,
      data.auth_tag ?? current.auth_tag ?? null,
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
    info('数据库连接成功');
  } catch (err) {
    error('数据库初始化失败', err);
    throw err;
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
          `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 1, deleted_at = ?, updated_at = ? WHERE id IN (${placeholders})`,
          [now, now, ...deleteIds],
        );
      }

      // 第二步：处理更新
      for (const item of updateData) {
        if (await internalUpdateSingleNote(dbInstance, item.id, item.data)) updatedCount++;
      }

      // 第三步：批量创建 - 使用批量 SQL 优化
      if (createData.length > 0) {
        const now = new Date().toISOString();
        const insertValues: SQLiteBindValue[] = [];
        const insertPlaceholders: string[] = [];

        for (const note of createData) {
          const id = Date.now().toString() + Math.random().toString(36).substring(2, 7);
          createdIds.push(id);
          const { iv, auth_tag } = note;

          // 收集值和占位符
          insertValues.push(
            id,
            note.title,
            note.content,
            iv ?? null,
            auth_tag ?? null,
            note.is_encrypted ?? 0,
            note.created_at || now,
            now,
          );
          insertPlaceholders.push('(?, ?, ?, ?, ?, ?, ?, 1, 0, ?, ?)');
        }

        // 使用批量 INSERT 语句
        const placeholders = insertPlaceholders.join(',');
        const sql = `INSERT INTO ${NOTES_TABLE} (id, title, content, iv, auth_tag, is_encrypted, sync_status, is_deleted, created_at, updated_at) VALUES ${placeholders}`;
        await dbInstance.runAsync(sql, insertValues);
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
 * 支持双向删除状态同步和缺失笔记拉取
 *
 * 时间戳比较规则：
 * - 服务端时间 > 本地时间：使用服务端数据（包括删除状态）
 * - 服务端时间 = 本地时间：同步完成，更新 sync_status
 * - 服务端时间 < 本地时间：保持本地数据
 */
export const syncWithServer = async (serverNotes: Note[]) => {
  info(`[DatabaseService] syncWithServer 开始，服务端笔记数量: ${serverNotes.length}`);
  console.log(
    `[DatabaseService] 服务端笔记ID列表:`,
    serverNotes.map((n) => n.id),
  );

  return executeDbOperation(async (dbInstance) => {
    // 1. 一次性获取本地所有索引，避免在循环中重复查库
    const localNotes = await dbInstance.getAllAsync<Note>(`SELECT * FROM ${NOTES_TABLE}`);
    const localMap = new Map(localNotes.map((n) => [n.id, n]));
    const serverMap = new Map(serverNotes.map((n) => [n.id, n]));

    console.log(`[DatabaseService] 本地笔记数量: ${localNotes.length}`);
    console.log(
      `[DatabaseService] 本地笔记ID列表:`,
      localNotes.map((n) => n.id),
    );

    await dbInstance.withTransactionAsync(async () => {
      // 第一阶段：处理服务器返回的笔记（服务端 -> 客户端同步）
      for (const sNote of serverNotes) {
        const lNote = localMap.get(sNote.id);

        if (sNote.is_deleted === 1) {
          // 服务端笔记已删除，根据时间戳决定是否同步删除状态
          if (lNote) {
            const serverTime = new Date(sNote.updated_at).getTime();
            const localTime = new Date(lNote.updated_at).getTime();

            console.log(`[数据库] 删除状态时间戳对比 ${sNote.id}:`, {
              serverTime: sNote.updated_at,
              localTime: lNote.updated_at,
              serverTimestamp: serverTime,
              localTimestamp: localTime,
              diff: serverTime - localTime,
              localIsDeleted: lNote.is_deleted,
              result:
                serverTime > localTime
                  ? '服务端较新，同步删除'
                  : serverTime < localTime
                    ? '本地较新，保持本地'
                    : '时间相同，同步删除',
            });

            // 只有服务端时间戳 >= 本地时间戳时才同步删除状态
            if (serverTime >= localTime) {
              if (lNote.is_deleted === 0) {
                // 本地未删除，同步删除状态
                await dbInstance.runAsync(
                  `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 0, updated_at = ? WHERE id = ?`,
                  [sNote.updated_at, sNote.id],
                );
                console.log('从服务器同步删除状态到本地:', sNote.id);
              } else {
                // 本地已删除，只需更新同步状态
                await dbInstance.runAsync(
                  `UPDATE ${NOTES_TABLE} SET sync_status = 0, updated_at = ? WHERE id = ?`,
                  [sNote.updated_at, sNote.id],
                );
                console.log('服务端确认本地删除状态:', sNote.id);
              }
            } else {
              // 本地较新，保持本地状态，并标记为需要上传
              console.log('本地笔记较新，保持本地未删除状态并标记上传:', sNote.id);
              await dbInstance.runAsync(`UPDATE ${NOTES_TABLE} SET sync_status = 1 WHERE id = ?`, [
                sNote.id,
              ]);
            }
          }
          // 如果本地没有这条笔记且服务端已删除，无需操作
        } else if (!lNote) {
          // 本地没有，服务端有且未删除，拉取到新笔记
          const { iv, auth_tag, is_encrypted } = sNote;
          console.log(`[数据库] 从服务器拉取新笔记 ${sNote.id}:`, {
            is_encrypted: sNote.is_encrypted,
            has_iv: !!iv,
            iv_value: iv ? iv.substring(0, 20) + '...' : 'null',
            has_auth_tag: !!auth_tag,
            auth_tag_value: auth_tag ? auth_tag.substring(0, 20) + '...' : 'null',
            is_deleted: sNote.is_deleted,
            content_length: sNote.content ? sNote.content.length : 0,
          });

          // 确保 iv 和 auth_tag 正确提取
          const ivValue = iv || null;
          const authTagValue = auth_tag || null;

          console.log(`[数据库] 准备插入新笔记 ${sNote.id}:`, {
            iv_final: ivValue ? ivValue.substring(0, 20) + '...' : 'null',
            auth_tag_final: authTagValue ? authTagValue.substring(0, 20) + '...' : 'null',
          });

          try {
            await dbInstance.runAsync(
              `INSERT INTO ${NOTES_TABLE} (id, title, content, iv, auth_tag, is_encrypted, sync_status, is_deleted, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
              [
                sNote.id,
                sNote.title,
                sNote.content,
                ivValue,
                authTagValue,
                sNote.is_encrypted ?? 0,
                sNote.created_at,
                sNote.updated_at,
              ],
            );
            console.log('[数据库] 从服务器拉取新笔记到本地成功:', sNote.id);
          } catch (insertError) {
            error(`[数据库] 插入新笔记 ${sNote.id} 失败`, insertError);
            throw insertError;
          }
        } else {
          // 本地有，服务端也有，比对时间戳进行合并
          const serverTime = new Date(sNote.updated_at).getTime();
          const localTime = new Date(lNote.updated_at).getTime();

          // 添加详细的时间戳对比日志
          console.log(`[数据库] 时间戳对比 ${sNote.id}:`, {
            serverTime: sNote.updated_at,
            localTime: lNote.updated_at,
            serverTimestamp: serverTime,
            localTimestamp: localTime,
            diff: serverTime - localTime,
            result:
              serverTime > localTime
                ? '服务端较新'
                : serverTime < localTime
                  ? '本地较新'
                  : '时间相同',
          });

          if (serverTime > localTime) {
            // 服务端版本较新，更新本地（使用服务端返回的 is_deleted 值）
            const { iv, auth_tag, is_encrypted } = sNote;
            console.log(`[数据库] 从服务器更新笔记 ${sNote.id}:`, {
              is_encrypted: sNote.is_encrypted,
              has_iv: !!sNote.iv,
              has_auth_tag: !!sNote.auth_tag,
              is_deleted: sNote.is_deleted,
            });
            // 修复：使用服务端返回的 is_deleted 值，而不是强制设置为 0
            await dbInstance.runAsync(
              `UPDATE ${NOTES_TABLE} SET title=?, content=?, iv=?, auth_tag=?, is_encrypted=?, sync_status=0, is_deleted=?, updated_at=? WHERE id=?`,
              [
                sNote.title,
                sNote.content,
                sNote.iv ?? null,
                sNote.auth_tag ?? null,
                sNote.is_encrypted ?? 0,
                sNote.is_deleted ?? 0, // 使用服务端返回的删除状态
                sNote.updated_at,
                sNote.id,
              ],
            );
            console.log('从服务器更新笔记到本地:', sNote.id);
          } else if (serverTime === localTime) {
            // 时间戳相同，表示已同步，更新同步状态
            if (lNote.sync_status === 1) {
              await dbInstance.runAsync(`UPDATE ${NOTES_TABLE} SET sync_status = 0 WHERE id = ?`, [
                sNote.id,
              ]);
              console.log('笔记同步状态更新为已同步:', sNote.id);
            } else {
              console.log('笔记时间戳相同且已同步，无需操作:', sNote.id);
            }
          } else {
            // 本地较新，保持本地版本，并标记为需要上传
            console.log('本地笔记较新，保持本地版本并标记上传:', sNote.id);
            await dbInstance.runAsync(`UPDATE ${NOTES_TABLE} SET sync_status = 1 WHERE id = ?`, [
              sNote.id,
            ]);
          }
        }
      }

      // 第二阶段：处理本地有但服务端没有的笔记
      // 这些笔记需要标记为待同步（sync_status = 1），让服务端知道需要创建或确认删除
      for (const lNote of localNotes) {
        if (!serverMap.has(lNote.id)) {
          // 本地有，服务端没有
          if (lNote.is_deleted === 1) {
            // 本地已删除，服务端没有这条笔记，视为已同步
            if (lNote.sync_status === 1) {
              await dbInstance.runAsync(`UPDATE ${NOTES_TABLE} SET sync_status = 0 WHERE id = ?`, [
                lNote.id,
              ]);
              console.log('本地删除笔记在服务端不存在，标记为已同步:', lNote.id);
            }
          } else {
            // 本地未删除，服务端没有，需要上传到服务端
            // 保持 sync_status = 1，让后续同步逻辑处理上传
            console.log('本地笔记在服务端不存在，需要上传:', lNote.id);
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
      `INSERT INTO ${NOTES_TABLE} (id, title, content, iv, auth_tag, is_encrypted, sync_status, is_deleted, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        id,
        data.title,
        data.content,
        data.iv ?? null,
        data.auth_tag ?? null,
        data.is_encrypted ?? 0,
        1,
        0,
        data.created_at || now,
        now,
      ],
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
      throw AppError.note('笔记不存在', ErrorCode.NOTE_NOT_FOUND);
    }
    console.log('笔记更新成功:', id);
  });
};

export const deleteNote = async (id: string): Promise<void> => {
  return executeDbOperation(async (db) => {
    const now = new Date().toISOString();
    await db.runAsync(
      `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 1, deleted_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, id],
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
        const error = AppError.note(`无效的ID在位置 ${i}: ${ids[i]}`, ErrorCode.VALIDATION_FAILED);
        logError(error, '验证ID失败');
        throw error;
      }
    }

    const now = new Date().toISOString();
    const placeholders = ids.map(() => '?').join(',');
    await db.runAsync(
      `UPDATE ${NOTES_TABLE} SET is_deleted = 1, sync_status = 1, deleted_at = ?, updated_at = ? WHERE id IN (${placeholders})`,
      [now, now, ...ids],
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
        const { iv, auth_tag, is_encrypted } = note;

        await db.runAsync(
          `INSERT INTO ${NOTES_TABLE} (id, title, content, iv, auth_tag, is_encrypted, sync_status, is_deleted, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, 1, 0, ?, ?)`,
          [
            id,
            note.title,
            note.content,
            iv ?? null,
            auth_tag ?? null,
            note.is_encrypted ?? 0,
            note.created_at || now,
            now,
          ],
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

/**
 * 获取超过保留期的已同步软删除笔记
 * @param retentionDays 保留天数，默认30天
 */
export const getExpiredDeletedNotes = async (retentionDays: number = 30): Promise<Note[]> => {
  return executeDbOperation(async (db) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffDateStr = cutoffDate.toISOString();

    return await db.getAllAsync<Note>(
      `SELECT *
       FROM ${NOTES_TABLE}
       WHERE is_deleted = 1
         AND sync_status = 0
         AND deleted_at IS NOT NULL
         AND deleted_at <= ?
       ORDER BY deleted_at ASC`,
      [cutoffDateStr],
    );
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
  } catch (err) {
    error('关闭数据库失败', err);
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
  getExpiredDeletedNotes,
  purgeDeletedNotes,
  exportAllNotes,
  clearAllNotes,
  getNoteByIdIncludingDeleted,
  closeDatabase,
};
