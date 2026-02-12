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
  deleted_at?: string; // 软删除时间戳（用于保留期管理）
  created_at: string;
  updated_at: string;
}

// 同步专用的笔记类型（用于API传输）
// 包含所有加密相关的Base64编码字段
export interface SyncNote {
  id: string;
  title?: string; // 可选，删除标记时可能不包含
  content?: string; // Base64编码的加密内容，可选
  iv?: string; // Base64编码的初始化向量
  auth_tag?: string; // Base64编码的认证标签
  is_encrypted?: number;
  is_deleted?: number; // 删除状态，用于同步删除操作
  created_at?: string;
  updated_at: string; // 必需，用于时间戳比较
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
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  skippedIds: string[];
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

// 同步笔记请求参数类型（新API规范）
export interface SyncNotesRequest {
  localNoteIds: string[]; // 客户端当前拥有的所有笔记ID数组（包括已删除的）
  localDeletedNoteIds?: string[]; // 客户端标记为已删除的笔记ID数组
  lastSyncTimestamp: string; // 客户端上次同步的时间戳（ISO 8601格式）
}

// 同步笔记响应类型（新API规范）
export interface SyncNotesResponse {
  success: boolean;
  toUpdate: SyncNote[]; // 需要客户端更新的完整笔记数据列表
  toDelete: SyncNote[]; // 需要客户端删除的笔记元数据列表
  toRestore: SyncNote[]; // 需要客户端恢复的完整笔记数据列表
  serverNoteCount: number; // 服务端当前未删除的笔记总数
  syncTimestamp: string; // 本次同步时间戳
}

// ========== 细粒度同步API类型定义 ==========

// 同步状态查询请求
export interface SyncStatusRequest {
  localNoteIds: string[];
  localDeletedNoteIds: string[];
}

// 同步状态查询响应
export interface SyncStatusResponse {
  success: boolean;
  serverNoteCount: number;
  clientHasServerMissing: number;
  serverHasClientMissing: number;
  deleteStatusMismatch: number;
}

// 增量更新查询请求
export interface SyncIncrementalRequest {
  lastSyncTimestamp: string;
  localNoteIds: string[];
}

// 增量更新查询响应
export interface SyncIncrementalResponse {
  success: boolean;
  notes: SyncNote[];
  count: number;
}

// 新增笔记查询请求
export interface SyncNewNotesRequest {
  localNoteIds: string[];
}

// 新增笔记查询响应
export interface SyncNewNotesResponse {
  success: boolean;
  newNoteIds: string[];
  count: number;
}

// 完整数据获取请求
export interface SyncFullDataRequest {
  ids: string[];
}

// 完整数据获取响应
export interface SyncFullDataResponse {
  success: boolean;
  notes: SyncNote[];
  count: number;
}

// 删除同步请求
export interface SyncDeletionsRequest {
  localNoteIds: string[];
  localDeletedNoteIds: string[];
}

// 删除同步响应
export interface SyncDeletionsResponse {
  success: boolean;
  deletions: {
    id: string;
    is_deleted: number;
    updated_at: string;
  }[];
  count: number;
}

// 恢复同步请求
export interface SyncRestoreRequest {
  localNoteIds: string[];
  localDeletedNoteIds: string[];
}

// 恢复同步响应
export interface SyncRestoreResponse {
  success: boolean;
  restoreIds: string[];
  count: number;
}

// 细粒度同步结果汇总
export interface FineGrainedSyncResult {
  success: boolean;
  toUpdate: SyncNote[];
  toDelete: SyncNote[];
  toRestore: SyncNote[];
  serverNoteCount: number;
  syncTimestamp: string;
  // 统计信息
  stats: {
    incrementalUpdates: number;
    newNotes: number;
    deletions: number;
    restorations: number;
  };
}
