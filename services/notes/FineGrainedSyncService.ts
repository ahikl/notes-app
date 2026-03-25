/**
 * 细粒度同步服务
 * 使用多个独立的API接口组合完成同步功能，而非单一聚合接口
 *
 * 设计原则：
 * 1. 职责分离：每个函数负责一个具体的同步任务
 * 2. 事务性：数据库操作使用事务包装，确保数据一致性
 * 3. 异步处理：所有操作都是异步的，避免阻塞主线程
 * 4. 错误处理：详细的错误处理和日志记录
 * 5. 可测试性：模块化设计便于单元测试
 */

import { FineGrainedSyncResult, Note, SyncNote, SyncNotesResponse } from '@/types/notes/NoteTypes';
import { processSyncUpdatesToNotes } from '@/utils/sync/SyncDataUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { YjsNoteService } from '../crdt/YjsNoteService';
import { TransparentCryptoService } from '../crypto/TransparentCryptoService';
import * as DatabaseService from '../database/DatabaseService';
import {
  batchUpsertNotes,
  getSyncDeletions,
  getSyncFullData,
  getSyncIncremental,
  getSyncNewNotes,
  getSyncRestore,
  getSyncStatus,
} from './NoteService';
import { SyncServiceError } from './SyncService';

const LAST_SYNC_TIMESTAMP_KEY = 'last_sync_timestamp';

/**
 * 获取上次同步时间戳
 * @returns ISO 8601 格式的时间戳
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
    console.log(`[FineGrainedSyncService] 同步时间戳已保存: ${timestamp}`);
  } catch (error) {
    console.error('保存同步时间戳失败:', error);
  }
};

/**
 * 步骤1: 查询同步状态差异
 * 评估当前客户端与服务端的数据差异
 */
export const checkSyncStatus = async (
  localNoteIds: string[],
  localDeletedNoteIds: string[],
): Promise<{
  serverNoteCount: number;
  clientHasServerMissing: number;
  serverHasClientMissing: number;
  deleteStatusMismatch: number;
}> => {
  console.log('[FineGrainedSyncService] 步骤1: 查询同步状态差异...');

  const response = await getSyncStatus({
    localNoteIds,
    localDeletedNoteIds,
  });

  if (!response.success) {
    throw new SyncServiceError('查询同步状态失败', 'SYNC_STATUS_FAILED');
  }

  console.log(`[FineGrainedSyncService] 同步状态:`, {
    serverNoteCount: response.serverNoteCount,
    clientHasServerMissing: response.clientHasServerMissing,
    serverHasClientMissing: response.serverHasClientMissing,
    deleteStatusMismatch: response.deleteStatusMismatch,
  });

  return {
    serverNoteCount: response.serverNoteCount,
    clientHasServerMissing: response.clientHasServerMissing,
    serverHasClientMissing: response.serverHasClientMissing,
    deleteStatusMismatch: response.deleteStatusMismatch,
  };
};

/**
 * 步骤2: 获取增量更新
 * 获取时间戳之后有更新的笔记
 */
export const fetchIncrementalUpdates = async (
  lastSyncTimestamp: string,
  localNoteIds: string[],
): Promise<SyncNote[]> => {
  console.log('[FineGrainedSyncService] 步骤2: 获取增量更新...');

  const response = await getSyncIncremental({
    lastSyncTimestamp,
    localNoteIds,
  });

  if (!response.success) {
    throw new SyncServiceError('获取增量更新失败', 'INCREMENTAL_SYNC_FAILED');
  }

  console.log(`[FineGrainedSyncService] 增量更新数量: ${response.count}`);
  return response.notes || [];
};

/**
 * 步骤3: 获取新增笔记
 * 获取服务端有但客户端没有的笔记
 */
export const fetchNewNotes = async (localNoteIds: string[]): Promise<SyncNote[]> => {
  console.log('[FineGrainedSyncService] 步骤3: 获取新增笔记ID...');

  // 3.1 获取新增笔记ID列表
  const newNotesResponse = await getSyncNewNotes({
    localNoteIds,
  });

  if (!newNotesResponse.success) {
    throw new SyncServiceError('获取新增笔记ID失败', 'NEW_NOTES_SYNC_FAILED');
  }

  const newNoteIds = newNotesResponse.newNoteIds || [];
  console.log(`[FineGrainedSyncService] 新增笔记ID数量: ${newNoteIds.length}`);

  if (newNoteIds.length === 0) {
    return [];
  }

  // 3.2 获取新增笔记的完整数据
  console.log('[FineGrainedSyncService] 步骤3.2: 获取新增笔记完整数据...');
  const fullDataResponse = await getSyncFullData({
    ids: newNoteIds,
  });

  if (!fullDataResponse.success) {
    throw new SyncServiceError('获取新增笔记数据失败', 'FULL_DATA_SYNC_FAILED');
  }

  console.log(`[FineGrainedSyncService] 新增笔记数据数量: ${fullDataResponse.count}`);
  return fullDataResponse.notes || [];
};

/**
 * 步骤4: 获取需要删除的笔记
 * 获取服务端已删除但客户端未删除的笔记
 */
export const fetchDeletions = async (
  localNoteIds: string[],
  localDeletedNoteIds: string[],
): Promise<SyncNote[]> => {
  console.log('[FineGrainedSyncService] 步骤4: 获取需要删除的笔记...');

  const response = await getSyncDeletions({
    localNoteIds,
    localDeletedNoteIds,
  });

  if (!response.success) {
    throw new SyncServiceError('获取删除列表失败', 'DELETIONS_SYNC_FAILED');
  }

  // 将删除标记转换为 SyncNote 格式
  const deletions: SyncNote[] = (response.deletions || []).map((deletion) => ({
    id: deletion.id,
    is_deleted: deletion.is_deleted,
    updated_at: deletion.updated_at,
  }));

  console.log(`[FineGrainedSyncService] 需要删除的笔记数量: ${deletions.length}`);
  return deletions;
};

/**
 * 步骤5: 获取需要恢复的笔记
 * 获取客户端已删除但服务端未删除的笔记
 */
export const fetchRestorations = async (
  localNoteIds: string[],
  localDeletedNoteIds: string[],
): Promise<SyncNote[]> => {
  console.log('[FineGrainedSyncService] 步骤5: 获取需要恢复的笔记...');

  // 5.1 获取需要恢复的笔记ID
  const restoreResponse = await getSyncRestore({
    localNoteIds,
    localDeletedNoteIds,
  });

  if (!restoreResponse.success) {
    throw new SyncServiceError('获取恢复列表失败', 'RESTORE_SYNC_FAILED');
  }

  const restoreIds = restoreResponse.restoreIds || [];
  console.log(`[FineGrainedSyncService] 需要恢复的笔记ID数量: ${restoreIds.length}`);

  if (restoreIds.length === 0) {
    return [];
  }

  // 5.2 获取恢复笔记的完整数据
  console.log('[FineGrainedSyncService] 步骤5.2: 获取恢复笔记完整数据...');
  const fullDataResponse = await getSyncFullData({
    ids: restoreIds,
  });

  if (!fullDataResponse.success) {
    throw new SyncServiceError('获取恢复笔记数据失败', 'RESTORE_DATA_SYNC_FAILED');
  }

  console.log(`[FineGrainedSyncService] 恢复笔记数据数量: ${fullDataResponse.count}`);
  return fullDataResponse.notes || [];
};

/**
 * 步骤6: 上传本地待同步笔记
 * 将sync_status=1的笔记上传到服务端
 */
export const uploadPendingNotes = async (): Promise<{
  uploadedCount: number;
  skippedIds: string[];
}> => {
  console.log('[FineGrainedSyncService] 步骤6: 上传本地待同步笔记...');

  const notesToUpload = await DatabaseService.getNotesToSync();
  console.log(`[FineGrainedSyncService] 待上传笔记数量: ${notesToUpload.length}`);

  if (notesToUpload.length === 0) {
    return { uploadedCount: 0, skippedIds: [] };
  }

  try {
    const uploadResult = await batchUpsertNotes(notesToUpload);
    console.log('[FineGrainedSyncService] 批量上传结果:', uploadResult);

    // 更新成功上传笔记的sync_status
    const skippedIds = uploadResult.skippedIds || [];
    const notesToUpdateSyncStatus = notesToUpload.filter((note) => !skippedIds.includes(note.id));

    if (notesToUpdateSyncStatus.length > 0) {
      const updateData = notesToUpdateSyncStatus.map((note) => ({
        id: note.id,
        data: {
          sync_status: 0,
        },
      }));
      await DatabaseService.batchOperationNotes([], updateData, []);
      console.log(
        `[FineGrainedSyncService] 已更新 ${notesToUpdateSyncStatus.length} 条笔记的同步状态`,
      );
    }

    return {
      uploadedCount: notesToUpdateSyncStatus.length,
      skippedIds,
    };
  } catch (uploadError) {
    console.error('[FineGrainedSyncService] 批量上传失败:', uploadError);
    // 上传失败不阻止后续同步流程
    return { uploadedCount: 0, skippedIds: [] };
  }
};

/**
 * 步骤7: 处理CRDT冲突
 * 使用Yjs解决多设备同步冲突
 */
export const resolveConflicts = async (
  serverUpdates: Note[],
  localNotes: Note[],
): Promise<Note[]> => {
  console.log('[FineGrainedSyncService] 步骤7: 处理CRDT冲突...');

  YjsNoteService.initialize();

  const conflicts: { id: string; local: Note; server: Note }[] = [];
  const localNotesMap = new Map(localNotes.map((n) => [n.id, n]));

  // 检测冲突
  for (const serverNote of serverUpdates) {
    const localNote = localNotesMap.get(serverNote.id);
    if (localNote && serverNote.is_deleted !== 1 && localNote.is_deleted !== 1) {
      if (YjsNoteService.hasConflict(localNote, serverNote)) {
        conflicts.push({
          id: serverNote.id,
          local: localNote,
          server: serverNote,
        });
      }
    }
  }

  if (conflicts.length === 0) {
    console.log('[FineGrainedSyncService] 没有检测到冲突');
    return serverUpdates;
  }

  console.log(`[FineGrainedSyncService] 检测到 ${conflicts.length} 条冲突笔记，使用CRDT合并`);

  // 解密冲突笔记用于CRDT合并
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

  // 使用CRDT批量合并
  const mergedPlainNotes = YjsNoteService.batchMergeNotes(decryptedConflicts);

  // 重新加密合并后的笔记
  const mergedNotes = await Promise.all(
    mergedPlainNotes.map(async (note) => {
      if (note.is_encrypted === 1) {
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

  // 替换冲突笔记为合并后的版本
  const result = serverUpdates.map((serverNote) => {
    const mergedNote = mergedNotesMap.get(serverNote.id);
    return mergedNote || serverNote;
  });

  YjsNoteService.cleanupAll();
  return result;
};

/**
 * 步骤8: 应用同步更新到本地数据库
 * 使用事务确保数据一致性
 */
export const applySyncUpdates = async (serverNotes: Note[]): Promise<void> => {
  console.log(`[FineGrainedSyncService] 步骤8: 应用同步更新到本地数据库...`);
  console.log(`[FineGrainedSyncService] 待处理笔记数量: ${serverNotes.length}`);

  if (serverNotes.length === 0) {
    console.log('[FineGrainedSyncService] 没有需要应用的更新');
    return;
  }

  await DatabaseService.syncWithServer(serverNotes);
  console.log('[FineGrainedSyncService] 同步更新已应用到本地数据库');
};

/**
 * 执行完整的细粒度同步流程
 * 按照顺序执行所有同步步骤
 */
export const executeFineGrainedSync = async (): Promise<FineGrainedSyncResult> => {
  console.log('[FineGrainedSyncService] 开始细粒度同步流程...');

  const startTime = Date.now();
  const syncTimestamp = new Date().toISOString();

  try {
    // 获取本地笔记信息
    const localNotes = await DatabaseService.getAllNotesIncludingDeleted();
    const localNoteIds = localNotes.map((note) => note.id);
    const localDeletedNoteIds = localNotes.filter((n) => n.is_deleted === 1).map((n) => n.id);

    console.log(`[FineGrainedSyncService] 本地笔记总数: ${localNotes.length}`);
    console.log(`[FineGrainedSyncService] 本地已删除笔记: ${localDeletedNoteIds.length}`);

    // 获取上次同步时间戳
    const lastSyncTimestamp = await getLastSyncTimestamp();

    // 步骤1: 查询同步状态（可选，用于日志记录）
    const syncStatus = await checkSyncStatus(localNoteIds, localDeletedNoteIds);

    // 步骤6: 先上传本地待同步笔记
    const uploadResult = await uploadPendingNotes();

    // 步骤2: 获取增量更新
    const incrementalUpdates = await fetchIncrementalUpdates(lastSyncTimestamp, localNoteIds);

    // 步骤3: 获取新增笔记
    const newNotes = await fetchNewNotes(localNoteIds);

    // 步骤4: 获取需要删除的笔记
    const deletions = await fetchDeletions(localNoteIds, localDeletedNoteIds);

    // 步骤5: 获取需要恢复的笔记
    const restorations = await fetchRestorations(localNoteIds, localDeletedNoteIds);

    // 合并所有服务端更新，使用Map去重（以笔记ID为key）
    const updatesMap = new Map<string, SyncNote>();

    // 按优先级添加：增量更新 < 新增笔记 < 删除 < 恢复
    // 后面的会覆盖前面的，恢复优先级最高
    [...incrementalUpdates, ...newNotes, ...deletions, ...restorations].forEach((note) => {
      updatesMap.set(note.id, note);
    });

    const allServerUpdates = Array.from(updatesMap.values());

    console.log(`[FineGrainedSyncService] 服务端更新汇总:`, {
      incremental: incrementalUpdates.length,
      new: newNotes.length,
      deletions: deletions.length,
      restorations: restorations.length,
      unique: allServerUpdates.length,
      duplicatesRemoved:
        incrementalUpdates.length +
        newNotes.length +
        deletions.length +
        restorations.length -
        allServerUpdates.length,
    });

    // 转换为Note格式
    const serverUpdates = processSyncUpdatesToNotes(allServerUpdates);

    // 步骤7: 处理CRDT冲突
    const processedUpdates = await resolveConflicts(serverUpdates, localNotes);

    // 步骤8: 应用同步更新到本地数据库
    await applySyncUpdates(processedUpdates);

    // 保存同步时间戳
    await saveSyncTimestamp(syncTimestamp);

    const duration = Date.now() - startTime;
    console.log(`[FineGrainedSyncService] 细粒度同步完成，耗时: ${duration}ms`);

    return {
      success: true,
      toUpdate: [...incrementalUpdates, ...newNotes],
      toDelete: deletions,
      toRestore: restorations,
      serverNoteCount: syncStatus.serverNoteCount,
      syncTimestamp,
      stats: {
        incrementalUpdates: incrementalUpdates.length,
        newNotes: newNotes.length,
        deletions: deletions.length,
        restorations: restorations.length,
      },
    };
  } catch (error) {
    console.error('[FineGrainedSyncService] 细粒度同步失败:', error);

    if (error instanceof SyncServiceError) {
      throw error;
    }

    throw new SyncServiceError(
      `细粒度同步失败: ${(error as Error).message}`,
      'FINE_GRAINED_SYNC_FAILED',
      error as Error,
    );
  }
};

/**
 * 将细粒度同步结果转换为标准SyncNotesResponse格式
 * 用于兼容现有的同步接口
 */
export const convertToSyncNotesResponse = (result: FineGrainedSyncResult): SyncNotesResponse => {
  return {
    success: result.success,
    toUpdate: result.toUpdate,
    toDelete: result.toDelete,
    toRestore: result.toRestore,
    serverNoteCount: result.serverNoteCount,
    syncTimestamp: result.syncTimestamp,
  };
};

export default {
  checkSyncStatus,
  fetchIncrementalUpdates,
  fetchNewNotes,
  fetchDeletions,
  fetchRestorations,
  uploadPendingNotes,
  resolveConflicts,
  applySyncUpdates,
  executeFineGrainedSync,
  convertToSyncNotesResponse,
};
