export { default as api, api as getApiClient } from './api/ApiClient';

// 笔记服务模块
export {
  createNote,
  deleteNote,
  downloadAllNotes,
  exportAllNotes,
  getNoteById,
  getNotes,
  updateNote,
  syncNotes,
  batchDeleteNotes,
  batchUpsertNotes,
} from './notes/NoteService';

// 笔记服务对象
export { default as noteService } from './notes/NoteService';

// 同步服务模块
export { default as syncService, synchronizeNotes, uploadNotesForSync } from './notes/SyncService';

// 定时任务服务模块
export { default as schedulerService } from './scheduler/SchedulerService';

// 加密服务模块
export { CryptoService } from './crypto/CryptoService';

// 加密笔记服务模块
export { EncryptedNoteService } from './crypto/EncryptedNoteService';
export {
  getApiKey,
  getApiKeyWithFallback,
  isValidApiKey,
  removeApiKey,
  saveApiKey,
} from '../utils/auth/AuthUtils';

// 加密工具函数
export {
  decryptText,
  decryptTextWithMetadata,
  decryptTextWithStringKey,
  encryptText,
  encryptTextWithMetadata,
  encryptTextWithStringKey,
  generateEncryptionKey,
  generateEncryptionKeyWithMetadata,
  generateRandomStringKey,
} from '../utils/crypto/EncryptionUtils';

// 本地笔记服务
export {
  deleteNote as localDeleteNote,
  batchDeleteNotes as localBatchDeleteNotes,
  safelyDeleteNote,
  batchSafelyDeleteNotes,
  initLocalStorage,
} from './local/LocalNoteService';

// 类型定义
export type {
  CreateNoteRequest,
  CreateNoteResponse,
  DeleteNoteResponse,
  ExportAllNotesResponse,
  GetNotesQuery,
  Note,
  PaginatedResponse,
  UpdateNoteRequest,
  UpdateNoteResponse,
  BatchDeleteNoteRequest,
  BatchDeleteNoteResponse,
  BatchOperationNoteRequest,
  BatchOperationNoteResponse,
  SyncNotesRequest,
  SyncNotesResponse,
} from '../types/notes/NoteTypes';

// 加密类型定义
export type { EncryptionKey, EncryptedData } from '../types/crypto/CryptoTypes';
