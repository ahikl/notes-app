import React from 'react';
import { Text, View } from 'react-native';

// NativeWind 使用示例
const TestNativeWind = () => {
  return (
    <View className="flex-1 justify-center items-center bg-white p-4">
      <Text className="text-2xl font-bold text-blue-500 mb-4">NativeWind 测试</Text>
      <Text className="text-lg text-gray-700 mb-2">如果看到蓝色文本，则 NativeWind 配置成功!</Text>
      <View className="bg-red-500 p-4 rounded-lg mt-4">
        <Text className="text-white font-semibold">红色背景容器</Text>
      </View>
    </View>
  );
};

export default TestNativeWind;
