/* eslint-disable no-undef */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 完全禁用Web平台
config.resolver.platforms = ['ios', 'android'];

// 启用代码压缩和优化
config.transformer.minifierConfig = {
  compress: {
    // 删除console和debugger语句
    drop_console: true,
    drop_debugger: true,
    // 优化死代码
    dead_code: true,
    unused: true,
  },
  mangle: {
    // 混淆变量名
    toplevel: true,
  },
  format: {
    comments: false,
  },
};

// 拦截 lib0 对 isomorphic-webcrypto 的导入，重定向到自定义 shim
const isomorphicWebcryptoShim = path.resolve(__dirname, 'shims/isomorphic-webcrypto.js');
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'isomorphic-webcrypto' || moduleName.startsWith('isomorphic-webcrypto/')) {
    return { filePath: isomorphicWebcryptoShim, type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
