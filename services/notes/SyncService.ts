import { Note, SyncNote, SyncNotesRequest, SyncNotesResponse } from '@/types/notes/NoteTypes';
import {
  databaseNotesToSyncNotes,
  processSyncUpdatesToNotes,
  syncNoteToNote,
} from '@/utils/sync/SyncDataUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YjsNoteService } from '../crdt/YjsNoteService';
import { TransparentCryptoService } from '../crypto/TransparentCryptoService';
import * as DatabaseService from '../database/DatabaseService';
import { convertToSyncNotesResponse, executeFineGrainedSync } from './FineGrainedSyncService';
import { batchUpsertNotes, syncNotes } from '@/services';

const LAST_SYNC_TIMESTAMP_KEY = 'last_sync_timestamp';

/**
 * 获取上次同步时间戳
 * @returns ISO 8601 格式的时间戳，如果没有则返回 '1970-01-01T00:00:00.000Z'
 */
const getLastSyncTimestamp = async (): Promise<string> => {
  try {
    const timestamp = await AsyncStorage.getItem(LAST_SYNC_TIMESTAMP_KEY);
    return timestamp || '1970-01-01T00:00:00.000Z';
  } catch (error) {
    console.error('获取上次同步时间戳失败:', error);
    return '1970-01-01T00:00:00.000Z';
  }
};

/**
 * 保存同步时间戳
 * @param timestamp ISO 8601 格式的时间戳
 */
const saveSyncTimestamp = async (timestamp: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LAST_SYNC_TIMESTAMP_KEY, timestamp);
    console.log(`[SyncService] 同步时间戳已保存: ${timestamp}`);
  } catch (error) {
    console.error('保存同步时间戳失败:', error);
  }
};

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
  // 基本验证：必须有 id 和 updated_at
  if (
    !note ||
    typeof note !== 'object' ||
    typeof note.id !== 'string' ||
    typeof note.updated_at !== 'string'
  ) {
    return false;
  }

  // 对于已删除的笔记，允许缺少 title 和 content
  if (note.is_deleted === 1) {
    return true;
  }

  // 非删除笔记需要完整的字段
  return (
    typeof note.title === 'string' &&
    typeof note.content === 'string' &&
    typeof note.created_at === 'string'
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
 * 同步配置选项
 */
export interface SyncOptions {
  /**
   * 是否使用细粒度同步API
   * true: 使用多个独立API接口组合完成同步（推荐）
   * false: 使用单一聚合同步接口
   * 默认: true
   */
  useFineGrainedSync?: boolean;
}

export const synchronizeNotes = async (options: SyncOptions = {}): Promise<SyncNotesResponse> => {
  const { useFineGrainedSync = true } = options;

  // 使用细粒度同步
  if (useFineGrainedSync) {
    console.log('[SyncService] 使用细粒度同步模式');
    const fineGrainedResult = await executeFineGrainedSync();
    return convertToSyncNotesResponse(fineGrainedResult);
  }

  // 使用聚合同步（原有逻辑）
  console.log('[SyncService] 使用聚合同步模式');
  return executeAggregatedSync();
};

const executeAggregatedSync = async (): Promise<SyncNotesResponse> => {
  try {
    console.log('[SyncService] 开始同步笔记...');

    // 初始化 Yjs CRDT 服务
    YjsNoteService.initialize();

    // 获取所有本地笔记（包括被软删除的）
    const localNotes = await DatabaseService.getAllNotesIncludingDeleted();
    console.log(`[SyncService] 本地笔记数量: ${localNotes.length}`);

    // 提取本地笔记ID列表
    const localNoteIds = localNotes.map((note) => note.id);
    console.log(`[SyncService] 本地笔记ID列表:`, localNoteIds);

    // 获取上次同步时间戳（从本地存储或数据库中获取）
    const lastSyncTimestamp = await getLastSyncTimestamp();
    console.log(`[SyncService] 上次同步时间戳: ${lastSyncTimestamp}`);

    // 构建同步请求（新API规范）
    // 分离已删除和未删除的笔记ID
    const localDeletedNoteIds = localNotes.filter((n) => n.is_deleted === 1).map((n) => n.id);

    const syncRequest: SyncNotesRequest = {
      localNoteIds,
      localDeletedNoteIds,
      lastSyncTimestamp,
    };

    // 第一步：上传本地笔记到服务端（客户端有但服务端没有的）
    console.log('[SyncService] 第一步：上传本地笔记到服务端...');
    console.log(
      `[SyncService] 本地笔记详情:`,
      localNotes.map((n: Note) => ({
        id: n.id,
        sync_status: n.sync_status,
        is_deleted: n.is_deleted,
      })),
    );
    const notesToUpload = await DatabaseService.getNotesToSync();
    console.log(`[SyncService] 需要上传的笔记数量: ${notesToUpload.length}`);
    if (notesToUpload.length > 0) {
      console.log(
        `[SyncService] 待上传笔记ID:`,
        notesToUpload.map((n: Note) => n.id),
      );
    }

    if (notesToUpload.length > 0) {
      console.log(
        `[SyncService] 准备上传笔记:`,
        notesToUpload.map((n: Note) => n.id),
      );
      try {
        const uploadResult = await batchUpsertNotes(notesToUpload);
        console.log('[SyncService] 批量上传成功:', uploadResult);

        // 处理被跳过的笔记（服务端时间戳较新）
        const skippedIds = uploadResult.skippedIds || [];
        console.log(
          `[SyncService] 插入: ${uploadResult.insertedCount}, 更新: ${uploadResult.updatedCount}, 跳过: ${uploadResult.skippedCount}`,
        );

        if (skippedIds.length > 0) {
          console.log(
            '[SyncService] 以下笔记被跳过（服务端较新），将在同步步骤拉取服务端版本:',
            skippedIds,
          );
        }

        // 只更新成功上传的笔记的 sync_status 为已同步
        // 被跳过的笔记保持 sync_status = 1，让 /notes/sync 拉取服务端版本
        const notesToUpdateSyncStatus = notesToUpload.filter(
          (note: Note) => !skippedIds.includes(note.id),
        );

        if (notesToUpdateSyncStatus.length > 0) {
          const updateData = notesToUpdateSyncStatus.map((note: Note) => ({
            id: note.id,
            data: {
              sync_status: 0,
            },
          }));
          await DatabaseService.batchOperationNotes([], updateData, []);
          console.log(`[SyncService] 已更新 ${notesToUpdateSyncStatus.length} 条笔记的同步状态`);
        }
      } catch (uploadError) {
        console.error('[SyncService] 批量上传失败:', uploadError);
        // 上传失败不阻止后续同步流程，继续尝试拉取服务端数据
      }
    }

    // 第二步：发送同步请求，获取服务端需要更新的数据
    console.log('[SyncService] 第二步：发送同步请求获取服务端更新...');
    console.log(`[SyncService] 请求数据:`, {
      localNoteIdsCount: syncRequest.localNoteIds.length,
      localDeletedNoteIdsCount: syncRequest.localDeletedNoteIds?.length || 0,
      localDeletedNoteIds: syncRequest.localDeletedNoteIds,
      lastSyncTimestamp: syncRequest.lastSyncTimestamp,
    });

    const syncResponse = await syncNotes(syncRequest);
    console.log(`[SyncService] 收到服务器响应:`);
    console.log(`  - 需要更新: ${syncResponse.toUpdate?.length || 0}`);
    console.log(`  - 需要删除: ${syncResponse.toDelete?.length || 0}`);
    console.log(`  - 需要恢复: ${syncResponse.toRestore?.length || 0}`);
    console.log(`  - 服务端笔记总数: ${syncResponse.serverNoteCount || 0}`);
    console.log(`  - 本次同步时间戳: ${syncResponse.syncTimestamp}`);

    // 验证同步响应
    if (!syncResponse) {
      throw new SyncServiceError('同步响应为空', 'EMPTY_RESPONSE');
    }

    // 合并所有需要处理的笔记
    const allServerUpdates: SyncNote[] = [
      ...(syncResponse.toUpdate || []),
      ...(syncResponse.toDelete || []),
      ...(syncResponse.toRestore || []),
    ];

    // 记录服务端返回的笔记详情
    if (allServerUpdates.length > 0) {
      console.log(
        `[SyncService] 服务端返回的笔记ID列表:`,
        allServerUpdates.map((n) => ({
          id: n.id,
          is_encrypted: n.is_encrypted,
          is_deleted: n.is_deleted,
          has_iv: !!n.iv,
          has_auth_tag: !!n.auth_tag,
        })),
      );

      // 记录加密笔记状态
      const serverEncryptedNotes = allServerUpdates.filter((n) => n.is_encrypted === 1);
      if (serverEncryptedNotes.length > 0) {
        console.log(`[SyncService] 服务器返回 ${serverEncryptedNotes.length} 条加密笔记`);
      }

      // 记录删除状态
      const serverDeletedNotes = allServerUpdates.filter((n) => n.is_deleted === 1);
      if (serverDeletedNotes.length > 0) {
        console.log(`[SyncService] 服务器返回 ${serverDeletedNotes.length} 条已删除笔记`);
      }
    }

    // 将服务器返回的 SyncNote 转换为 Note 格式
    const serverUpdates = processSyncUpdatesToNotes(allServerUpdates);

    // 使用 CRDT 处理冲突和合并
    const conflicts: { id: string; local: Note; server: Note }[] = [];
    const localNotesMap = new Map(localNotes.map((n) => [n.id, n]));

    // 检测冲突（删除状态以服务端为准，时间戳以较新的为准）
    for (const serverNote of serverUpdates) {
      const localNote = localNotesMap.get(serverNote.id);
      if (localNote) {
        // 如果服务端已删除，优先采用服务端删除状态（不加入冲突，让数据库层处理）
        if (serverNote.is_deleted === 1) {
          console.log(`[SyncService] 笔记 ${serverNote.id} 在服务端已删除，将同步删除状态到本地`);
          continue;
        }
        // 如果本地已删除但服务端未删除，需要解决冲突
        if (localNote.is_deleted === 1 && serverNote.is_deleted === 0) {
          console.log(`[SyncService] 笔记 ${serverNote.id} 本地已删除但服务端存在，需要解决冲突`);
          // 本地已删除但服务端存在，根据时间戳决定
          const localTime = new Date(localNote.updated_at).getTime();
          const serverTime = new Date(serverNote.updated_at).getTime();
          if (serverTime > localTime) {
            // 服务端较新，恢复笔记
            console.log(`[SyncService] 笔记 ${serverNote.id} 服务端版本较新，将恢复笔记`);
          } else {
            // 本地较新，保持删除状态
            console.log(`[SyncService] 笔记 ${serverNote.id} 本地版本较新，保持删除状态`);
            continue;
          }
        }
        // 检测内容冲突（仅在双方都有内容时）
        if (YjsNoteService.hasConflict(localNote, serverNote)) {
          conflicts.push({
            id: serverNote.id,
            local: localNote,
            server: serverNote,
          });
        }
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
            // 保留原始的删除状态，不要强制设置为 0

            return await TransparentCryptoService.encryptNote({
              ...note,
              sync_status: 0,
              is_deleted: note.is_deleted ?? 0,
            });
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
        // 将 SyncNote 转换为 Note 类型后再处理
        const note = syncNoteToNote(serverNote, 0, serverNote.is_deleted || 0);
        return processServerUpdates([note])[0];
      });
    } else {
      // 没有冲突，正常处理服务器更新
      processedUpdates = serverUpdates;
    }

    // 使用数据库服务的同步功能处理服务器返回的更新数据
    // 这会处理：
    // 1. 服务端删除状态同步到本地
    // 2. 服务端新笔记拉取到本地
    // 3. 服务端更新同步到本地
    // 4. 本地有但服务端没有的笔记标记为待上传
    console.log(`[SyncService] 准备调用 syncWithServer，处理 ${processedUpdates.length} 条更新`);
    if (processedUpdates.length > 0) {
      console.log(
        `[SyncService] 待处理笔记ID:`,
        processedUpdates.map((n) => n.id),
      );
      await DatabaseService.syncWithServer(processedUpdates);
      console.log('[SyncService] syncWithServer 执行完成');
    } else {
      console.log('[SyncService] 没有需要处理的更新');
    }

    // 清理 CRDT 文档
    YjsNoteService.cleanupAll();

    // 保存本次同步时间戳
    if (syncResponse.syncTimestamp) {
      await saveSyncTimestamp(syncResponse.syncTimestamp);
    }

    // 返回同步结果（转换为新API格式）
    return {
      ...syncResponse,
      toUpdate: databaseNotesToSyncNotes(processedUpdates.filter((n) => n.is_deleted === 0)),
      toDelete: databaseNotesToSyncNotes(processedUpdates.filter((n) => n.is_deleted === 1)),
      toRestore: [],
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
 * 上传笔记进行同步（已废弃，请使用 synchronizeNotes）
 * 新API规范下，同步逻辑已改为服务端主导模式
 * @deprecated 请使用 synchronizeNotes 替代
 */
export const uploadNotesForSync = async (_notesToSync: Note[]): Promise<SyncNotesResponse> => {
  console.warn('[SyncService] uploadNotesForSync 已废弃，请使用 synchronizeNotes');
  // 直接调用新的同步方法
  return synchronizeNotes();
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
 * 获取同步状态摘要（新API规范）
 * 用于显示同步结果的统计信息
 * @param syncResponse 同步响应
 * @returns 状态摘要
 */
export const getSyncSummary = (
  syncResponse: SyncNotesResponse,
): {
  totalToUpdate: number;
  totalToDelete: number;
  totalToRestore: number;
  encryptedUpdates: number;
  serverNoteCount: number;
  syncTimestamp: string;
} => {
  const toUpdate = syncResponse.toUpdate || [];
  const toDelete = syncResponse.toDelete || [];
  const toRestore = syncResponse.toRestore || [];

  const encryptedUpdates =
    toUpdate.filter((note: SyncNote) => note.is_encrypted === 1).length +
    toRestore.filter((note: SyncNote) => note.is_encrypted === 1).length;

  return {
    totalToUpdate: toUpdate.length,
    totalToDelete: toDelete.length,
    totalToRestore: toRestore.length,
    encryptedUpdates,
    serverNoteCount: syncResponse.serverNoteCount || 0,
    syncTimestamp: syncResponse.syncTimestamp || '',
  };
};

export default {
  synchronizeNotes,
  uploadNotesForSync,
};
