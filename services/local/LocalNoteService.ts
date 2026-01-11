import {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteResponse,
  ExportAllNotesResponse,
  GetNotesQuery,
  Note,
  PaginatedResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
} from '@/types/notes/NoteTypes';
import * as DatabaseService from '../database/DatabaseService';

/**
 * 初始化本地存储服务
 */
export const initLocalStorage = async (): Promise<void> => {
  try {
    await DatabaseService.initDatabase();
    console.log('本地存储服务初始化成功');
  } catch (error) {
    console.error('本地存储服务初始化失败:', error);
    throw error;
  }
};

/**
 * 获取笔记列表（支持分页和搜索）
 */
export const getNotes = async (query?: GetNotesQuery): Promise<PaginatedResponse<Note>> => {
  try {
    let notes: Note[] = [];

    // 如果有搜索条件，执行搜索
    if (query?.search) {
      notes = await DatabaseService.searchNotes(query.search);
    } else {
      // 否则获取所有笔记
      notes = await DatabaseService.getAllNotes();
    }

    // 处理分页
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;

    const paginatedNotes = notes.slice(startIndex, endIndex);

    return {
      total: notes.length,
      data: paginatedNotes,
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
 */
export const getNoteById = async (id: string): Promise<Note> => {
  try {
    const note = await DatabaseService.getNoteById(id);
    if (!note) {
      throw new Error(`笔记不存在: ${id}`);
    }
    return note;
  } catch (error) {
    console.error('获取笔记失败:', error);
    throw error;
  }
};

/**
 * 创建笔记
 */
export const createNote = async (data: CreateNoteRequest): Promise<CreateNoteResponse> => {
  try {
    const id = await DatabaseService.createNote(data);
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
 */
export const updateNote = async (
  id: string,
  data: UpdateNoteRequest,
): Promise<UpdateNoteResponse> => {
  try {
    await DatabaseService.updateNote(id, data);
    return {
      success: true,
    };
  } catch (error) {
    console.error('更新笔记失败:', error);
    throw error;
  }
};

/**
 * 删除笔记
 */
export const deleteNote = async (id: string): Promise<DeleteNoteResponse> => {
  try {
    await DatabaseService.deleteNote(id);
    return {
      success: true,
    };
  } catch (error) {
    console.error('删除笔记失败:', error);
    throw error;
  }
};

/**
 * 导出所有笔记
 */
export const exportAllNotes = async (): Promise<ExportAllNotesResponse> => {
  try {
    const notes = await DatabaseService.exportAllNotes();
    return {
      success: true,
      timestamp: new Date().toISOString(),
      count: notes.length,
      data: notes,
    };
  } catch (error) {
    console.error('导出笔记失败:', error);
    throw error;
  }
};

/**
 * 下载所有笔记为Blob（用于文件导出）
 */
export const downloadAllNotes = async (): Promise<Blob> => {
  try {
    const exportResult = await exportAllNotes();
    const jsonStr = JSON.stringify(exportResult, null, 2);
    return new Blob([jsonStr], { type: 'application/json' });
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

export default {
  initLocalStorage,
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  exportAllNotes,
  downloadAllNotes,
  getNotesStats,
  clearAllNotes,
};
