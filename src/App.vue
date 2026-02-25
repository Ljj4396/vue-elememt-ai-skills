<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useThemeStore } from '@/stores/theme'
import AdminLayout from '@/components/AdminLayout.vue'

const route = useRoute()
const themeStore = useThemeStore()

// 登录页不使用后台布局
const showLayout = computed(() => route.name !== 'Login')

// 加载主题
onMounted(() => {
  themeStore.loadTheme()
})
</script>

<template>
  <div :class="['app-container', `theme-${themeStore.currentTheme}`]">
    <AdminLayout v-if="showLayout">
      <router-view v-slot="{ Component, route }">
        <transition name="fade-slide" mode="out-in">
          <component :is="Component" :key="route.fullPath" />
        </transition>
      </router-view>
    </AdminLayout>
    <router-view v-else v-slot="{ Component, route }">
      <transition name="fade" mode="out-in">
        <component :is="Component" :key="route.fullPath" />
      </transition>
    </router-view>
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* 主题切换过渡 */
.app-container {
  min-height: 100vh;
  background: var(--theme-bg-primary, #0a0a0f);
  color: var(--theme-text, #fff);
  transition: background 0.5s ease, color 0.5s ease;
}

/* 根字体大小响应式调整 */
html {
  font-size: 16px; /* 基准字体大小 */
}

/* 针对高 DPI 或缩放场景 */
@media (min-resolution: 1.5dppx) {
  html {
    font-size: 15px;
  }
}

@media (min-resolution: 2dppx) {
  html {
    font-size: 14px;
  }
}

html, body, #app {
  height: 100%;
  background: var(--theme-bg-primary, #0a0a0f);
  color: var(--theme-text, #fff);
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* Element Plus 暗色主题覆盖 */
.el-dropdown-menu {
  background: var(--theme-bg-secondary, #1a1a24) !important;
  border: 1px solid var(--theme-border, rgba(139, 92, 246, 0.2)) !important;
}

.el-dropdown-menu__item {
  color: var(--theme-text-secondary, rgba(255, 255, 255, 0.8)) !important;
}

.el-dropdown-menu__item:hover {
  background: rgba(139, 92, 246, 0.1) !important;
  color: var(--theme-primary, #8b5cf6) !important;
}

.el-popper.is-light {
  background: var(--theme-bg-secondary, #1a1a24) !important;
  border: 1px solid var(--theme-border, rgba(139, 92, 246, 0.2)) !important;
}

.el-popper.is-light .el-popper__arrow::before {
  background: var(--theme-bg-secondary, #1a1a24) !important;
  border-color: var(--theme-border, rgba(139, 92, 246, 0.2)) !important;
}

/* Element Plus 表格响应式优化 */
.el-table {
  width: 100%;
  overflow-x: auto;
}

.el-table__body-wrapper {
  overflow-x: auto;
}

/* 表格单元格文本溢出处理 */
.el-table .cell {
  word-break: break-word;
  white-space: normal;
  line-height: 1.5;
}

/* 长文本溢出处理 */
.text-overflow {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 响应式容器 */
.responsive-container {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

/* 页面过渡动画 */
.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
