// isomorphic-webcrypto shim - 基于 react-native-quick-crypto 提供 lib0 所需的 webcrypto API
const { subtle, getRandomValues } = require('react-native-quick-crypto');

module.exports = {
  ensureSecure: () => {},
  subtle,
  getRandomValues: (arr) => getRandomValues(arr),
};
