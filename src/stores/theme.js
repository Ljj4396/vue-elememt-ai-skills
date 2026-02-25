import { defineStore } from 'pinia'

export const useThemeStore = defineStore('theme', {
  state: () => ({
    currentTheme: 'default',
    themes: {
      default: {
        name: '默认主题',
        description: '经典紫色科技风格',
        '--theme-primary': '#8b5cf6',
        '--theme-secondary': '#6366f1',
        '--theme-accent': '#ec4899',
        '--theme-bg-primary': '#0a0a0f',
        '--theme-bg-secondary': '#13131a',
        '--theme-text': '#ffffff',
        '--theme-text-secondary': 'rgba(255, 255, 255, 0.7)',
        '--theme-border': 'rgba(139, 92, 246, 0.3)',
        '--theme-shadow': 'rgba(139, 92, 246, 0.3)',
      },
      fortune: {
        name: '运势玄学',
        description: '东方神秘美学，金红配色',
        '--theme-primary': '#ffc53d',
        '--theme-secondary': '#ff4d4f',
        '--theme-accent': '#ff7a45',
        '--theme-bg-primary': '#1a0a0f',
        '--theme-bg-secondary': '#2a1a1f',
        '--theme-text': '#ffffff',
        '--theme-text-secondary': 'rgba(255, 255, 255, 0.7)',
        '--theme-border': 'rgba(255, 197, 61, 0.3)',
        '--theme-shadow': 'rgba(255, 77, 79, 0.3)',
      },
      ai: {
        name: 'AI 科技',
        description: '赛博朋克未来风格',
        '--theme-primary': '#00d9ff',
        '--theme-secondary': '#8b5cf6',
        '--theme-accent': '#ec4899',
        '--theme-bg-primary': '#0a0a1f',
        '--theme-bg-secondary': '#1a1a2f',
        '--theme-text': '#e0e7ff',
        '--theme-text-secondary': 'rgba(224, 231, 255, 0.7)',
        '--theme-border': 'rgba(0, 217, 255, 0.3)',
        '--theme-shadow': 'rgba(139, 92, 246, 0.3)',
      },
      harmony: {
        name: '混合平衡',
        description: '东西方融合，阴阳平衡',
        '--theme-primary': '#8b5cf6',
        '--theme-secondary': '#fbbf24',
        '--theme-accent': '#06b6d4',
        '--theme-bg-primary': '#1e1b4b',
        '--theme-bg-secondary': '#312e81',
        '--theme-text': '#f3f4f6',
        '--theme-text-secondary': 'rgba(243, 244, 246, 0.7)',
        '--theme-border': 'rgba(139, 92, 246, 0.3)',
        '--theme-shadow': 'rgba(251, 191, 36, 0.3)',
      },
    },
  }),

  getters: {
    currentThemeConfig: (state) => state.themes[state.currentTheme],
    themeList: (state) => Object.keys(state.themes).map(key => ({
      key,
      ...state.themes[key]
    })),
  },

  actions: {
    setTheme(themeName) {
      if (!this.themes[themeName]) {
        console.warn(`Theme "${themeName}" not found`)
        return
      }

      this.currentTheme = themeName
      this.applyTheme()
      this.saveTheme()
    },

    applyTheme() {
      const theme = this.themes[this.currentTheme]
      const root = document.documentElement

      // 应用 CSS 变量
      Object.keys(theme).forEach(key => {
        if (key.startsWith('--')) {
          root.style.setProperty(key, theme[key])
        }
      })

      // 添加主题类名
      root.className = root.className.replace(/theme-\w+/g, '')
      root.classList.add(`theme-${this.currentTheme}`)
    },

    saveTheme() {
      try {
        localStorage.setItem('user-theme', this.currentTheme)
      } catch (e) {
        console.error('Failed to save theme:', e)
      }
    },

    loadTheme() {
      try {
        const saved = localStorage.getItem('user-theme')
        if (saved && this.themes[saved]) {
          this.currentTheme = saved
        }
        this.applyTheme()
      } catch (e) {
        console.error('Failed to load theme:', e)
        this.applyTheme()
      }
    },
  },
})
