// Jest 测试设置文件

// 模拟 react-native-quick-crypto
let mockIvCounter = 0;
jest.mock('react-native-quick-crypto', () => ({
  randomBytes: (size) => {
    const buf = Buffer.alloc(size);
    for (let i = 0; i < size; i++) {
      buf[i] = Math.floor(Math.random() * 256);
    }
    return buf;
  },
  randomFillSync: (buffer) => {
    const buf = Buffer.from(buffer);
    // 使用计数器确保每次生成不同的 IV
    for (let i = 0; i < buf.length; i++) {
      buf[i] = (mockIvCounter + i) % 256;
    }
    mockIvCounter++;
    return buffer;
  },
  createCipheriv: jest.fn((algorithm, key, iv) => {
    const currentIv = Buffer.from(iv).toString('base64');
    return {
      update: jest.fn((data, inputEncoding, outputEncoding) => {
        // 简单的模拟加密：base64 编码
        return Buffer.from(data).toString('base64');
      }),
      final: jest.fn((outputEncoding) => ''),
    };
  }),
  createDecipheriv: jest.fn((algorithm, key, iv) => ({
    update: jest.fn((data, inputEncoding, outputEncoding) => {
      // 简单的模拟解密：base64 解码
      return Buffer.from(data, 'base64').toString();
    }),
    final: jest.fn((outputEncoding) => ''),
    setAutoPadding: jest.fn(),
  })),
  createHash: jest.fn((algorithm) => ({
    update: jest.fn((data) => ({
      digest: jest.fn(() => Buffer.alloc(32, 'x')),
    })),
  })),
}));

// 模拟 react-native-get-random-values
jest.mock('react-native-get-random-values', () => ({}));

// 模拟 expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
}));

// 全局测试超时设置
jest.setTimeout(10000);
