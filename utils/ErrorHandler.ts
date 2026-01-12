// 网络错误类型判断
export const isNetworkError = (error: any): boolean => {
  return (
    error?.message?.includes('Network Error') ||
    error?.message?.includes('timeout') ||
    error?.code === 'ECONNABORTED' ||
    error?.code === 'NETWORK_ERROR' ||
    !error?.response
  );
};

// 判断是否为删除操作
export const isDeleteOperation = (url: string): boolean => {
  return /\/notes(?:\/[^\/]+)?$/.test(url) && (url.includes('/notes/') || url.endsWith('/notes'));
};

// 统一错误处理函数
export const handleApiError = (error: any, config?: any, silentOnDelete: boolean = false): void => {
  const isNetErr = isNetworkError(error);
  const isDelOp = config && isDeleteOperation(config.url);

  // 如果是删除操作且是网络错误，并且设置了静默处理，则只输出警告
  if (silentOnDelete && isDelOp && isNetErr) {
    console.warn(
      `删除操作网络错误 (${config?.method?.toUpperCase()} ${config?.url}):`,
      error.message || 'Network Error',
    );
    return;
  }

  // 根据错误类型进行分类处理
  if (isNetErr) {
    console.error('API网络错误或超时:', error.message || 'Network Error');
  } else if (error?.response) {
    const { status, config: errConfig } = error.response;
    console.error(
      `API请求失败 (${errConfig?.method?.toUpperCase()} ${errConfig?.url}): 状态码 ${status}`,
    );
  } else {
    console.error('API响应错误:', error.message || error);
  }
};

// 专门处理删除操作的错误
export const handleDeleteError = (error: any, config?: any): void => {
  handleApiError(error, config, true);
};
