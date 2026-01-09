import axios from 'axios';
import { getApiKeyWithFallback, getApiUrl } from '@/utils/auth/AuthUtils';

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
  404: () => console.error('请求的资源不存在'),
  500: () => console.error('服务器内部错误'),
};

api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API响应错误:', error.response || error.message);

    if (error.response) {
      const { status } = error.response;

      const handler = STATUS_HANDLERS[status];
      if (handler) {
        handler();
      } else {
        console.error(`请求失败: ${status}`);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
