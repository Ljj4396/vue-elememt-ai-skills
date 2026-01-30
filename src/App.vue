<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/AdminLayout.vue'

const route = useRoute()

// 登录页不使用后台布局
const showLayout = computed(() => route.name !== 'Login')
</script>

<template>
  <AdminLayout v-if="showLayout">
    <RouterView />
  </AdminLayout>
  <RouterView v-else />
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body, #app {
  height: 100%;
  background: #0a0a0f;
  color: #fff;
  font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* Element Plus 暗色主题覆盖 */
.el-dropdown-menu {
  background: #1a1a24 !important;
  border: 1px solid rgba(139, 92, 246, 0.2) !important;
}

.el-dropdown-menu__item {
  color: rgba(255, 255, 255, 0.8) !important;
}

.el-dropdown-menu__item:hover {
  background: rgba(139, 92, 246, 0.1) !important;
  color: #8b5cf6 !important;
  }

.el-popper.is-light {
  background: #1a1a24 !important;
  border: 1px solid rgba(139, 92, 246, 0.2) !important;
  }

.el-popper.is-light .el-popper__arrow::before {
  background: #1a1a24 !important;
  border-color: rgba(139, 92, 246, 0.2) !important;
}
</style>
