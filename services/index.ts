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
} from './notes/NoteService';

// 笔记服务对象
export { default as noteService } from './notes/NoteService';

// 同步服务模块
export { default as syncService, synchronizeNotes, uploadNotesForSync } from './notes/SyncService';

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
} from '../types/notes/NoteTypes';

// 加密类型定义
export type {
  EncryptionKey,
  EncryptedData,
  CryptoConfig,
  EncryptionOptions,
} from '../types/crypto/CryptoTypes';

// 本地存储服务
export {
  initLocalStorage,
  getNotes as getLocalNotes,
  getNoteById as getLocalNoteById,
  createNote as createLocalNote,
  updateNote as updateLocalNote,
  deleteNote as deleteLocalNote,
  exportAllNotes as exportLocalNotes,
  downloadAllNotes as downloadLocalNotes,
  getNotesStats,
  clearAllNotes as clearLocalNotes,
} from './local/LocalNoteService';

// 数据库服务
export {
  initDatabase,
  getAllNotes,
  getNoteById as getDbNoteById,
  searchNotes,
  createNote as createDbNote,
  updateNote as updateDbNote,
  deleteNote as deleteDbNote,
  exportAllNotes as exportDbNotes,
  clearAllNotes as clearDbNotes,
  getNotesCount,
  closeDatabase,
} from './database/DatabaseService';
