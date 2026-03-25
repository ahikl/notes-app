import { AppError } from './AppError';
import { ErrorCode } from './ErrorConstants';

/**
 * 带有错误代码的错误接口
 * Node.js 系统错误和某些库的错误包含此属性
 */
interface ErrorWithCode extends Error {
  code?: string;
}

/**
 * 类型守卫：检查错误是否包含 code 属性
 */
const hasErrorCode = (error: Error): error is ErrorWithCode => {
  return 'code' in error;
};

/**
 * 网络错误判断工具函数
 * 统一网络错误检测逻辑，避免代码重复
 */
export const isNetworkError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.isNetworkError();
  }

  if (error instanceof Error) {
    const message = error.message?.toLowerCase() || '';
    if (hasErrorCode(error)) {
      const code = error.code;
      return (
        message.includes('network error') ||
        message.includes('timeout') ||
        message.includes('网络错误') ||
        message.includes('网络不可用') ||
        code === 'ECONNABORTED' ||
        code === 'ECONNREFUSED' ||
        code === 'ETIMEDOUT'
      );
    }
    return (
      message.includes('network error') ||
      message.includes('timeout') ||
      message.includes('网络错误') ||
      message.includes('网络不可用')
    );
  }

  return false;
};

/**
 * 判断是否为超时错误
 */
export const isTimeoutError = (error: unknown): boolean => {
  if (error instanceof AppError) {
    return error.code === ErrorCode.TIMEOUT;
  }

  if (error instanceof Error) {
    if (hasErrorCode(error) && error.code === 'ETIMEDOUT') {
      return true;
    }
    return error.message?.includes('timeout');
  }

  return false;
};

/**
 * 判断错误是否需要显示给用户
 * 超时错误通常不需要弹窗提示，只显示 Toast
 */
export const shouldShowErrorDialog = (error: unknown): boolean => {
  // 网络错误和超时错误通常只显示 Toast，不弹窗
  if (isNetworkError(error) || isTimeoutError(error)) {
    return false;
  }

  // API 授权错误需要弹窗
  if (error instanceof AppError && error.code === ErrorCode.API_UNAUTHORIZED) {
    return true;
  }

  return true;
};

/**
 * 获取错误消息用于 Toast 显示
 */
export const getToastErrorMessage = (error: unknown): string | null => {
  if (isNetworkError(error)) {
    return '网络错误，请检查连接';
  }

  if (isTimeoutError(error)) {
    return '请求超时，请重试';
  }

  // 对于其他错误，返回 null 让调用者决定
  return null;
};

/**
 * 判断错误是否可以静默处理（不显示给用户）
 * 某些删除操作中，网络错误可以静默处理
 */
export const canSilentlyHandle = (error: unknown): boolean => {
  return isNetworkError(error) || isTimeoutError(error);
};
