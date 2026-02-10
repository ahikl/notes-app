import { syncNotes } from '@/services';
import { Note, SyncNotesRequest, SyncNotesResponse } from '@/types/notes/NoteTypes';
import { databaseNotesToSyncNotes, processSyncUpdates } from '@/utils/sync/SyncDataUtils';
import { YjsNoteService } from '../crdt/YjsNoteService';
import { TransparentCryptoService } from '../crypto/TransparentCryptoService';
import * as DatabaseService from '../database/DatabaseService';

/**
 * 同步服务错误
 */
export class SyncServiceError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = 'SyncServiceError';
  }
}

/**
 * 同步服务模块
 * 提供笔记的同步功能，将本地笔记与服务器笔记进行同步
 * 加密笔记在同步过程中保持加密状态
 */

/**
 * 验证笔记数据有效性
 * @param note 笔记对象
 * @returns 是否有效
 */
const isValidNote = (note: any): note is Note => {
  return (
    note &&
    typeof note === 'object' &&
    typeof note.id === 'string' &&
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    typeof note.created_at === 'string' &&
    typeof note.updated_at === 'string'
  );
};

/**
 * 处理服务器返回的同步更新
 * 确保加密笔记正确保存到本地数据库
 * @param serverNotes 服务器返回的笔记数组
 * @returns 处理后的笔记数组
 */
const processServerUpdates = (serverNotes: Note[]): Note[] => {
  return serverNotes.map((note) => {
    if (!isValidNote(note)) {
      console.warn('收到无效的笔记数据:', note);
      return note;
    }

    // 如果是加密笔记，确保标记正确并保持加密状态
    if (note.is_encrypted === 1) {
      // 验证 iv 和 auth_tag 是否存在
      if (!note.iv) {
        console.warn(`加密笔记 ${note.id} 缺少 iv 字段`);
      }
      return {
        ...note,
        is_encrypted: 1,
        // 内容保持加密状态，不解密
      };
    }

    return note;
  });
};

/**
 * 将本地笔记与服务器笔记进行同步
 * 使用 CRDT (Yjs) 解决多设备同步冲突，自动合并并发修改
 * 加密笔记在同步过程中保持加密状态，不会泄露明文内容
 *
 * 数据流：
 * 1. 本地数据库 (Note) -> SyncNote (Base64编码) -> API 传输
 * 2. API 响应 (SyncNote) -> 本地数据库 (Note) -> 存储
 */
export const synchronizeNotes = async (): Promise<SyncNotesResponse> => {
  try {
    console.log('[SyncService] 开始同步笔记...');

    // 初始化 Yjs CRDT 服务
    YjsNoteService.initialize();

    // 获取所有本地笔记（包括被软删除的）
    const localNotes = await DatabaseService.getAllNotesIncludingDeleted();
    console.log(`[SyncService] 本地笔记数量: ${localNotes.length}`);

    // 将本地笔记转换为同步格式（Base64编码，用于API传输）
    const notesForSync = databaseNotesToSyncNotes(localNotes);
    console.log(`[SyncService] 准备同步 ${notesForSync.length} 条笔记`);

    // 记录加密笔记的加密字段状态
    const encryptedNotes = notesForSync.filter((n) => n.is_encrypted === 1);
    if (encryptedNotes.length > 0) {
      console.log(`[SyncService] 发现 ${encryptedNotes.length} 条加密笔记`);
      encryptedNotes.forEach((note) => {
        console.log(
          `[SyncService] 加密笔记 ${note.id}: iv=${note.iv ? '存在' : '缺失'}, auth_tag=${note.auth_tag ? '存在' : '缺失'}`,
        );
      });
    }

    // 记录删除笔记状态
    const deletedNotes = notesForSync.filter((n) => n.is_deleted === 1);
    if (deletedNotes.length > 0) {
      console.log(`[SyncService] 发现 ${deletedNotes.length} 条已删除笔记`);
    }

    const syncRequest: SyncNotesRequest = {
      clientNotes: notesForSync,
    };

    // 发送同步请求到服务器
    console.log('[SyncService] 发送同步请求到服务器...');
    const syncResponse = await syncNotes(syncRequest);
    console.log(`[SyncService] 收到服务器响应，更新数量: ${syncResponse.updates?.length || 0}`);

    // 验证服务器返回的加密笔记
    if (syncResponse.updates && syncResponse.updates.length > 0) {
      const serverEncryptedNotes = syncResponse.updates.filter((n) => n.is_encrypted === 1);
      if (serverEncryptedNotes.length > 0) {
        console.log(`[SyncService] 服务器返回 ${serverEncryptedNotes.length} 条加密笔记`);
        serverEncryptedNotes.forEach((note) => {
          console.log(
            `[SyncService] 服务器加密笔记 ${note.id}: iv=${note.iv ? '存在' : '缺失'}, auth_tag=${note.auth_tag ? '存在' : '缺失'}`,
          );
        });
      }
    }

    // 验证同步响应
    if (!syncResponse) {
      throw new SyncServiceError('同步响应为空', 'EMPTY_RESPONSE');
    }

    if (!Array.isArray(syncResponse.updates)) {
      throw new SyncServiceError('同步响应格式错误：updates字段无效', 'INVALID_RESPONSE_FORMAT');
    }

    // 将服务器返回的 SyncNote 转换为 Note 格式
    const serverUpdates = processSyncUpdates(syncResponse.updates);

    // 使用 CRDT 处理冲突和合并
    const conflicts: { id: string; local: Note; server: Note }[] = [];
    const localNotesMap = new Map(localNotes.map((n) => [n.id, n]));

    // 检测冲突
    for (const serverNote of serverUpdates) {
      const localNote = localNotesMap.get(serverNote.id);
      if (localNote && YjsNoteService.hasConflict(localNote, serverNote)) {
        conflicts.push({
          id: serverNote.id,
          local: localNote,
          server: serverNote,
        });
      }
    }

    let processedUpdates: Note[];

    if (conflicts.length > 0) {
      console.log(`检测到 ${conflicts.length} 条笔记存在冲突，使用 CRDT 自动合并`);

      // 解密冲突笔记的内容（用于 CRDT 合并）
      const decryptedConflicts = await Promise.all(
        conflicts.map(async (conflict) => {
          const localPlain =
            conflict.local.is_encrypted === 1
              ? await TransparentCryptoService.decryptNote(conflict.local)
              : conflict.local;
          const serverPlain =
            conflict.server.is_encrypted === 1
              ? await TransparentCryptoService.decryptNote(conflict.server)
              : conflict.server;
          return {
            id: conflict.id,
            local: localPlain as Note,
            server: serverPlain as Note,
          };
        }),
      );

      // 使用 CRDT 批量合并冲突笔记（明文合并）
      const mergedPlainNotes = YjsNoteService.batchMergeNotes(decryptedConflicts);

      // 重新加密合并后的笔记（如果需要）
      const mergedNotes = await Promise.all(
        mergedPlainNotes.map(async (note) => {
          if (note.is_encrypted === 1) {
            const encrypted = await TransparentCryptoService.encryptNote({
              ...note,
              sync_status: 0,
              is_deleted: 0,
            });
            return encrypted;
          }
          return note;
        }),
      );

      const mergedNotesMap = new Map(mergedNotes.map((n) => [n.id, n]));

      // 替换冲突的笔记为合并后的版本
      processedUpdates = serverUpdates.map((serverNote) => {
        const mergedNote = mergedNotesMap.get(serverNote.id);
        if (mergedNote) {
          return mergedNote;
        }
        return processServerUpdates([serverNote as any])[0];
      });
    } else {
      // 没有冲突，正常处理服务器更新
      processedUpdates = serverUpdates;
    }

    // 使用数据库服务的同步功能处理服务器返回的更新数据
    if (processedUpdates.length > 0) {
      await DatabaseService.syncWithServer(processedUpdates);
    }

    // 清理 CRDT 文档
    YjsNoteService.cleanupAll();

    // 返回同步结果（将处理后的笔记转换回 SyncNote 格式）
    return {
      ...syncResponse,
      updates: databaseNotesToSyncNotes(processedUpdates),
    };
  } catch (error) {
    if (error instanceof SyncServiceError) {
      throw error;
    }
    console.error('同步笔记失败:', error);
    throw new SyncServiceError(
      `同步笔记失败: ${(error as Error).message}`,
      'SYNC_FAILED',
      error as Error,
    );
  }
};

/**
 * 获取本地笔记并发送给服务器进行同步
 * 支持加密笔记的安全同步
 * @param notesToSync 要同步的笔记数组
 * @returns 同步响应
 */
export const uploadNotesForSync = async (notesToSync: Note[]): Promise<SyncNotesResponse> => {
  try {
    // 验证输入
    if (!Array.isArray(notesToSync)) {
      throw new SyncServiceError('输入必须是笔记数组', 'INVALID_INPUT');
    }

    // 将笔记转换为同步格式（Base64编码，用于API传输）
    const notesForSync = databaseNotesToSyncNotes(notesToSync);

    const syncRequest: SyncNotesRequest = {
      clientNotes: notesForSync,
    };

    const response = await syncNotes(syncRequest);

    // 处理服务器返回的更新
    if (response.updates && response.updates.length > 0) {
      const processedUpdates = processSyncUpdates(response.updates);
      return {
        ...response,
        updates: databaseNotesToSyncNotes(processedUpdates),
      };
    }

    return response;
  } catch (error) {
    if (error instanceof SyncServiceError) {
      throw error;
    }
    console.error('上传笔记进行同步失败:', error);
    throw new SyncServiceError(
      `上传笔记进行同步失败: ${(error as Error).message}`,
      'UPLOAD_FAILED',
      error as Error,
    );
  }
};

/**
 * 同步加密笔记
 * 专门用于同步加密笔记，确保加密状态不被破坏
 * @returns 同步响应
 */
export const synchronizeEncryptedNotes = async (): Promise<{
  encryptedNotesCount: number;
  syncResponse: SyncNotesResponse;
}> => {
  try {
    // 获取所有本地笔记
    const localNotes = await DatabaseService.getAllNotesIncludingDeleted();

    // 筛选出加密笔记
    const encryptedNotes = localNotes.filter((note) => note.is_encrypted === 1);

    console.log(`发现 ${encryptedNotes.length} 条加密笔记需要同步`);

    // 执行同步
    const syncResponse = await synchronizeNotes();

    return {
      encryptedNotesCount: encryptedNotes.length,
      syncResponse,
    };
  } catch (error) {
    if (error instanceof SyncServiceError) {
      throw error;
    }
    console.error('同步加密笔记失败:', error);
    throw new SyncServiceError(
      `同步加密笔记失败: ${(error as Error).message}`,
      'ENCRYPTED_SYNC_FAILED',
      error as Error,
    );
  }
};

/**
 * 检查笔记是否为加密笔记
 * @param note 笔记对象
 * @returns 是否加密
 */
export const isEncryptedNote = (note: Note): boolean => {
  return note.is_encrypted === 1;
};

/**
 * 获取同步状态摘要
 * 用于显示同步结果的统计信息
 * @param syncResponse 同步响应
 * @returns 状态摘要
 */
export const getSyncSummary = (
  syncResponse: SyncNotesResponse,
): {
  totalUpdates: number;
  encryptedUpdates: number;
  normalUpdates: number;
  syncedIds: string[];
} => {
  const updates = syncResponse.updates || [];
  const encryptedUpdates = updates.filter((note) => note.is_encrypted === 1);

  return {
    totalUpdates: updates.length,
    encryptedUpdates: encryptedUpdates.length,
    normalUpdates: updates.length - encryptedUpdates.length,
    syncedIds: syncResponse.syncedIds || [],
  };
};

export default {
  synchronizeNotes,
  uploadNotesForSync,
};
