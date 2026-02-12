/* eslint-disable no-undef */
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 完全禁用Web平台
config.resolver.platforms = ['ios', 'android'];

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
