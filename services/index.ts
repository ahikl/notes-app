export { default as api, api as getApiClient } from './api/ApiClient';

// 笔记服务模块
export {
  batchDeleteNotes,
  batchUpsertNotes,
  createNote,
  deleteNote,
  downloadAllNotes,
  exportAllNotes,
  getNoteById,
  getNotes,
  syncNotes,
  updateNote,
} from './notes/NoteService';

// 笔记服务对象
export { default as noteService } from './notes/NoteService';

// 同步服务模块
export {
  SyncServiceError,
  getSyncSummary,
  isEncryptedNote,
  default as syncService,
  synchronizeEncryptedNotes,
  synchronizeNotes,
  uploadNotesForSync,
} from './notes/SyncService';

// 定时任务服务模块
export { default as schedulerService } from './scheduler/SchedulerService';

// 加密服务模块
export { CryptoService } from './crypto/CryptoService';

// 加密笔记服务模块
export {
  getApiKey,
  getApiKeyWithFallback,
  isValidApiKey,
  removeApiKey,
  saveApiKey,
} from '../utils/auth/AuthUtils';
export { EncryptedNoteService, EncryptedNoteServiceError } from './crypto/EncryptedNoteService';

// 透明加密服务模块
export {
  PlainNoteData,
  TransparentCryptoService,
  TransparentCryptoServiceError,
} from './crypto/TransparentCryptoService';

// CRDT 同步服务模块
export { NoteCRDTDocument, YjsNoteService, YjsNoteServiceError } from './crdt/YjsNoteService';

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

// 加密工具函数 - 验证和辅助函数
export {
  EncryptionUtilsError,
  isValidBase64,
  sanitizeKey,
  secureCompareKeys,
  validateEncryptedData,
  validateKeyFormat,
} from '../utils/crypto/EncryptionUtils';

// 密钥存储服务
export { KeyStorage } from '../utils/crypto/KeyStorage';

// 本地笔记服务
export {
  batchSafelyDeleteNotes,
  initLocalStorage,
  batchDeleteNotes as localBatchDeleteNotes,
  deleteNote as localDeleteNote,
  safelyDeleteNote,
} from './local/LocalNoteService';

// 类型定义
export type {
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
} from '../types/notes/NoteTypes';

// 加密类型定义
export type { EncryptedData, EncryptionKey } from '../types/crypto/CryptoTypes';
