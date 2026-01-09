const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// 定义需要拦截的 Web 冲突模块
const webInterceptors = [

  'react-native-quick-crypto',
  'react-native-get-random-values',
  'react-native-worklets',
  '@react-native-async-storage/async-storage',
];

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    // 拦截特定模块或 React Native 内部原生路径
    const shouldIntercept =
      webInterceptors.some((m) => moduleName === m || moduleName.startsWith(m + '/')) ||
      moduleName.includes('Libraries/BatchedBridge') ||
      moduleName.includes('Libraries/Renderer/shims/ReactNative') ||
      (moduleName === 'react-native' && context.originModulePath.includes('node_modules'));

    if (shouldIntercept) {
      return {
        type: 'sourceFile',
        filePath: path.join(__dirname, 'mocks', 'web-shim.js'),
      };
    }
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
