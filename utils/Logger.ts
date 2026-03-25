import { AppError } from './errors/AppError';
import { ErrorLevel } from './errors/ErrorConstants';

/**
 * 日志级别配置
 */
const LOG_LEVEL_CONFIG: Record<ErrorLevel, number> = {
  [ErrorLevel.DEBUG]: 0,
  [ErrorLevel.INFO]: 1,
  [ErrorLevel.WARN]: 2,
  [ErrorLevel.ERROR]: 3,
  [ErrorLevel.FATAL]: 4,
};

/**
 * 日志级别名称
 */
const LOG_LEVEL_NAMES: Record<ErrorLevel, string> = {
  [ErrorLevel.DEBUG]: 'DEBUG',
  [ErrorLevel.INFO]: 'INFO',
  [ErrorLevel.WARN]: 'WARN',
  [ErrorLevel.ERROR]: 'ERROR',
  [ErrorLevel.FATAL]: 'FATAL',
};

/**
 * 当前日志级别
 * 可通过环境变量动态调整
 * EXPO_PUBLIC_LOG_LEVEL=debug|info|warn|error|fatal
 */
let CURRENT_LOG_LEVEL = ErrorLevel.INFO;

/**
 * 设置日志级别
 */
export const setLogLevel = (level: ErrorLevel): void => {
  CURRENT_LOG_LEVEL = level;
};

/**
 * 从环境变量初始化日志级别
 */
const initializeLogLevel = (): void => {
  const envLevel = process.env.EXPO_PUBLIC_LOG_LEVEL as string;
  if (envLevel) {
    const upperLevel = envLevel.toUpperCase() as ErrorLevel;
    if (upperLevel in ErrorLevel) {
      CURRENT_LOG_LEVEL = upperLevel;
    }
  }
};

/**
 * 日志前缀，便于过滤
 */
const LOG_PREFIX = '[NotesApp]';

/**
 * 格式化时间戳
 */
const formatTimestamp = (): string => {
  const now = new Date();
  return now.toISOString();
};

/**
 * 格式化日志消息
 */
const formatLogMessage = (
  level: ErrorLevel,
  message: string,
  context?: Record<string, any>,
): string => {
  const timestamp = formatTimestamp();
  const levelName = LOG_LEVEL_NAMES[level];
  const contextStr = context ? ` | ${JSON.stringify(context)}` : '';

  return `${timestamp} | ${LOG_PREFIX} | ${levelName}${contextStr} | ${message}`;
};

/**
 * 日志输出函数
 */
const log = (
  level: ErrorLevel,
  message: string,
  error?: unknown,
  context?: Record<string, any>,
): void => {
  // 检查是否应该输出此级别
  if (LOG_LEVEL_CONFIG[level] < LOG_LEVEL_CONFIG[CURRENT_LOG_LEVEL]) {
    return;
  }

  const formattedMessage = formatLogMessage(level, message, context);

  switch (level) {
    case ErrorLevel.DEBUG:
      console.debug(formattedMessage);
      if (error) {
        console.debug(formattedMessage, error);
      }
      break;
    case ErrorLevel.INFO:
      console.info(formattedMessage);
      if (error) {
        console.info(formattedMessage, error);
      }
      break;
    case ErrorLevel.WARN:
      console.warn(formattedMessage);
      if (error) {
        console.warn(formattedMessage, error);
      }
      break;
    case ErrorLevel.ERROR:
      console.error(formattedMessage);
      if (error) {
        console.error(formattedMessage, error);
      }
      break;
    case ErrorLevel.FATAL:
      console.error(formattedMessage);
      if (error) {
        console.error(formattedMessage, error);
      }
      break;
  }
};

/**
 * DEBUG 级别日志
 */
export const debug = (message: string, error?: unknown, context?: Record<string, any>): void => {
  log(ErrorLevel.DEBUG, message, error, context);
};

/**
 * INFO 级别日志
 */
export const info = (message: string, error?: unknown, context?: Record<string, any>): void => {
  log(ErrorLevel.INFO, message, error, context);
};

/**
 * WARN 级别日志
 */
export const warn = (message: string, error?: unknown, context?: Record<string, any>): void => {
  log(ErrorLevel.WARN, message, error, context);
};

/**
 * ERROR 级别日志
 */
export const error = (message: string, err?: unknown, context?: Record<string, any>): void => {
  log(ErrorLevel.ERROR, message, err, context);
};

/**
 * FATAL 级别日志
 */
export const fatal = (message: string, err?: unknown, context?: Record<string, any>): void => {
  log(ErrorLevel.FATAL, message, err, context);
};

/**
 * 记录错误（自动根据错误级别选择日志级别）
 */
export const logError = (err: unknown, message?: string, context?: Record<string, any>): void => {
  let errorObj = err;

  if (err instanceof AppError) {
    // 如果是 AppError，使用其级别
    log(err.level, message || err.message, err, context);
  } else if (err instanceof Error) {
    // 普通 Error 默认为 ERROR 级别
    log(ErrorLevel.ERROR, message || err.message, err, context);
  } else {
    // 其他类型，转为字符串后记录
    const errorMessage = message || String(err);
    errorObj = new Error(errorMessage);
    log(ErrorLevel.ERROR, errorMessage, errorObj, context);
  }
};

/**
 * 初始化日志系统
 */
const initLogger = (): void => {
  initializeLogLevel();
  info('Logger initialized', undefined, { level: CURRENT_LOG_LEVEL });
};

export default {
  debug,
  info,
  warn,
  error,
  fatal,
  logError,
  setLogLevel,
  initLogger,
};
