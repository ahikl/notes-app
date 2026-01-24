# NativeWind 迁移问题修复记录

## 问题描述

在集成 NativeWind 后，项目出现以下错误：

```
[BABEL] D:\workspace\T\notes\node_modules\expo-router\entry.js: .plugins is not a valid Plugin property
```

错误堆栈：

```
at D:\workspace\T\notes\node_modules\@babel\core\lib\config\validation\plugins.js:58:42
at Array.forEach (<anonymous>)
at validatePluginObject (D:\workspace\T\notes\node_modules\@babel\core\lib\config\validation\plugins.js:48:20)
```

## 问题原因

Babel 配置中的插件语法与某些依赖包或 Babel 版本不兼容。这个问题可能与不同版本的 Babel 对配置格式的严格程度不同，或是与其他依赖包存在兼容性问题。

## 解决方案

经过反复测试，我们发现 NativeWind 可以正常工作，但需要正确的配置格式。最终有效的配置如下：

**最终有效配置：**

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'nativewind/babel',
      // 其他插件...
    ],
  };
};
```

## 验证结果

修改后，项目能够正常启动，Metro Bundler 没有报错，NativeWind 功能正常工作。

## 其他注意事项

1. 确保安装了正确的依赖：

   ```bash
   npm install nativewind tailwindcss
   ```

2. 正确配置 `tailwind.config.js`：

   ```javascript
   module.exports = {
     content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
     presets: [require('nativewind/preset')],
     theme: {
       extend: {},
     },
     plugins: [],
   };
   ```

3. 在根组件中引入 NativeWind 运行时：
   ```javascript
   import 'nativewind/runtime';
   ```

## 经验教训

1. 在集成新库时，应仔细检查官方文档的配置示例
2. 不同版本的工具链可能存在兼容性问题，需要针对性调整
3. 逐步测试每个变更，确保每步都能正常工作
4. 遇到配置错误时，可暂时移除插件以定位问题
