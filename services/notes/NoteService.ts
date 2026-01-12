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
  SyncNotesRequest,
  SyncNotesResponse,
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
};
