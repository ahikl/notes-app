const { getDefaultConfig } = require('expo/metro-config');

// eslint-disable-next-line no-undef
const config = getDefaultConfig(__dirname);

// 完全禁用Web平台
config.resolver.platforms = ['ios', 'android'];

module.exports = config;
