<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getToken, removeToken, http } from '@/plugins/axios'
import { ElMessage } from 'element-plus'
import {
  Fold,
  Expand,
  User,
  DataLine,
  Setting,
  SwitchButton,
  MagicStick,
  ChatDotRound,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const userInfo = ref({ nickname: '', username: '' })

// 菜单配置
const menuItems = [
  { path: '/dashboard', name: 'Dashboard', title: '仪表盘', icon: DataLine },
  { path: '/users', name: 'Users', title: '用户管理', icon: User },
  { path: '/fortune', name: 'Fortune', title: '每日运势', icon: MagicStick },
  { path: '/ai', name: 'AIChat', title: '智能助手', icon: ChatDotRound },
]

const activeMenu = computed(() => route.path)

// 获取用户信息
async function loadUserInfo() {
  try {
    const { data: res } = await http.get('/user/info')
    if (res.code === 0) {
      userInfo.value = res.data
    }
  } catch (e) {
    console.error('获取用户信息失败', e)
  }
}

// 退出登录
function handleLogout() {
  removeToken()
  ElMessage.success('已退出登录')
  router.push({ name: 'Login' })
}

onMounted(loadUserInfo)
</script>

<template>
  <div class="admin-layout" :class="{ collapsed }">
    <!-- 侧边栏 -->
    <aside class="sidebar">
      <!-- Logo -->
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">A</div>
          <span v-show="!collapsed" class="logo-text">Admin Pro</span>
        </div>
      </div>

      <!-- 菜单 -->
      <nav class="sidebar-menu">
        <router-link
          v-for="item in menuItems"
          :key="item.path"
          :to="item.path"
          class="menu-item"
          :class="{ active: activeMenu === item.path }"
        >
          <component :is="item.icon" class="menu-icon" />
          <span v-show="!collapsed" class="menu-text">{{ item.title }}</span>
          <div v-if="activeMenu === item.path" class="active-indicator"></div>
        </router-link>
      </nav>

      <!-- 底部折叠按钮 -->
      <div class="sidebar-footer">
        <button class="collapse-btn" @click="collapsed = !collapsed">
          <Fold v-if="!collapsed" />
          <Expand v-else />
        </button>
      </div>
    </aside>

    <!-- 主内容区 -->
    <div class="main-area">
      <!-- 顶部栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <h2 class="page-title">{{ route.meta.title || '后台管理' }}</h2>
        </div>
        <div class="topbar-right">
          <!-- 用户信息 -->
          <div class="user-dropdown">
            <div class="user-avatar">{{ (userInfo.nickname || userInfo.username || 'U').charAt(0) }}</div>
            <span class="user-name">{{ userInfo.nickname || userInfo.username || '用户' }}</span>
            <el-dropdown trigger="click">
              <span class="dropdown-trigger">
                <Setting class="setting-icon" />
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="handleLogout">
                    <SwitchButton style="margin-right: 8px" />
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </header>

      <!-- 内容区 -->
      <main class="content-area">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  display: flex;
  min-height: 100vh;
  background: #0a0a0f;
}

/* 侧边栏 */
.sidebar {
  width: 240px;
  background: linear-gradient(180deg, #13131a 0%, #0d0d12 100%);
  border-right: 1px solid rgba(139, 92, 246, 0.1);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
}

.admin-layout.collapsed .sidebar {
  width: 72px;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  border-radius: 10px;
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

/* 菜单 */
.sidebar-menu {
  flex: 1;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
  text-decoration: none;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

.menu-item:hover {
  color: #fff;
  background: rgba(139, 92, 246, 0.1);
}

.menu-item.active {
  color: #fff;
  background: rgba(139, 92, 246, 0.15);
}

.menu-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.menu-text {
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 20px;
  background: #8b5cf6;
  border-radius: 0 3px 3px 0;
}

/* 折叠按钮 */
.sidebar-footer {
  padding: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.collapse-btn {
  width: 100%;
  padding: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.collapse-btn:hover {
  background: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
}

/* 主内容区 */
.main-area {
  flex: 1;
  margin-left: 240px;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}

.admin-layout.collapsed .main-area {
  margin-left: 72px;
}

/* 顶部栏 */
.topbar {
  height: 60px;
  padding: 0 24px;
  background: rgba(19, 19, 26, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(10px);
}

.page-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 10px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  color: #fff;
}

.user-name {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.dropdown-trigger:hover {
  background: rgba(255, 255, 255, 0.05);
}

.setting-icon {
  width: 18px;
  height: 18px;
  color: rgba(255, 255, 255, 0.5);
}

/* 内容区 */
.content-area {
  flex: 1;
  background: #0a0a0f;
  overflow-y: auto;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    width: 72px;
  }

  .admin-layout .main-area {
    margin-left: 72px;
  }

  .logo-text,
  .menu-text {
    display: none;
  }
}
</style>
