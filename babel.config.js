module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      // 1. 必须在 babel-preset-expo 中配置 jsxImportSource
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: [
      // 2. 如果你以后要用 Reanimated，记得把这个插件放在最后
      'react-native-reanimated/plugin',
    ],
  };
};
