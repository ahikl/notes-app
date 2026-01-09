const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'android' || platform === 'ios') {
    return context.resolveRequest(context, moduleName, platform);
  }
  if (platform === 'web') {
    const webInterceptors = [
      'react-native-reanimated',
      'react-native-worklets',
      'react-native-quick-crypto',
      'react-native-get-random-values',
      'react-native-worklets-core',
      '@react-native-async-storage/async-storage',
    ];

    if (
      webInterceptors.some((m) => moduleName === m || moduleName.startsWith(m + '/')) ||
      moduleName.includes('Libraries/BatchedBridge')
    ) {
      return {
        type: 'sourceFile',
        // eslint-disable-next-line no-undef
        filePath: path.resolve(__dirname, 'mocks', 'web-shim.js'),
      };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
