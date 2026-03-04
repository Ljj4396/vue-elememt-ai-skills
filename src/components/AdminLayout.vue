<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { logoutSession, fetchAndCacheUserInfo, getCachedAuth } from '@/services/auth-service'
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
  Lock,
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const collapsed = ref(false)
const cachedAuth = getCachedAuth()

const userInfo = ref({
  nickname: '',
  username: '',
  permissions: cachedAuth.permissions,
  isAdmin: cachedAuth.isAdmin,
})

const menuItems = [
  { path: '/dashboard', name: 'Dashboard', title: '仪表盘', icon: DataLine },
  { path: '/balance', name: 'BalanceSheet', title: '余额表', icon: DataLine },
  { path: '/users', name: 'Users', title: '用户管理', icon: User, permission: 'users' },
  { path: '/permissions', name: 'Permissions', title: '权限控制', icon: Lock, permission: 'users' },
  {
    path: '/ai-requests',
    name: 'AIRequests',
    title: '权限申请',
    icon: Lock,
    permission: 'users',
    adminOnly: true,
  },
  { path: '/fortune', name: 'Fortune', title: '每日运势', icon: MagicStick },
  { path: '/ai', name: 'AIChat', title: '智能助手', icon: ChatDotRound, permission: 'ai' },
  { path: '/theme', name: 'ThemeSelector', title: '主题选择', icon: Setting },
]

const activeMenu = computed(() => route.path)
const pageTitle = computed(() => route.meta.title || '后台管理')
const allowedMenuItems = computed(() =>
  menuItems.filter((item) => {
    if (item.adminOnly && !userInfo.value.isAdmin) return false
    if (!item.permission) return true
    if (userInfo.value.isAdmin) return true
    return userInfo.value.permissions?.[item.permission] === true
  }),
)

async function loadUserInfo() {
  try {
    const info = await fetchAndCacheUserInfo()
    userInfo.value = {
      ...userInfo.value,
      ...info,
      permissions: info.permissions || {},
      isAdmin: info.isAdmin === true,
    }
  } catch (error) {
    console.error('Failed to load user info', error)
  }
}

function handleLogout() {
  logoutSession()
  ElMessage.success('已退出登录')
  router.push({ name: 'Login' })
}

onMounted(loadUserInfo)
</script>

<template>
  <div class="admin-layout" :class="{ collapsed }">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div class="logo">
          <div class="logo-icon">A</div>
          <div v-show="!collapsed" class="logo-text-wrap">
            <span class="logo-text">Admin Pro</span>
            <span class="logo-subtitle">Control Center</span>
          </div>
        </div>
      </div>

      <nav class="sidebar-menu" aria-label="主导航">
        <router-link
          v-for="item in allowedMenuItems"
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

      <div class="sidebar-footer">
        <button class="collapse-btn" @click="collapsed = !collapsed">
          <Fold v-if="!collapsed" />
          <Expand v-else />
        </button>
      </div>
    </aside>

    <div class="main-area">
      <header class="topbar">
        <div class="topbar-left">
          <h2 class="page-title">{{ pageTitle }}</h2>
          <p class="page-subtitle">深色玻璃风格后台界面</p>
        </div>
        <div class="topbar-right">
          <div class="user-dropdown">
            <div class="user-avatar">{{ (userInfo.nickname || userInfo.username || 'U').charAt(0) }}</div>
            <span class="user-name">{{ userInfo.nickname || userInfo.username || '用户' }}</span>
            <el-dropdown trigger="click">
              <span class="dropdown-trigger" aria-label="打开设置菜单">
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

      <main class="content-area">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.admin-layout {
  --glass-bg: rgba(255, 255, 255, 0.03);
  --glass-border: rgba(255, 255, 255, 0.08);
  --hover-bg: rgba(139, 92, 246, 0.16);
  --active-bg: rgba(139, 92, 246, 0.2);
  --text-weak: rgba(255, 255, 255, 0.68);
  display: flex;
  min-height: 100vh;
  background:
    radial-gradient(circle at 15% 5%, rgba(99, 102, 241, 0.12), transparent 35%),
    radial-gradient(circle at 90% 90%, rgba(236, 72, 153, 0.08), transparent 35%),
    var(--theme-bg-primary, #0a0a0f);
}

.sidebar {
  width: 18%;
  max-width: 240px;
  min-width: 200px;
  background:
    linear-gradient(180deg, rgba(20, 20, 31, 0.96) 0%, rgba(11, 11, 19, 0.96) 100%),
    var(--theme-bg-secondary, #13131a);
  border-right: 1px solid var(--glass-border);
  box-shadow: 0 0 0 1px rgba(139, 92, 246, 0.08), 0 24px 48px rgba(0, 0, 0, 0.28);
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease, max-width 0.3s ease, min-width 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  overflow: hidden;
}

.sidebar::before {
  content: '';
  position: absolute;
  inset: -45% -35% auto auto;
  width: 14rem;
  height: 14rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.34), transparent 70%);
  pointer-events: none;
}

.admin-layout.collapsed .sidebar {
  width: 5%;
  max-width: 72px;
  min-width: 60px;
}

.sidebar-header {
  padding: 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  position: relative;
  z-index: 1;
}

.logo-icon {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--theme-primary, #8b5cf6), var(--theme-secondary, #6366f1));
  border-radius: 10px;
  font-size: 1.125rem;
  font-weight: 700;
  color: #fff;
  flex-shrink: 0;
  box-shadow: 0 10px 24px rgba(99, 102, 241, 0.35);
}

.logo-text-wrap {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
  letter-spacing: 0.02em;
  white-space: nowrap;
}

.logo-subtitle {
  font-size: 0.75rem;
  color: var(--text-weak);
  white-space: nowrap;
}

.sidebar-menu {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
  position: relative;
  z-index: 1;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  color: var(--text-weak);
  text-decoration: none;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
  position: relative;
  border: 1px solid transparent;
}

.menu-item:hover {
  color: #fff;
  background: var(--hover-bg);
  border-color: rgba(139, 92, 246, 0.28);
  transform: translateX(1px);
}

.menu-item.active {
  color: #fff;
  background: var(--active-bg);
  border-color: rgba(139, 92, 246, 0.32);
}

.menu-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.menu-text {
  font-size: 0.875rem;
  font-weight: 500;
  white-space: nowrap;
}

.active-indicator {
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 1.25rem;
  background: linear-gradient(180deg, var(--theme-secondary, #6366f1), var(--theme-primary, #8b5cf6));
  border-radius: 0 3px 3px 0;
  box-shadow: 0 0 16px rgba(139, 92, 246, 0.72);
}

.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  z-index: 1;
}

.collapse-btn {
  width: 100%;
  padding: 0.625rem;
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--text-weak);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.collapse-btn:hover {
  background: var(--hover-bg);
  border-color: rgba(139, 92, 246, 0.3);
  color: #fff;
}

.main-area {
  flex: 1;
  margin-left: 18%;
  min-width: 320px;
  display: flex;
  flex-direction: column;
  transition: margin-left 0.3s ease;
}

.admin-layout.collapsed .main-area {
  margin-left: 5%;
}

.topbar {
  min-height: 4rem;
  min-width: 320px;
  padding: 0.625rem 1.5rem;
  background: rgba(19, 19, 26, 0.72);
  border-bottom: 1px solid var(--glass-border);
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: blur(14px);
}

.topbar-left {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.page-title {
  margin: 0;
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--theme-text, #fff);
  line-height: 1.2;
}

.page-subtitle {
  margin: 0;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.52);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.user-dropdown {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.user-avatar {
  width: 2.25rem;
  height: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--theme-primary, #8b5cf6), var(--theme-accent, #ec4899));
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
  box-shadow: 0 8px 20px rgba(139, 92, 246, 0.34);
}

.user-name {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.84);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.dropdown-trigger:hover {
  background: rgba(255, 255, 255, 0.05);
}

.setting-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: rgba(255, 255, 255, 0.7);
}

.content-area {
  flex: 1;
  min-width: 280px;
  background: transparent;
  overflow-y: auto;
  overflow-x: hidden;
}

@media (max-width: 960px) {
  .sidebar {
    width: 5%;
    max-width: 72px;
    min-width: 60px;
  }

  .main-area,
  .admin-layout.collapsed .main-area {
    margin-left: 5%;
  }

  .logo-text-wrap,
  .menu-text,
  .user-name,
  .page-subtitle {
    display: none;
  }

  .menu-item {
    justify-content: center;
    padding-inline: 0.75rem;
  }

  .topbar {
    padding-inline: 1rem;
  }
}

@media (min-resolution: 2dppx) {
  .sidebar {
    width: 15%;
    max-width: 200px;
  }

  .admin-layout.collapsed .sidebar {
    width: 4%;
    max-width: 60px;
  }

  .main-area {
    margin-left: 15%;
  }

  .admin-layout.collapsed .main-area {
    margin-left: 4%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sidebar,
  .main-area,
  .menu-item,
  .collapse-btn,
  .dropdown-trigger {
    transition: none;
  }

  .menu-item:hover {
    transform: none;
  }
}
</style>
