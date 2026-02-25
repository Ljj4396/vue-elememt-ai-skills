<script setup>
import { ref, computed } from 'vue'
import { useThemeStore } from '@/stores/theme'
import { ElMessage } from 'element-plus'
import { Check, MagicStick, Cpu, Compass } from '@element-plus/icons-vue'

const themeStore = useThemeStore()
const selectedTheme = ref(themeStore.currentTheme)

const themeCards = computed(() => [
  {
    key: 'default',
    name: '默认主题',
    description: '经典紫色科技风格',
    icon: Cpu,
    preview: {
      primary: '#8b5cf6',
      secondary: '#6366f1',
      accent: '#ec4899',
    },
    features: ['玻璃拟态', '紫色渐变', '现代简约']
  },
  {
    key: 'fortune',
    name: '运势玄学',
    description: '东方神秘美学，金红配色',
    icon: MagicStick,
    preview: {
      primary: '#ffc53d',
      secondary: '#ff4d4f',
      accent: '#ff7a45',
    },
    features: ['星光粒子', '金色边框', '神秘东方']
  },
  {
    key: 'ai',
    name: 'AI 科技',
    description: '赛博朋克未来风格',
    icon: Cpu,
    preview: {
      primary: '#00d9ff',
      secondary: '#8b5cf6',
      accent: '#ec4899',
    },
    features: ['霓虹效果', '六边形网格', '未来科技']
  },
  {
    key: 'harmony',
    name: '混合平衡',
    description: '东西方融合，阴阳平衡',
    icon: Compass,
    preview: {
      primary: '#8b5cf6',
      secondary: '#fbbf24',
      accent: '#06b6d4',
    },
    features: ['太极元素', '能量波纹', '冷暖对比']
  }
])

const selectTheme = (themeKey) => {
  selectedTheme.value = themeKey
}

const applyTheme = () => {
  themeStore.setTheme(selectedTheme.value)
  ElMessage.success(`已切换到 ${themeStore.currentThemeConfig.name}`)
}
</script>

<template>
  <div class="theme-selector-page">
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <span class="title-icon">🎨</span>
          主题选择
        </h1>
        <p class="page-subtitle">选择您喜欢的界面风格，打造专属视觉体验</p>
      </div>
    </div>

    <div class="themes-grid">
      <div
        v-for="theme in themeCards"
        :key="theme.key"
        class="theme-card"
        :class="{
          'is-selected': selectedTheme === theme.key,
          'is-current': themeStore.currentTheme === theme.key
        }"
        @click="selectTheme(theme.key)"
      >
        <!-- 当前使用标签 -->
        <div v-if="themeStore.currentTheme === theme.key" class="current-badge">
          <Check class="badge-icon" />
          当前使用
        </div>

        <!-- 主题图标 -->
        <div class="theme-icon-wrapper">
          <component :is="theme.icon" class="theme-icon" />
        </div>

        <!-- 主题信息 -->
        <div class="theme-info">
          <h3 class="theme-name">{{ theme.name }}</h3>
          <p class="theme-description">{{ theme.description }}</p>
        </div>

        <!-- 颜色预览 -->
        <div class="color-preview">
          <div
            class="color-dot"
            v-for="(color, key) in theme.preview"
            :key="key"
            :style="{ background: color }"
          ></div>
        </div>

        <!-- 特性标签 -->
        <div class="theme-features">
          <span
            v-for="feature in theme.features"
            :key="feature"
            class="feature-tag"
          >
            {{ feature }}
          </span>
        </div>

        <!-- 选中指示器 -->
        <div class="select-indicator">
          <Check class="check-icon" />
        </div>
      </div>
    </div>

    <!-- 应用按钮 -->
    <div class="action-bar">
      <div class="current-theme-info">
        <span class="label">当前主题：</span>
        <span class="value">{{ themeStore.currentThemeConfig.name }}</span>
      </div>
      <button
        class="apply-btn"
        :disabled="selectedTheme === themeStore.currentTheme"
        @click="applyTheme"
      >
        <Check class="btn-icon" />
        应用主题
      </button>
    </div>
  </div>
</template>

<style scoped>
.theme-selector-page {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
}

/* 页面头部 */
.page-header {
  margin-bottom: 3rem;
}

.header-content {
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 1rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
}

.title-icon {
  font-size: 3rem;
  animation: float 3s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.page-subtitle {
  font-size: 1.125rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
}

/* 主题网格 */
.themes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

/* 主题卡片 */
.theme-card {
  position: relative;
  padding: 2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-radius: 1.5rem;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.theme-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.1), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.theme-card:hover {
  transform: translateY(-8px);
  border-color: rgba(139, 92, 246, 0.5);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.theme-card:hover::before {
  opacity: 1;
}

.theme-card.is-selected {
  border-color: var(--theme-primary);
  box-shadow: 0 0 30px var(--theme-shadow);
}

.theme-card.is-selected::before {
  opacity: 1;
  background: linear-gradient(135deg, var(--theme-primary), transparent);
}

.theme-card.is-current {
  border-color: rgba(139, 92, 246, 0.6);
}

/* 当前使用标签 */
.current-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.5);
  border-radius: 2rem;
  font-size: 0.875rem;
  color: #a78bfa;
  font-weight: 600;
}

.badge-icon {
  width: 1rem;
  height: 1rem;
}

/* 主题图标 */
.theme-icon-wrapper {
  width: 4rem;
  height: 4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 1rem;
  margin-bottom: 1.5rem;
  transition: all 0.3s;
}

.theme-card:hover .theme-icon-wrapper {
  background: rgba(139, 92, 246, 0.2);
  transform: scale(1.1) rotate(5deg);
}

.theme-icon {
  width: 2rem;
  height: 2rem;
  color: var(--theme-primary);
}

/* 主题信息 */
.theme-info {
  margin-bottom: 1.5rem;
}

.theme-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.5rem 0;
}

.theme-description {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.6);
  margin: 0;
  line-height: 1.6;
}

/* 颜色预览 */
.color-preview {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.color-dot {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.2);
  transition: transform 0.3s;
}

.theme-card:hover .color-dot {
  transform: scale(1.1);
}

/* 特性标签 */
.theme-features {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.feature-tag {
  padding: 0.375rem 0.75rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 0.5rem;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s;
}

.theme-card:hover .feature-tag {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

/* 选中指示器 */
.select-indicator {
  position: absolute;
  top: 1rem;
  left: 1rem;
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-primary);
  border-radius: 50%;
  opacity: 0;
  transform: scale(0);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.theme-card.is-selected .select-indicator {
  opacity: 1;
  transform: scale(1);
}

.check-icon {
  width: 1.25rem;
  height: 1.25rem;
  color: #fff;
}

/* 操作栏 */
.action-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1.5rem 2rem;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 1rem;
}

.current-theme-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1rem;
}

.current-theme-info .label {
  color: rgba(255, 255, 255, 0.6);
}

.current-theme-info .value {
  color: var(--theme-primary);
  font-weight: 600;
}

/* 应用按钮 */
.apply-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  background: linear-gradient(135deg, var(--theme-primary), var(--theme-secondary));
  border: none;
  border-radius: 0.75rem;
  font-size: 1rem;
  font-weight: 600;
  color: #fff;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 16px var(--theme-shadow);
}

.apply-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px var(--theme-shadow);
}

.apply-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 1.25rem;
  height: 1.25rem;
}

/* 响应式 */
@media (max-width: 768px) {
  .theme-selector-page {
    padding: 1.5rem;
  }

  .page-title {
    font-size: 2rem;
  }

  .themes-grid {
    grid-template-columns: 1fr;
    gap: 1.5rem;
  }

  .action-bar {
    flex-direction: column;
    gap: 1rem;
    text-align: center;
  }

  .apply-btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
