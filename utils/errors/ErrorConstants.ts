/**
 * 错误代码常量定义
 * 统一的错误码系统，便于错误追踪和处理
 */
export enum ErrorCode {
  // 通用错误
  _UNKNOWN = 'UNKNOWN',
  NETWORK_ERROR = 'NETWORK_ERROR',
  TIMEOUT = 'TIMEOUT',
  VALIDATION_FAILED = 'VALIDATION_FAILED',

  // 数据库错误
  DATABASE_ERROR = 'DATABASE_ERROR',
  DATABASE_NOT_FOUND = 'DATABASE_NOT_FOUND',
  DATABASE_CONNECTION_ERROR = 'DATABASE_CONNECTION_ERROR',

  // 密钥错误
  KEY_STORAGE_FAILED = 'KEY_STORAGE_FAILED',
  KEY_RETRIEVE_FAILED = 'KEY_RETRIEVE_FAILED',
  KEY_INVALID = 'KEY_INVALID',
  KEY_NOT_FOUND = 'KEY_NOT_FOUND',

  // 加密错误
  ENCRYPTION_FAILED = 'ENCRYPTION_FAILED',
  DECRYPTION_FAILED = 'DECRYPTION_FAILED',
  ENCRYPTION_KEY_INVALID = 'ENCRYPTION_KEY_INVALID',
  INVALID_ENCRYPTED_FORMAT = 'INVALID_ENCRYPTED_FORMAT',
  INVALID_ALGORITHM = 'INVALID_ALGORITHM',
  KEY_GENERATION_FAILED = 'KEY_GENERATION_FAILED',

  // 密钥存储错误
  KEY_DELETE_FAILED = 'KEY_DELETE_FAILED',
  KEY_BACKUP_FAILED = 'KEY_BACKUP_FAILED',
  KEY_RESTORE_FAILED = 'KEY_RESTORE_FAILED',

  // 同步错误
  SYNC_FAILED = 'SYNC_FAILED',
  SYNC_NETWORK_ERROR = 'SYNC_NETWORK_ERROR',
  SYNC_CONFLICT = 'SYNC_CONFLICT',
  SYNC_SERVER_ERROR = 'SYNC_SERVER_ERROR',

  // 笔记错误
  NOTE_NOT_FOUND = 'NOTE_NOT_FOUND',
  NOTE_CREATE_FAILED = 'NOTE_CREATE_FAILED',
  NOTE_UPDATE_FAILED = 'NOTE_UPDATE_FAILED',
  NOTE_DELETE_FAILED = 'NOTE_DELETE_FAILED',

  // API 错误
  API_ERROR = 'API_ERROR',
  API_UNAUTHORIZED = 'API_UNAUTHORIZED',
  API_FORBIDDEN = 'API_FORBIDDEN',
  API_NOT_FOUND = 'API_NOT_FOUND',
  API_SERVER_ERROR = 'API_SERVER_ERROR',
}

/**
 * 错误级别
 */
export enum ErrorLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  FATAL = 'FATAL',
}

/**
 * 错误码到错误级别的映射
 */
export const ERROR_LEVEL_MAP: Record<ErrorCode, ErrorLevel> = {
  [ErrorCode._UNKNOWN]: ErrorLevel.ERROR,
  [ErrorCode.NETWORK_ERROR]: ErrorLevel.ERROR,
  [ErrorCode.TIMEOUT]: ErrorLevel.WARN,
  [ErrorCode.VALIDATION_FAILED]: ErrorLevel.WARN,
  [ErrorCode.DATABASE_ERROR]: ErrorLevel.ERROR,
  [ErrorCode.DATABASE_NOT_FOUND]: ErrorLevel.WARN,
  [ErrorCode.DATABASE_CONNECTION_ERROR]: ErrorLevel.ERROR,
  [ErrorCode.KEY_STORAGE_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.KEY_RETRIEVE_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.KEY_INVALID]: ErrorLevel.ERROR,
  [ErrorCode.KEY_NOT_FOUND]: ErrorLevel.WARN,
  [ErrorCode.ENCRYPTION_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.DECRYPTION_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.ENCRYPTION_KEY_INVALID]: ErrorLevel.ERROR,
  [ErrorCode.INVALID_ENCRYPTED_FORMAT]: ErrorLevel.ERROR,
  [ErrorCode.INVALID_ALGORITHM]: ErrorLevel.ERROR,
  [ErrorCode.KEY_GENERATION_FAILED]: ErrorLevel.ERROR,

  [ErrorCode.KEY_DELETE_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.KEY_BACKUP_FAILED]: ErrorLevel.WARN,
  [ErrorCode.KEY_RESTORE_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.SYNC_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.SYNC_NETWORK_ERROR]: ErrorLevel.ERROR,
  [ErrorCode.SYNC_CONFLICT]: ErrorLevel.WARN,
  [ErrorCode.SYNC_SERVER_ERROR]: ErrorLevel.ERROR,
  [ErrorCode.NOTE_NOT_FOUND]: ErrorLevel.WARN,
  [ErrorCode.NOTE_CREATE_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.NOTE_UPDATE_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.NOTE_DELETE_FAILED]: ErrorLevel.ERROR,
  [ErrorCode.API_ERROR]: ErrorLevel.ERROR,
  [ErrorCode.API_UNAUTHORIZED]: ErrorLevel.WARN,
  [ErrorCode.API_FORBIDDEN]: ErrorLevel.WARN,
  [ErrorCode.API_NOT_FOUND]: ErrorLevel.WARN,
  [ErrorCode.API_SERVER_ERROR]: ErrorLevel.ERROR,
};

/**
 * 用户友好的错误消息
 */
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode._UNKNOWN]: '发生了未知错误',
  [ErrorCode.NETWORK_ERROR]: '网络连接失败，请检查网络设置',
  [ErrorCode.TIMEOUT]: '请求超时，请稍后重试',
  [ErrorCode.VALIDATION_FAILED]: '输入数据验证失败',

  [ErrorCode.DATABASE_ERROR]: '数据库操作失败',
  [ErrorCode.DATABASE_NOT_FOUND]: '未找到相关数据',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: '数据库连接失败，正在重试...',

  [ErrorCode.KEY_STORAGE_FAILED]: '密钥存储失败',
  [ErrorCode.KEY_RETRIEVE_FAILED]: '密钥读取失败',
  [ErrorCode.KEY_INVALID]: '密钥格式无效',
  [ErrorCode.KEY_NOT_FOUND]: '密钥不存在',

  [ErrorCode.ENCRYPTION_FAILED]: '加密失败',
  [ErrorCode.DECRYPTION_FAILED]: '解密失败，可能是密钥不匹配',
  [ErrorCode.ENCRYPTION_KEY_INVALID]: '加密密钥无效',
  [ErrorCode.INVALID_ENCRYPTED_FORMAT]: '加密数据格式错误',
  [ErrorCode.INVALID_ALGORITHM]: '不支持的加密算法',
  [ErrorCode.KEY_GENERATION_FAILED]: '生成密钥失败',

  [ErrorCode.KEY_DELETE_FAILED]: '删除密钥失败',
  [ErrorCode.KEY_BACKUP_FAILED]: '备份密钥失败',
  [ErrorCode.KEY_RESTORE_FAILED]: '恢复密钥失败',

  [ErrorCode.SYNC_FAILED]: '同步失败，请稍后重试',
  [ErrorCode.SYNC_NETWORK_ERROR]: '同步网络错误',
  [ErrorCode.SYNC_CONFLICT]: '检测到笔记冲突，已自动合并',
  [ErrorCode.SYNC_SERVER_ERROR]: '服务器错误',

  [ErrorCode.NOTE_NOT_FOUND]: '笔记不存在',
  [ErrorCode.NOTE_CREATE_FAILED]: '创建笔记失败',
  [ErrorCode.NOTE_UPDATE_FAILED]: '更新笔记失败',
  [ErrorCode.NOTE_DELETE_FAILED]: '删除笔记失败',

  [ErrorCode.API_ERROR]: 'API请求失败',
  [ErrorCode.API_UNAUTHORIZED]: '未授权，请检查API密钥',
  [ErrorCode.API_FORBIDDEN]: '无权限访问',
  [ErrorCode.API_NOT_FOUND]: '请求的资源不存在',
  [ErrorCode.API_SERVER_ERROR]: '服务器内部错误',
};

/**
 * 错误恢复建议
 */
export const ERROR_RECOVERY_SUGGESTIONS: Record<ErrorCode, string> = {
  [ErrorCode._UNKNOWN]: '请重试操作或联系技术支持',
  [ErrorCode.NETWORK_ERROR]: '请检查网络连接或稍后重试',
  [ErrorCode.TIMEOUT]: '请稍后重试',
  [ErrorCode.VALIDATION_FAILED]: '请检查输入数据',

  [ErrorCode.DATABASE_ERROR]: '正在修复数据库问题，请稍等',
  [ErrorCode.DATABASE_NOT_FOUND]: '数据可能已被删除',
  [ErrorCode.DATABASE_CONNECTION_ERROR]: '应用将自动重连',

  [ErrorCode.KEY_STORAGE_FAILED]: '请尝试重新输入密钥',
  [ErrorCode.KEY_RETRIEVE_FAILED]: '请检查应用存储权限',
  [ErrorCode.KEY_INVALID]: '请输入有效的密钥格式',
  [ErrorCode.KEY_NOT_FOUND]: '请在设置中输入密钥',

  [ErrorCode.ENCRYPTION_FAILED]: '请检查密钥格式或稍后重试',
  [ErrorCode.DECRYPTION_FAILED]: '笔记可能使用了不同的密钥加密，无法解密',
  [ErrorCode.ENCRYPTION_KEY_INVALID]: '请重置密钥',
  [ErrorCode.INVALID_ENCRYPTED_FORMAT]: '加密数据已损坏或格式不正确',
  [ErrorCode.INVALID_ALGORITHM]: '请使用支持的加密算法',
  [ErrorCode.KEY_GENERATION_FAILED]: '请稍后重试生成密钥',

  [ErrorCode.KEY_DELETE_FAILED]: '请重试删除操作',
  [ErrorCode.KEY_BACKUP_FAILED]: '备份失败，但密钥仍安全',
  [ErrorCode.KEY_RESTORE_FAILED]: '请检查备份是否存在并重试',

  [ErrorCode.SYNC_FAILED]: '点击同步按钮重试',
  [ErrorCode.SYNC_NETWORK_ERROR]: '网络错误时自动重试同步',
  [ErrorCode.SYNC_CONFLICT]: '冲突已自动解决，请检查笔记内容',
  [ErrorCode.SYNC_SERVER_ERROR]: '请稍后重试或联系支持',

  [ErrorCode.NOTE_NOT_FOUND]: '笔记可能已被删除，请刷新列表',
  [ErrorCode.NOTE_CREATE_FAILED]: '请稍后重试',
  [ErrorCode.NOTE_UPDATE_FAILED]: '请重试编辑',
  [ErrorCode.NOTE_DELETE_FAILED]: '请重试删除',

  [ErrorCode.API_ERROR]: '请检查网络连接和服务器状态',
  [ErrorCode.API_UNAUTHORIZED]: '请在设置中更新API密钥',
  [ErrorCode.API_FORBIDDEN]: '您没有权限执行此操作',
  [ErrorCode.API_NOT_FOUND]: '资源不存在',
  [ErrorCode.API_SERVER_ERROR]: '服务器暂时不可用，请稍后重试',
};
