import axios from 'axios';
import { getApiKeyWithFallback, getApiUrl } from '@/utils/auth/AuthUtils';
import { handleDeleteError } from '@/utils/ErrorHandler';

// API客户端配置
export const api = axios.create({
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 路径清洗函数
const cleanBaseUrl = (url: string): string => url.replace(/\/$/, '');

// 请求拦截器 - 动态设置baseURL和Authorization头
api.interceptors.request.use(
  async (config) => {
    // 异步获取并设置baseURL
    const baseUrl = await getApiUrl();
    if (baseUrl) {
      // 使用路径清洗函数处理斜杠，使用用户提供的完整API URL
      config.baseURL = cleanBaseUrl(baseUrl);
    }

    // 从环境变量或安全存储中获取API密钥
    const apiKey = await getApiKeyWithFallback();

    if (apiKey) {
      config.headers.Authorization = `Bearer ${apiKey}`;
    } else {
      console.warn('未授权访问，请检查API密钥');
    }

    return config;
  },
  (error) => {
    console.error('请求拦截器错误:', error);
    return Promise.reject(error);
  },
);

// 错误状态码处理器
const STATUS_HANDLERS: { [key: number]: () => void } = {
  401: () => console.error('未授权访问，请检查API密钥'),
  403: () => console.error('访问被拒绝'),
  404: () => console.log('请求的资源不存在'), // 改为log而不是error，因为404可能是正常的（比如删除已不存在的资源）
  500: () => console.error('服务器内部错误'),
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.config &&
      /\/notes(?:\/[^\/]+)?$/.test(error.config.url) &&
      error.config.method?.toLowerCase() === 'delete'
    ) {
      handleDeleteError(error, error.config);
    } else {
      if (
        error.code === 'ECONNABORTED' ||
        error.message?.includes('Network Error') ||
        error.message?.includes('timeout')
      ) {
        // 网络错误或超时，不打印完整错误对象，只记录简短信息
        console.error('API网络错误或超时:', error.message || 'Network Error');
      } else if (error.response) {
        const { status, config } = error.response;

        const handler = STATUS_HANDLERS[status];
        if (handler) {
          handler();
        } else {
          console.error(`请求失败 (${config?.method?.toUpperCase()} ${config?.url}): ${status}`);
        }
      } else {
        // 其他类型的错误，包括网络错误
        if (error.message?.includes('Network Error') || !error.response) {
          console.error('API网络错误:', error.message || 'Network Error');
        } else {
          console.error('API响应错误:', error.message || error);
        }
      }
    }

    return Promise.reject(error);
  },
);

export default api;
