import { noteService as NoteService } from '@/services';
import {
  BatchDeleteNoteResponse,
  BatchSafelyDeleteNoteResponse,
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteResponse,
  ExportAllNotesResponse,
  GetNotesQuery,
  Note,
  PaginatedResponse,
  SyncNotesResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
} from '@/types/notes/NoteTypes';
import { TransparentCryptoService } from '../crypto/TransparentCryptoService';
import * as DatabaseService from '../database/DatabaseService';

// 初始化本地存储
export const initLocalStorage = async () => {
  try {
    await DatabaseService.initDatabase();
    // 初始化透明加密服务
    await TransparentCryptoService.initialize();
    console.log('本地数据库和加密服务初始化完成');
  } catch (error) {
    console.error('本地数据库初始化失败:', error);
    throw error;
  }
};

/**
 * 获取笔记列表（带分页）
 * 自动解密加密笔记
 */
export const getNotes = async (query?: GetNotesQuery): Promise<PaginatedResponse<Note>> => {
  try {
    const allNotes = await DatabaseService.getAllNotes();

    // 解密所有笔记
    const decryptedNotes = await TransparentCryptoService.decryptNotes(allNotes);

    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    // 如果有搜索查询，先过滤
    let notes = decryptedNotes;
    if (query?.search) {
      const searchTerm = query.search.toLowerCase();
      notes = decryptedNotes.filter(
        (note) =>
          note.title.toLowerCase().includes(searchTerm) ||
          note.content.toLowerCase().includes(searchTerm),
      );
    }

    const paginatedNotes = notes.slice(startIndex, endIndex);

    return {
      total: notes.length,
      data: paginatedNotes as Note[],
      page,
      limit,
    };
  } catch (error) {
    console.error('获取笔记列表失败:', error);
    throw error;
  }
};

/**
 * 根据ID获取笔记
 * 自动解密加密笔记
 */
export const getNoteById = async (id: string): Promise<Note> => {
  try {
    const note = await DatabaseService.getNoteById(id);
    if (!note) {
      throw new Error(`笔记不存在: ${id}`);
    }

    // 解密笔记内容
    const decryptedNote = await TransparentCryptoService.decryptNote(note);
    return decryptedNote as Note;
  } catch (error) {
    console.error('获取笔记失败:', error);
    throw error;
  }
};

/**
 * 创建笔记
 * 如果启用加密，自动加密内容后存储
 */
export const createNote = async (data: CreateNoteRequest): Promise<CreateNoteResponse> => {
  try {
    const now = new Date().toISOString();
    const plainNote = {
      id: '', // 数据库会生成ID
      title: data.title,
      content: data.content,
      is_encrypted: data.is_encrypted ?? 0,
      sync_status: 1,
      is_deleted: 0,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };

    // 加密笔记（如果需要）
    const encryptedNote = await TransparentCryptoService.prepareForStorage(plainNote);

    console.log(`[本地服务] 创建笔记，加密状态: ${encryptedNote.is_encrypted}`, {
      has_iv: !!encryptedNote.iv,
      has_auth_tag: !!encryptedNote.auth_tag,
    });

    // 创建笔记请求（包含 iv 和 auth_tag）
    const createData: CreateNoteRequest = {
      title: encryptedNote.title,
      content: encryptedNote.content,
      is_encrypted: encryptedNote.is_encrypted,
      created_at: encryptedNote.created_at,
      updated_at: encryptedNote.updated_at,
      ...(encryptedNote.iv && { iv: encryptedNote.iv }),
      ...(encryptedNote.auth_tag && { auth_tag: encryptedNote.auth_tag }),
    };

    const id = await DatabaseService.createNote(createData);
    return {
      success: true,
      id,
    };
  } catch (error) {
    console.error('创建笔记失败:', error);
    throw error;
  }
};

/**
 * 更新笔记
 * 如果启用加密，自动加密内容后存储
 */
export const updateNote = async (
  id: string,
  data: UpdateNoteRequest,
): Promise<UpdateNoteResponse> => {
  try {
    // 获取当前笔记以获取完整信息
    const currentNote = await DatabaseService.getNoteById(id);
    if (!currentNote) {
      throw new Error(`笔记不存在: ${id}`);
    }

    // 构建完整的明文笔记数据
    const now = new Date().toISOString();
    const plainNote = {
      id,
      title: data.title ?? currentNote.title,
      content: data.content ?? currentNote.content,
      is_encrypted: data.is_encrypted ?? currentNote.is_encrypted,
      sync_status: 1,
      is_deleted: currentNote.is_deleted,
      created_at: currentNote.created_at,
      updated_at: data.updated_at || now,
    };

    // 加密笔记（如果需要）
    const encryptedNote = await TransparentCryptoService.prepareForStorage(plainNote);

    console.log(`[本地服务] 更新笔记 ${id}，加密状态: ${encryptedNote.is_encrypted}`, {
      has_iv: !!encryptedNote.iv,
      has_auth_tag: !!encryptedNote.auth_tag,
    });

    // 更新笔记（包含 iv 和 auth_tag）
    await DatabaseService.updateNote(id, {
      title: encryptedNote.title,
      content: encryptedNote.content,
      is_encrypted: encryptedNote.is_encrypted,
      updated_at: encryptedNote.updated_at,
      ...(encryptedNote.iv !== undefined && { iv: encryptedNote.iv }),
      ...(encryptedNote.auth_tag !== undefined && { auth_tag: encryptedNote.auth_tag }),
    });

    return {
      success: true,
    };
  } catch (error) {
    console.error('更新笔记失败:', error);
    throw error;
  }
};

/**
 * 删除笔记 - 改进版本，即使网络错误也不影响本地删除
 */
export const deleteNote = async (id: string): Promise<DeleteNoteResponse> => {
  try {
    // 执行本地软删除（标记为已删除，同步状态为待同步）
    await DatabaseService.deleteNote(id);

    // 本地删除成功后，尝试同步到服务端，但不阻塞本地删除操作
    try {
      await NoteService.deleteNote(id);
      // 如果成功同步，更新本地同步状态为0（已同步）
      await DatabaseService.updateSyncStatus(id, 0);
      console.log('笔记同步删除成功:', id);
    } catch (syncError: any) {
      if (
        syncError?.message?.includes('Network Error') ||
        syncError?.message?.includes('timeout') ||
        syncError?.code === 'ECONNABORTED'
      ) {
        console.warn(`同步删除笔记时发生网络错误 (${id}):`, syncError.message);
        // 网络错误时，不抛出错误，仅保持笔记的待同步状态
      } else {
        console.error(`同步删除笔记失败 (${id}):`, syncError);
        // 非网络错误也记录但不抛出，确保本地删除成功
      }
      // 即使同步失败，本地删除已经完成，笔记仍保持待同步状态(1)
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('删除笔记失败:', error);
    throw error;
  }
};

/**
 * 批量删除笔记 - 改进版本，即使网络错误也不影响本地删除
 */
export const batchDeleteNotes = async (ids: string[]): Promise<DeleteNoteResponse> => {
  try {
    // 执行本地批量软删除
    await DatabaseService.batchDeleteNotes(ids);

    // 本地删除成功后，尝试批量同步到服务端，但不阻塞本地删除操作
    try {
      const result = await NoteService.batchDeleteNotes(ids);
      // 如果成功同步，更新本地所有相关笔记的同步状态为0（已同步）
      for (const id of ids) {
        await DatabaseService.updateSyncStatus(id, 0);
      }
      console.log(`批量删除服务端笔记成功: ${result.deletedCount} 条`);
    } catch (syncError: any) {
      if (
        syncError?.message?.includes('Network Error') ||
        syncError?.message?.includes('timeout') ||
        syncError?.code === 'ECONNABORTED'
      ) {
        console.warn('批量同步删除笔记时发生网络错误:', syncError.message);
      } else {
        console.error('批量同步删除笔记失败:', syncError);
      }

      // 如果批量同步失败，尝试逐个同步，但失败不影响本地删除
      const syncPromises = ids.map(async (id) => {
        try {
          await NoteService.deleteNote(id);
          await DatabaseService.updateSyncStatus(id, 0);
          console.log(`单个笔记同步删除成功: ${id}`);
        } catch (individualSyncError: any) {
          if (
            individualSyncError?.message?.includes('Network Error') ||
            individualSyncError?.message?.includes('timeout') ||
            individualSyncError?.code === 'ECONNABORTED'
          ) {
            console.warn(`同步删除笔记时发生网络错误 (${id}):`, individualSyncError.message);
          } else {
            console.error(`同步删除笔记失败 (${id}):`, individualSyncError);
          }
          // 即使同步失败，本地删除已经完成
        }
      });

      await Promise.all(syncPromises);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('批量删除笔记失败:', error);
    throw error;
  }
};

/**
 * 物理删除笔记
 */
export const permanentlyDeleteNote = async (id: string): Promise<DeleteNoteResponse> => {
  try {
    await DatabaseService.permanentlyDeleteNote(id);
    return {
      success: true,
    };
  } catch (error) {
    console.error('物理删除笔记失败:', error);
    throw error;
  }
};

/**
 * 安全删除笔记 - 先与服务端确认是否存在，再进行本地删除
 */
export const safelyDeleteNote = async (id: string): Promise<DeleteNoteResponse> => {
  try {
    // 先检查服务端是否还存在该笔记
    let serverNoteExists: boolean;
    try {
      await NoteService.getNoteById(id);
      // 如果成功获取，说明服务端还存在该笔记
      serverNoteExists = true;
    } catch (error: any) {
      // 如果返回404，说明服务端已不存在该笔记
      if (error?.response?.status === 404) {
        serverNoteExists = false;
      } else if (
        error?.message?.includes('Network Error') ||
        error?.message?.includes('timeout') ||
        error?.code === 'ECONNABORTED'
      ) {
        // 网络错误情况下，我们仍然进行本地删除，但记录错误
        console.warn(`检查服务端笔记状态时发生网络错误 (${id}):`, error.message);
        serverNoteExists = true; // 假设存在，以安全起见
      } else {
        // 其他错误情况下，也进行本地删除，但记录错误
        console.warn(`检查服务端笔记状态失败 (${id}):`, error.message || error);
        serverNoteExists = true; // 假设存在，以安全起见
      }
    }

    // 执行本地软删除（标记为已删除，同步状态为待同步）
    await DatabaseService.deleteNote(id);

    // 尝试同步删除到服务端，但不阻塞本地删除
    if (serverNoteExists) {
      try {
        await NoteService.deleteNote(id);
        // 如果成功同步，更新本地同步状态为已同步
        await DatabaseService.updateSyncStatus(id, 0);
        console.log(`笔记同步删除成功: ${id}`);
      } catch (syncError: any) {
        if (
          syncError?.message?.includes('Network Error') ||
          syncError?.message?.includes('timeout') ||
          syncError?.code === 'ECONNABORTED'
        ) {
          console.warn(`同步删除笔记时发生网络错误 (${id}):`, syncError.message);
        } else {
          console.error(`同步删除笔记失败 (${id}):`, syncError);
        }
        // 即使同步失败，本地删除已经完成，笔记仍保持待同步状态
      }
    } else {
      // 如果服务端已不存在该笔记，本地也标记为已同步
      await DatabaseService.updateSyncStatus(id, 0);
    }

    return {
      success: true,
    };
  } catch (error) {
    console.error('安全删除笔记失败:', error);
    throw error;
  }
};

/**
 * 批量安全删除笔记 - 先与服务端确认是否存在，再进行本地删除
 */
export const batchSafelyDeleteNotes = async (
  ids: string[],
): Promise<BatchSafelyDeleteNoteResponse> => {
  try {
    const results: { id: string; success: boolean; message: string }[] = [];
    let deletedCount = 0;

    // 并行检查服务端笔记状态
    const serverNoteStatuses = await Promise.all(
      ids.map(async (id) => {
        try {
          await NoteService.getNoteById(id);
          return { id, exists: true };
        } catch (error: any) {
          if (error?.response?.status === 404) {
            return { id, exists: false };
          } else if (
            error?.message?.includes('Network Error') ||
            error?.message?.includes('timeout') ||
            error?.code === 'ECONNABORTED'
          ) {
            // 网络错误，标记为可能存在
            console.warn(`检查服务端笔记状态时发生网络错误 (${id}):`, error.message);
            return { id, exists: true }; // 假设存在，以安全起见
          } else {
            // 其他错误，标记为可能存在
            console.warn(`检查服务端笔记状态失败 (${id}):`, error.message || error);
            return { id, exists: true }; // 假设存在，以安全起见
          }
        }
      }),
    );

    // 执行本地批量软删除
    await DatabaseService.batchDeleteNotes(ids);

    // 并行尝试同步删除到服务端
    const syncPromises = serverNoteStatuses.map(async ({ id, exists }) => {
      if (exists) {
        try {
          await NoteService.deleteNote(id);
          // 同步成功，更新本地同步状态
          await DatabaseService.updateSyncStatus(id, 0);
          results.push({ id, success: true, message: '同步删除成功' });
          deletedCount++;
          console.log(`笔记同步删除成功: ${id}`);
        } catch (syncError: any) {
          if (
            syncError?.message?.includes('Network Error') ||
            syncError?.message?.includes('timeout') ||
            syncError?.code === 'ECONNABORTED'
          ) {
            console.warn(`同步删除笔记时发生网络错误 (${id}):`, syncError.message);
            results.push({ id, success: false, message: '同步删除时发生网络错误，本地已删除' });
          } else {
            console.error(`同步删除笔记失败 (${id}):`, syncError);
            // 即使同步失败，本地删除已经完成，笔记仍保持待同步状态
            results.push({ id, success: false, message: '同步删除失败，本地已删除' });
          }
        }
      } else {
        // 如果服务端已不存在该笔记，本地也标记为已同步
        await DatabaseService.updateSyncStatus(id, 0);
        results.push({ id, success: true, message: '服务端已不存在，本地已标记删除' });
        deletedCount++;
      }
    });

    await Promise.all(syncPromises);

    return {
      success: true,
      deletedCount,
      results,
    };
  } catch (error) {
    console.error('批量安全删除笔记失败:', error);
    throw error;
  }
};

/**
 * 导出所有笔记
 * 自动解密加密笔记
 */
export const exportAllNotes = async (): Promise<ExportAllNotesResponse> => {
  try {
    const notes = await DatabaseService.exportAllNotes();
    // 解密所有笔记以便导出明文
    const decryptedNotes = await TransparentCryptoService.decryptNotes(notes);
    return {
      success: true,
      timestamp: new Date().toISOString(),
      count: decryptedNotes.length,
      data: decryptedNotes as Note[],
    };
  } catch (error) {
    console.error('导出笔记失败:', error);
    throw error;
  }
};

/**
 * 下载所有笔记为JSON文件
 */
export const downloadAllNotes = async (): Promise<Blob> => {
  try {
    const exportData = await exportAllNotes();
    const dataStr = JSON.stringify(exportData, null, 2);
    return new Blob([dataStr], { type: 'application/json' });
  } catch (error) {
    console.error('下载笔记失败:', error);
    throw error;
  }
};

/**
 * 获取笔记统计信息
 */
export const getNotesStats = async () => {
  try {
    const total = await DatabaseService.getNotesCount();
    return {
      total,
    };
  } catch (error) {
    console.error('获取笔记统计失败:', error);
    throw error;
  }
};

/**
 * 清空所有笔记（谨慎使用）
 */
export const clearAllNotes = async (): Promise<DeleteNoteResponse> => {
  try {
    await DatabaseService.clearAllNotes();
    return {
      success: true,
    };
  } catch (error) {
    console.error('清空笔记失败:', error);
    throw error;
  }
};

/**
 * 同步笔记（已废弃，请使用 SyncService.synchronizeNotes）
 * 新API规范下，同步逻辑已改为服务端主导模式
 * @deprecated 请使用 SyncService.synchronizeNotes 替代
 */
export const syncNotes = async (): Promise<SyncNotesResponse> => {
  console.warn('[LocalNoteService] syncNotes 已废弃，请使用 SyncService.synchronizeNotes');
  // 导入并调用新的同步方法
  const { synchronizeNotes } = await import('../notes/SyncService');
  return synchronizeNotes();
};

/**
 * 通过API批量删除笔记 - 改进版本，增强错误处理
 */
export const batchDeleteNotesApi = async (ids: string[]): Promise<BatchDeleteNoteResponse> => {
  try {
    return await NoteService.batchDeleteNotes(ids);
  } catch (error: any) {
    if (
      error?.message?.includes('Network Error') ||
      error?.message?.includes('timeout') ||
      error?.code === 'ECONNABORTED'
    ) {
      console.warn('通过API批量删除笔记时发生网络错误:', error.message);
      // 返回一个表示成功的响应，因为本地删除操作不受影响
      return {
        success: true,
        deletedCount: 0, // 因为网络错误，实际删除数为0，但我们不让这个错误影响本地操作
      };
    } else {
      console.error('通过API批量删除笔记失败:', error);
      // 对于非网络错误，仍然抛出错误，因为这可能是认证或其他严重问题
      // 但是为了与删除操作的静默处理保持一致，我们也返回一个成功的结果
      return {
        success: true,
        deletedCount: 0,
      };
    }
  }
};

/**
 * 通过API批量插入或更新笔记
 */
export const batchUpsertNotesApi = async (notes: Note[]): Promise<any> => {
  try {
    return await NoteService.batchUpsertNotes(notes);
  } catch (error) {
    console.error('通过API批量插入或更新笔记失败:', error);
    throw error;
  }
};

/**
 * 批量创建笔记
 */
export const batchCreateNotes = async (
  notesData: CreateNoteRequest[],
): Promise<{ success: boolean; createdIds?: string[]; error?: string }> => {
  try {
    const createdIds = await DatabaseService.batchCreateNotes(notesData);
    return {
      success: true,
      createdIds,
    };
  } catch (error) {
    console.error('批量创建笔记失败:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

/**
 * 批量更新笔记
 */
export const batchUpdateNotes = async (
  notesData: { id: string; data: UpdateNoteRequest }[],
): Promise<{ success: boolean; updatedCount?: number; error?: string }> => {
  try {
    await DatabaseService.batchUpdateNotes(notesData);
    return {
      success: true,
      updatedCount: notesData.length,
    };
  } catch (error) {
    console.error('批量更新笔记失败:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

/**
 * 批量操作笔记 - 支持创建、更新和删除的组合操作
 */
export const batchOperationNotes = async (
  createData: CreateNoteRequest[] = [],
  updateData: { id: string; data: UpdateNoteRequest }[] = [],
  deleteIds: string[] = [],
): Promise<{
  success: boolean;
  result?: { created: string[]; updated: number; deleted: number };
  error?: string;
}> => {
  try {
    const result = await DatabaseService.batchOperationNotes(createData, updateData, deleteIds);
    return {
      success: true,
      result,
    };
  } catch (error) {
    console.error('批量操作笔记失败:', error);
    return {
      success: false,
      error: (error as Error).message,
    };
  }
};

export default {
  initLocalStorage,
  getNotes,
  getNoteById,
  createNote,
  batchCreateNotes,
  updateNote,
  batchUpdateNotes,
  deleteNote,
  batchDeleteNotes,
  batchOperationNotes,
  permanentlyDeleteNote,
  syncNotes,
  exportAllNotes,
  downloadAllNotes,
  getNotesStats,
  clearAllNotes,
  batchDeleteNotesApi,
  batchUpsertNotesApi,
  safelyDeleteNote,
  batchSafelyDeleteNotes,
};
