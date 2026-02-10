// 笔记类型定义
export interface Note {
  id: string;
  title: string;
  content: string;
  iv?: string; // 初始化向量（Base64编码，加密笔记使用）
  auth_tag?: string; // 认证标签（Base64编码，GCM模式使用）
  is_encrypted: number;
  sync_status: number;
  is_deleted: number;
  created_at: string;
  updated_at: string;
}

// 同步专用的笔记类型（用于API传输）
// 包含所有加密相关的Base64编码字段
export interface SyncNote {
  id: string;
  title: string;
  content: string; // Base64编码的加密内容
  iv?: string; // Base64编码的初始化向量
  auth_tag?: string; // Base64编码的认证标签
  is_encrypted: number;
  is_deleted?: number; // 删除状态，用于同步删除操作
  created_at: string;
  updated_at: string;
}

// 本地数据库存储的笔记类型
// 加密内容以二进制格式存储
export interface DatabaseNote {
  id: string;
  title: string;
  content: string; // 明文或密文（Base64格式）
  iv?: string; // Base64格式或二进制
  auth_tag?: string; // Base64格式或二进制
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
  is_encrypted?: number;
  updated_at?: string;
}

// 获取笔记列表的查询参数类型
export interface GetNotesQuery {
  page?: number;
  limit?: number;
  search?: string;
}

// 同步笔记请求参数类型
export interface SyncNotesRequest {
  clientNotes: SyncNote[]; // 使用SyncNote进行API传输
}

// 同步笔记响应类型
export interface SyncNotesResponse {
  success: boolean;
  updates: SyncNote[]; // 使用SyncNote进行API传输
  syncedIds: string[];
}
