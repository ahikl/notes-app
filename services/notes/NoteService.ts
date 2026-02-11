import {
  BatchDeleteNoteRequest,
  BatchDeleteNoteResponse,
  BatchOperationNoteRequest,
  BatchOperationNoteResponse,
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteResponse,
  ExportAllNotesResponse,
  GetNotesQuery,
  Note,
  PaginatedResponse,
  SyncDeletionsRequest,
  SyncDeletionsResponse,
  SyncFullDataRequest,
  SyncFullDataResponse,
  SyncIncrementalRequest,
  SyncIncrementalResponse,
  SyncNewNotesRequest,
  SyncNewNotesResponse,
  SyncNotesRequest,
  SyncNotesResponse,
  SyncRestoreRequest,
  SyncRestoreResponse,
  // 细粒度同步类型
  SyncStatusRequest,
  SyncStatusResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
} from '@/types/notes/NoteTypes';
import { api } from '../api/ApiClient';

// 笔记服务模块

export const exportAllNotes = (): Promise<ExportAllNotesResponse> =>
  api.get<ExportAllNotesResponse>('/notes/export/all').then((res) => res.data);

export const downloadAllNotes = (): Promise<Blob> =>
  api
    .get<Blob>('/notes/export/all', {
      responseType: 'blob',
    })
    .then((res) => res.data);

export const getNotes = async (query?: GetNotesQuery) => {
  const params: Record<string, any> = {
    page: query?.page || 1,
    limit: query?.limit || 20,
  };

  if (query?.search) {
    params.search = query.search;
  }

  const res = await api.get<PaginatedResponse<Note>>('/notes', { params });
  return res.data;
};

export const getNoteById = (id: string) => api.get<Note>(`/notes/${id}`).then((res) => res.data);

export const createNote = (data: CreateNoteRequest) =>
  api.post<CreateNoteResponse>('/notes', data).then((res) => res.data);

export const updateNote = (id: string, data: UpdateNoteRequest) =>
  api.patch<UpdateNoteResponse>(`/notes/${id}`, data).then((res) => res.data);

export const deleteNote = (id: string) =>
  api.delete<DeleteNoteResponse>(`/notes/${id}`).then((res) => res.data);

export const batchDeleteNotes = async (ids: string[]) => {
  const data: BatchDeleteNoteRequest = { ids };
  const res = await api.delete<BatchDeleteNoteResponse>('/notes/batch', { data });
  return res.data;
};

export const batchUpsertNotes = async (notes: Note[]) => {
  const data: BatchOperationNoteRequest = { notes };
  const res = await api.post<BatchOperationNoteResponse>('/notes/batch', data);
  return res.data;
};

export const syncNotes = (data: SyncNotesRequest) =>
  api.post<SyncNotesResponse>('/notes/sync', data).then((res) => res.data);

// ========== 细粒度同步API ==========

/**
 * 查询同步状态差异
 * 用于评估同步需求和数据差异统计
 */
export const getSyncStatus = (data: SyncStatusRequest) =>
  api.post<SyncStatusResponse>('/notes/sync/status', data).then((res) => res.data);

/**
 * 获取增量更新
 * 获取指定时间戳之后有更新的笔记
 */
export const getSyncIncremental = (data: SyncIncrementalRequest) =>
  api.post<SyncIncrementalResponse>('/notes/sync/incremental', data).then((res) => res.data);

/**
 * 获取新增笔记ID列表
 * 获取服务端有但客户端没有的笔记ID
 */
export const getSyncNewNotes = (data: SyncNewNotesRequest) =>
  api.post<SyncNewNotesResponse>('/notes/sync/new', data).then((res) => res.data);

/**
 * 批量获取完整笔记数据
 * 根据ID列表获取笔记的完整数据
 */
export const getSyncFullData = (data: SyncFullDataRequest) =>
  api.post<SyncFullDataResponse>('/notes/sync/full-data', data).then((res) => res.data);

/**
 * 获取需要删除的笔记列表
 * 获取服务端已删除但客户端未删除的笔记
 */
export const getSyncDeletions = (data: SyncDeletionsRequest) =>
  api.post<SyncDeletionsResponse>('/notes/sync/deletions', data).then((res) => res.data);

/**
 * 获取需要恢复的笔记ID列表
 * 获取客户端已删除但服务端未删除的笔记
 */
export const getSyncRestore = (data: SyncRestoreRequest) =>
  api.post<SyncRestoreResponse>('/notes/sync/restore', data).then((res) => res.data);

export default {
  exportAllNotes,
  downloadAllNotes,
  getNotes,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  batchDeleteNotes,
  batchUpsertNotes,
  syncNotes,
  // 细粒度同步API
  getSyncStatus,
  getSyncIncremental,
  getSyncNewNotes,
  getSyncFullData,
  getSyncDeletions,
  getSyncRestore,
};
