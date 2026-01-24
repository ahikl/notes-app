# NativeWind 迁移指南

## 概述

本项目已集成 NativeWind 以支持原子化 CSS 样式。此指南说明如何逐步将现有样式系统迁移到 NativeWind，而不影响现有功能。

## 安装和配置

### 依赖项

- `nativewind`: ^4.0.36
- `tailwindcss`: ^3.4.15

### 配置文件

- `tailwind.config.js`: Tailwind 配置文件
- `babel.config.js`: 包含 nativewind/babel 插件
- `tsconfig.json`: 包含 nativewind/typescript 插件

## 如何使用 NativeWind

### 1. 基本用法

```tsx
import { View, Text } from 'react-native';

// 使用 className 属性应用样式
<View className="flex-1 bg-white p-4">
  <Text className="text-xl font-bold text-blue-500">Hello World</Text>
</View>;
```

### 2. 主题颜色处理

由于 NativeWind 不直接支持 Expo 的暗色模式，需要自定义实现：

```tsx
import { useColorScheme } from 'react-native';

const MyComponent = () => {
  const colorScheme = useColorScheme();

  return (
    <View className={`p-4 ${colorScheme === 'dark' ? 'bg-gray-800' : 'bg-white'}`}>
      <Text className={`${colorScheme === 'dark' ? 'text-white' : 'text-black'}`}>Content</Text>
    </View>
  );
};
```

### 3. 渐进式迁移策略

#### 步骤 1: 保持现有组件不变

当前所有的 Themed 组件（如 `Text`, `View`）和 `StyleSheet.create` 保持不变。

#### 步骤 2: 创建新的 NativeWind 组件

为新功能或重构的组件使用 NativeWind：

```tsx
// 在新组件中使用 NativeWind
import { View, Text } from 'react-native';

const NewComponent = () => {
  return (
    <View className="flex-1 p-4 bg-white">
      <Text className="text-lg font-medium">New Component with NativeWind</Text>
    </View>
  );
};
```

#### 步骤 3: 逐步替换现有组件

对于现有组件，可以创建 NativeWind 版本，逐步替换：

```tsx
// 旧版
export function MonoText(props: TextProps) {
  return <Text {...props} style={[props.style, { fontFamily: 'SpaceMono' }]} />;
}

// 新版 (已在 StyledText.tsx 中实现)
export function NativeWindMonoText({
  className = '',
  ...props
}: TextProps & { className?: string }) {
  return <Text className={`font-mono ${className}`} {...props} />;
}
```

## 现有集成示例

### 测试组件

- `components/TestNativeWind.tsx`: 验证 NativeWind 集成
- `components/EditScreenInfoNativeWind.tsx`: 将现有组件转换为 NativeWind 版本的示例

### 增强的 Themed 组件

- `components/Themed.tsx`: 增强以支持 className 属性，保持向后兼容

### 迁移的组件

- `components/NoteListWithSelectionNative.tsx`: 使用 NativeWind 重写的笔记列表组件
- `app/(tabs)/index-native.tsx`: 使用 NativeWind 的首页
- `app/server-settings-native.tsx`: 使用 NativeWind 重写的服务器设置页面

### 新增路由

- `app/test-nativewind.tsx`: 用于测试 NativeWind 功能的页面

## 最佳实践

### 1. 兼容性

- 保持现有样式系统完整，不破坏现有功能
- 新功能优先使用 NativeWind
- 逐步迁移，避免大规模重构

### 2. 性能

- NativeWind 会在构建时预编译类名，运行时性能优秀
- 避免动态生成大量不同的类名组合

### 3. 主题支持

虽然 NativeWind 本身不包含主题系统，但可以通过以下方式实现：

- 使用 React Context 提供主题
- 使用 `useColorScheme` hook 实现暗色模式
- 自定义工具函数简化主题切换

## 注意事项

1. 确保所有组件导入了正确的 React Native 元素（不是 Themed 版本）以使用 className
2. 对于第三方组件，如果它们不支持 className，需要用 View 或 Text 包装
3. 保持 Tailwind 配置文件更新，添加自定义样式需求
4. Babel 配置中的插件格式可能会影响构建，推荐使用单行格式：`plugins: ['nativewind/babel']` 而非多行数组格式

## 常见问题解决

### Babel 配置错误

如果遇到 `.plugins is not a valid Plugin property` 错误，请检查 `babel.config.js` 中的插件配置格式，确保使用单行格式：

```javascript
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['nativewind/babel'],
  };
};
```

## 迁移检查表

- [ ] 验证 NativeWind 安装和配置
- [ ] 测试基本样式类名生效
- [ ] 验证暗色模式兼容性
- [ ] 确认现有功能未受影响
- [ ] 逐步替换组件，保持向后兼容
