// mocks/web-shim.js
const noop = () => {};

// 这是一个能够无限递归的 Proxy
const createRecursiveMock = () => {
  const mock = new Proxy(noop, {
    get: (target, prop) => {
      // 必须返回字符串版本号以通过 semver 校验
      if (prop === 'version') return '0.5.0';
      if (prop === 'OS') return 'web';
      if (prop === 'select') return (obj) => obj.web || obj.default;

      // 确保 default 导出也能正常工作
      if (prop === 'default') return mock;

      // 其他任何属性访问都返回自身 (实现链式调用)
      return mock;
    },
    apply: () => {
      // 任何函数调用都返回自身
      return mock;
    },
  });
  return mock;
};

const universalMock = createRecursiveMock();

module.exports = universalMock;
module.exports.default = universalMock;
