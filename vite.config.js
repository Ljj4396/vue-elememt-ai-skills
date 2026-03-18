import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'
import AutoImport from 'unplugin-auto-import/vite'
import UnoCSS from 'unocss/vite'

function getPackageName(id) {
  const normalized = id.replace(/\\/g, '/')
  const parts = normalized.split('/node_modules/')
  if (parts.length < 2) return null

  let packagePath = parts[parts.length - 1]
  if (packagePath.startsWith('.pnpm/')) {
    const pnpmParts = packagePath.split('/')
    packagePath = pnpmParts.slice(1).join('/')
  }

  const segments = packagePath.split('/')
  if (segments[0].startsWith('@')) {
    return `${segments[0]}/${segments[1]}`
  }
  return segments[0]
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    UnoCSS(),
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
  optimizeDeps: {
    // 提升开发时依赖预构建命中率
    include: ['element-plus', '@element-plus/icons-vue'],
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001', // Go backend runs on 3001 in this project setup
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'), // 确保路径匹配
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // 拆分大体积依赖，降低主包体积
        manualChunks(id) {
          const pkg = getPackageName(id)
          if (!pkg) return

          if (pkg === 'element-plus') return 'element-plus'
          if (pkg === '@element-plus/icons-vue') return 'element-plus-icons'
          if (pkg === 'xlsx') return 'xlsx'
          if (pkg === 'axios') return 'axios'
          if (pkg === 'lunar-typescript') return 'lunar'
          if (
            pkg === 'vue' ||
            pkg === 'vue-router' ||
            pkg === 'pinia' ||
            pkg.startsWith('@vue/')
          ) {
            return 'vue-core'
          }
          return 'vendor'
        },
      },
    },
    chunkSizeWarningLimit: 700,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['vitest-localstorage-mock'],
    mockReset: false,
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
})
