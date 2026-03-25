import {
  ERROR_LEVEL_MAP,
  ERROR_MESSAGES,
  ERROR_RECOVERY_SUGGESTIONS,
  ErrorCode,
  ErrorLevel,
} from './ErrorConstants';

/**
 * 应用错误基类
 * 统一的错误处理系统
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly level: ErrorLevel = ErrorLevel.ERROR,
    public readonly originalError?: Error,
    public readonly context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'AppError';
    this.level = level || ERROR_LEVEL_MAP[code] || ErrorLevel.ERROR;
  }

  /**
   * 获取用户友好的错误消息
   */
  getUserMessage(): string {
    return ERROR_MESSAGES[this.code] || this.message;
  }

  /**
   * 获取错误恢复建议
   */
  getRecoverySuggestion(): string {
    return ERROR_RECOVERY_SUGGESTIONS[this.code] || '请联系技术支持';
  }

  /**
   * 判断是否为网络错误
   */
  isNetworkError(): boolean {
    return [ErrorCode.NETWORK_ERROR, ErrorCode.TIMEOUT, ErrorCode.SYNC_NETWORK_ERROR].includes(
      this.code,
    );
  }

  /**
   * 判断是否为数据库错误
   */
  isDatabaseError(): boolean {
    return [
      ErrorCode.DATABASE_ERROR,
      ErrorCode.DATABASE_NOT_FOUND,
      ErrorCode.DATABASE_CONNECTION_ERROR,
    ].includes(this.code);
  }

  /**
   * 判断是否为密钥错误
   */
  isKeyError(): boolean {
    return [
      ErrorCode.KEY_STORAGE_FAILED,
      ErrorCode.KEY_RETRIEVE_FAILED,
      ErrorCode.KEY_INVALID,
      ErrorCode.KEY_NOT_FOUND,
      ErrorCode.ENCRYPTION_KEY_INVALID,
    ].includes(this.code);
  }

  /**
   * 判断是否为同步错误
   */
  isSyncError(): boolean {
    return [
      ErrorCode.SYNC_FAILED,
      ErrorCode.SYNC_NETWORK_ERROR,
      ErrorCode.SYNC_CONFLICT,
      ErrorCode.SYNC_SERVER_ERROR,
    ].includes(this.code);
  }

  /**
   * 判断是否为 API 错误
   */
  isApiError(): boolean {
    return [
      ErrorCode.API_ERROR,
      ErrorCode.API_UNAUTHORIZED,
      ErrorCode.API_FORBIDDEN,
      ErrorCode.API_NOT_FOUND,
      ErrorCode.API_SERVER_ERROR,
    ].includes(this.code);
  }

  /**
   * 创建未知错误
   */
  static unknown(message: string, originalError?: Error): AppError {
    return new AppError(message, ErrorCode._UNKNOWN, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建网络错误
   */
  static network(message: string, originalError?: Error): AppError {
    return new AppError(message, ErrorCode.NETWORK_ERROR, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建超时错误
   */
  static timeout(message: string, originalError?: Error): AppError {
    return new AppError(message, ErrorCode.TIMEOUT, ErrorLevel.WARN, originalError);
  }

  /**
   * 创建数据库错误
   */
  static database(
    message: string,
    code: ErrorCode = ErrorCode.DATABASE_ERROR,
    originalError?: Error,
  ): AppError {
    return new AppError(message, code, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建密钥错误
   */
  static key(
    message: string,
    code: ErrorCode = ErrorCode.KEY_STORAGE_FAILED,
    originalError?: Error,
  ): AppError {
    return new AppError(message, code, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建加密错误
   */
  static encryption(
    message: string,
    code: ErrorCode = ErrorCode.ENCRYPTION_FAILED,
    originalError?: Error,
  ): AppError {
    return new AppError(message, code, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建解密错误
   */
  static decryption(
    message: string,
    code: ErrorCode = ErrorCode.DECRYPTION_FAILED,
    originalError?: Error,
  ): AppError {
    return new AppError(message, code, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建同步错误
   */
  static sync(
    message: string,
    code: ErrorCode = ErrorCode.SYNC_FAILED,
    originalError?: Error,
  ): AppError {
    return new AppError(message, code, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建笔记错误
   */
  static note(
    message: string,
    code: ErrorCode = ErrorCode.NOTE_CREATE_FAILED,
    originalError?: Error,
  ): AppError {
    return new AppError(message, code, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建 API 错误
   */
  static api(
    message: string,
    code: ErrorCode = ErrorCode.API_ERROR,
    originalError?: Error,
  ): AppError {
    return new AppError(message, code, ErrorLevel.ERROR, originalError);
  }

  /**
   * 创建未授权错误
   */
  static unauthorized(message: string, originalError?: Error): AppError {
    return new AppError(message, ErrorCode.API_UNAUTHORIZED, ErrorLevel.WARN, originalError);
  }

  /**
   * 创建未找到错误
   */
  static notFound(message: string, originalError?: Error): AppError {
    return new AppError(message, ErrorCode.API_NOT_FOUND, ErrorLevel.WARN, originalError);
  }

  /**
   * 将任意错误转换为 AppError
   */
  static fromError(error: unknown): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      return AppError.unknown(error.message, error);
    }

    return AppError.unknown(String(error));
  }
}

export default AppError;
