module.exports = function (api) {
  api.cache(true);
  const isProduction = process.env.EXPO_PUBLIC_APP_ENV === 'production';

  return {
    presets: ['babel-preset-expo'],
    plugins: isProduction ? [['transform-remove-console', { exclude: ['error', 'warn'] }]] : [],
  };
};
