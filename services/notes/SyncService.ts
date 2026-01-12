import { Note, SyncNotesRequest, SyncNotesResponse } from '@/types/notes/NoteTypes';
import { syncNotes } from '@/services';
import * as DatabaseService from '../database/DatabaseService';

/**
 * 同步服务模块
 * 提供笔记的同步功能，将本地笔记与服务器笔记进行同步
 */

/**
 * 将本地笔记与服务器笔记进行同步
 */
export const synchronizeNotes = async (): Promise<SyncNotesResponse> => {
  try {
    // 获取所有本地笔记（包括被软删除的）
    const localNotes = await DatabaseService.getAllNotesIncludingDeleted();

    // 准备同步请求数据
    const syncRequest: SyncNotesRequest = {
      clientNotes: localNotes,
    };

    // 发送同步请求到服务器
    const syncResponse = await syncNotes(syncRequest);

    // 使用数据库服务的同步功能处理服务器返回的更新数据
    if (syncResponse.updates && syncResponse.updates.length > 0) {
      await DatabaseService.syncWithServer(syncResponse.updates);
    }

    return syncResponse;
  } catch (error) {
    console.error('同步笔记失败:', error);
    throw error;
  }
};

/**
 * 获取本地笔记并发送给服务器进行同步
 */
export const uploadNotesForSync = async (notesToSync: Note[]): Promise<SyncNotesResponse> => {
  try {
    const syncRequest: SyncNotesRequest = {
      clientNotes: notesToSync,
    };

    return await syncNotes(syncRequest);
  } catch (error) {
    console.error('上传笔记进行同步失败:', error);
    throw error;
  }
};

export default {
  synchronizeNotes,
  uploadNotesForSync,
};
