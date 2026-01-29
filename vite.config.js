import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    vueDevTools(),
    AutoImport({
      // 自动导入 Vue / Vue Router / Pinia 相关 API
      imports: [
        'vue',
        'vue-router',
        'pinia',
        {
          // Element Plus 函数式 API
          'element-plus': ['ElMessage', 'ElMessageBox', 'ElNotification', 'ElLoading'],
        },
      ],
      // 生成类型声明文件（让 TS/IDE 识别自动导入的变量）
      dts: 'src/auto-imports.d.ts',
      // 在 Vue 模板中也能自动识别（如 $router）
      vueTemplate: true,
      // ESLint 兼容（如果你以后加了 ESLint）
      eslintrc: {
        enabled: false, // 需要时改为 true 并运行一次 dev，会生成 .eslintrc-auto-import.json
      },
    }),
  ],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
