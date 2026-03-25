/**
 * 错误处理模块统一导出
 */
export { AppError } from './AppError';
export type { ErrorCode, ErrorLevel } from './ErrorConstants';

export {
  isNetworkError,
  isTimeoutError,
  shouldShowErrorDialog,
  getToastErrorMessage,
  canSilentlyHandle,
} from './ErrorHandler';
