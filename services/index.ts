// 服务层统一导出入口
// 按功能模块组织导出

// API客户端配置
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

// 加密服务模块
export { CryptoService } from './crypto/CryptoService';

// 加密笔记服务模块
export { EncryptedNoteService } from './crypto/EncryptedNoteService';

// 认证工具模块
export {
  getApiKey,
  getApiKeyWithFallback,
  getBaseUrl,
  isValidApiKey,
  isValidBaseUrl,
  removeApiKey,
  removeBaseUrl,
  saveApiKey,
  saveBaseUrl,
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
