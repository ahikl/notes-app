// 笔记类型定义
export interface Note {
  id: string;
  title: string;
  content: string;
  is_encrypted: number;
  sync_status: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

// 分页响应类型定义
export interface PaginatedResponse<T> {
  total: number;
  data: T[];
  page: number;
  limit: number;
}

// 导出所有笔记的响应类型
export interface ExportAllNotesResponse {
  success: boolean;
  timestamp: string;
  count: number;
  data: Note[];
}

// 创建笔记响应类型
export interface CreateNoteResponse {
  success: boolean;
  id: string;
}

// 更新笔记响应类型
export interface UpdateNoteResponse {
  success: boolean;
}

// 删除笔记响应类型
export interface DeleteNoteResponse {
  success: boolean;
}

// 批量删除笔记响应类型
export interface BatchDeleteNoteResponse {
  success: boolean;
  deletedCount: number;
}

// 批量安全删除笔记响应类型
export interface BatchSafelyDeleteNoteResponse {
  success: boolean;
  deletedCount: number;
  results: { id: string; success: boolean; message: string }[];
}

// 批量操作笔记请求类型
export interface BatchOperationNoteRequest {
  notes: Note[];
}

// 批量操作笔记响应类型
export interface BatchOperationNoteResponse {
  success: boolean;
  insertedUpdatedCount: number;
}

// 批量删除笔记请求类型
export interface BatchDeleteNoteRequest {
  ids: string[];
}

// 创建笔记请求参数类型
export interface CreateNoteRequest {
  title: string;
  content: string;
  is_encrypted?: number;
  created_at: string;
  updated_at: string;
}

// 更新笔记请求参数类型
export interface UpdateNoteRequest {
  title?: string;
  content?: string;
  is_encrypted: number;
  updated_at: string;
}

// 获取笔记列表的查询参数类型
export interface GetNotesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// 同步笔记请求参数类型
export interface SyncNotesRequest {
  clientNotes: Note[];
}

// 同步笔记响应类型
export interface SyncNotesResponse {
  success: boolean;
  updates: Note[];
  syncedIds: string[];
}
