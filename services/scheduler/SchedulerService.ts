import { Note } from '@/types/notes/NoteTypes';
import * as DatabaseService from '../database/DatabaseService';
import {
  batchDeleteNotes as batchDeleteNotesApi,
  deleteNote as deleteNoteApi,
} from '../notes/NoteService';
import { synchronizeNotes } from '../notes/SyncService';

/**
 * 定时任务服务
 * 用于定期清理被标记为软删除的笔记，并将删除操作同步到服务端
 */
class SchedulerService {
  private syncInterval: number | null = null;
  private cleanupInterval: number | null = null;
  private isRunning = false;

  /**
   * 启动定时任务
   * @param syncIntervalMs 同步间隔时间（毫秒），默认30分钟
   * @param cleanupIntervalMs 清理间隔时间（毫秒），默认1小时
   */
  public async start(
    syncIntervalMs: number = 30 * 60 * 1000,
    cleanupIntervalMs: number = 60 * 60 * 1000,
  ) {
    if (this.isRunning) {
      console.log('定时任务已在运行中');
      return;
    }

    console.log('启动定时任务...');
    this.isRunning = true;

    // 立即执行一次同步和清理
    await this.performSync();
    await this.performCleanup();

    // 设置同步定时任务
    this.syncInterval = setInterval(async () => {
      await this.performSync();
    }, syncIntervalMs);

    // 设置清理定时任务
    this.cleanupInterval = setInterval(async () => {
      await this.performCleanup();
    }, cleanupIntervalMs);

    console.log(`定时任务已启动 - 同步间隔: ${syncIntervalMs}ms, 清理间隔: ${cleanupIntervalMs}ms`);
  }

  /**
   * 停止定时任务
   */
  public stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.isRunning = false;
    console.log('定时任务已停止');
  }

  /**
   * 执行同步任务
   * 使用统一的双向同步机制，确保删除状态和数据一致性
   */
  private async performSync() {
    try {
      console.log('开始执行定时同步任务...');

      // 使用统一的同步服务进行双向同步
      // 这会处理：
      // 1. 本地删除状态同步到服务端
      // 2. 服务端删除状态同步到本地
      // 3. 服务端新笔记拉取到本地
      // 4. 本地更新同步到服务端
      await synchronizeNotes();

      console.log('定时同步任务完成');
    } catch (error) {
      console.error('定时同步任务执行失败:', error);

      // 如果统一同步失败，尝试单独同步删除标记的笔记
      try {
        console.log('尝试单独同步删除标记的笔记...');
        const allNotes = await DatabaseService.getAllNotesIncludingDeleted();
        const deletedNotes = allNotes.filter(
          (note) => note.is_deleted === 1 && note.sync_status === 1,
        );

        if (deletedNotes.length > 0) {
          await this.syncDeletedNotes(deletedNotes);
        }
      } catch (fallbackError) {
        console.error('单独同步删除笔记也失败了:', fallbackError);
      }
    }
  }

  /**
   * 同步被标记删除的笔记到服务端
   * 无论是否将删除消息成功发送到服务端都不影响本地删除
   */
  private async syncDeletedNotes(deletedNotes: Note[]) {
    try {
      console.log(`准备同步 ${deletedNotes.length} 条删除标记的笔记到服务端...`);

      // 批量同步删除标记的笔记到服务端
      const noteIds = deletedNotes.map((note) => note.id);

      try {
        // 使用批量删除API
        const result = await batchDeleteNotesApi(noteIds);
        console.log(`批量删除服务端笔记成功: ${result.deletedCount} 条`);

        // 本地更新同步状态为0（已同步）
        for (const noteId of noteIds) {
          await DatabaseService.updateSyncStatus(noteId, 0);
        }
      } catch (error: any) {
        console.error('批量同步删除笔记到服务端失败:', error);

        // 检查是否为网络错误，如果是则静默处理
        if (
          error?.message?.includes('Network Error') ||
          error?.message?.includes('timeout') ||
          error?.code === 'ECONNABORTED'
        ) {
          console.warn('批量同步删除时发生网络错误，将本地状态更新为已同步:', error.message);
          // 发生网络错误时，也将本地状态更新为已同步，避免重复尝试
          for (const noteId of noteIds) {
            await DatabaseService.updateSyncStatus(noteId, 0);
          }
        } else {
          // 即使批量删除失败，也要尝试逐个删除，但失败不影响本地删除
          const deletePromises = deletedNotes.map(async (note) => {
            try {
              // 从服务端删除笔记
              await deleteNoteApi(note.id);
              console.log(`服务端笔记删除成功: ${note.id}`);

              // 本地更新同步状态为0（已同步）
              await DatabaseService.updateSyncStatus(note.id, 0);

              return { id: note.id, success: true };
            } catch (deleteError: any) {
              if (
                deleteError?.message?.includes('Network Error') ||
                deleteError?.message?.includes('timeout') ||
                deleteError?.code === 'ECONNABORTED'
              ) {
                console.warn(`同步删除笔记时发生网络错误 (${note.id}):`, deleteError.message);
                // 发生网络错误时，也将本地状态更新为已同步，避免重复尝试
                await DatabaseService.updateSyncStatus(note.id, 0);
              } else {
                console.error(`同步删除笔记失败 (${note.id}):`, deleteError);
              }

              return { id: note.id, success: false, error: deleteError };
            }
          });

          const results = await Promise.all(deletePromises);
          const successfulDeletes = results.filter((result) => result.success);
          const failedDeletes = results.filter((result) => !result.success);

          console.log(`逐个同步删除 ${successfulDeletes.length} 条笔记到服务端`);
          if (failedDeletes.length > 0) {
            console.log(`有 ${failedDeletes.length} 条笔记同步删除失败，但本地已标记为已同步`);
          }
        }
      }
    } catch (error) {
      console.error('同步删除笔记到服务端失败:', error);
    }
  }

  /**
   * 上传非删除状态的笔记
   */
  private async uploadNonDeletedNotes(notes: Note[]) {
    try {
      console.log('上传非删除状态的笔记到服务端...');

      // 使用现有的同步服务
      await synchronizeNotes();
    } catch (error) {
      console.error('上传非删除笔记失败:', error);
    }
  }

  /**
   * 执行清理任务
   * 清理本地数据库中已被同步的删除标记笔记
   */
  private async performCleanup() {
    try {
      console.log('开始执行清理任务...');

      // 获取所有被标记删除的笔记
      const deletedNotes = await DatabaseService.getDeletedNotes();

      if (deletedNotes.length === 0) {
        console.log('没有被标记删除的笔记需要清理');
        return;
      }

      console.log(`找到 ${deletedNotes.length} 条被标记删除的笔记`);

      // 过滤出已同步的删除标记笔记 (sync_status === 0 表示已同步)
      const syncedDeletedNotes = deletedNotes.filter((note) => note.sync_status === 0);

      if (syncedDeletedNotes.length === 0) {
        console.log('没有已同步的删除标记笔记需要清理');
        return;
      }

      console.log(`发现 ${syncedDeletedNotes.length} 条已同步的删除标记笔记，开始物理删除...`);

      // 物理删除已同步的删除标记笔记
      for (const note of syncedDeletedNotes) {
        await DatabaseService.permanentlyDeleteNote(note.id);
      }

      console.log(`清理完成，共物理删除 ${syncedDeletedNotes.length} 条笔记`);
    } catch (error) {
      console.error('清理任务执行失败:', error);
    }
  }
}

export default new SchedulerService();
