// 笔记类型定义
export interface Note {
  id: string;
  title: string;
  content: string;
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

// API错误响应类型
export interface ErrorResponse {
  error: string;
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
