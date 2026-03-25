import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import prettierPlugin from 'eslint-plugin-prettier';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

export default [
  ...compat.extends('expo'),
  {
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      'prettier/prettier': 'error',
      // TypeScript 的 no-unused-vars 由 expo 配置处理
      // 这里只需要关闭基础的 ESLint 规则即可
      'no-unused-vars': 'off',
    },
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        global: 'readonly',
        process: 'readonly',
        jest: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
      },
    },
  },
  prettier,
];
