<script setup>
import { computed, ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  removeToken,
  http,
  getUserPermissions,
  setUserPermissions,
  getIsAdmin,
  setIsAdmin,
} from '@/plugins/axios'
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
const userInfo = ref({
  nickname: '',
  username: '',
  permissions: getUserPermissions() || {},
  isAdmin: getIsAdmin(),
})

// 菜单配置
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
const allowedMenuItems = computed(() =>
  menuItems.filter((item) => {
    if (item.adminOnly && !userInfo.value.isAdmin) return false
    if (!item.permission) return true
    if (userInfo.value.isAdmin) return true
    return userInfo.value.permissions?.[item.permission] === true
  }),
)

// 获取用户信息
async function loadUserInfo() {
  try {
    const { data: res } = await http.get('/user/info')
    if (res.code === 0) {
      userInfo.value = res.data
      setUserPermissions(res.data.permissions || {})
      setIsAdmin(res.data.isAdmin === true)
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
  background: var(--theme-bg-primary, #0a0a0f);
}

/* 侧边栏 */
.sidebar {
  width: 18%;
  max-width: 240px;
  min-width: 200px;
  background: linear-gradient(180deg, var(--theme-bg-secondary, #13131a) 0%, var(--theme-bg-primary, #0d0d12) 100%);
  border-right: 1px solid var(--theme-border, rgba(139, 92, 246, 0.1));
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
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
}

.logo-text {
  font-size: 1.125rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
}

/* 菜单 */
.sidebar-menu {
  flex: 1;
  padding: 1rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
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
  background: var(--theme-primary, #8b5cf6);
  border-radius: 0 3px 3px 0;
}

/* 折叠按钮 */
.sidebar-footer {
  padding: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.collapse-btn {
  width: 100%;
  padding: 0.625rem;
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
  color: var(--theme-primary, #8b5cf6);
}

/* 主内容区 */
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

/* 顶部栏 */
.topbar {
  height: 3.75rem;
  min-width: 320px;
  padding: 0 1.5rem;
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
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--theme-text, #fff);
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
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #fff;
}

.user-name {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
}

.dropdown-trigger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.dropdown-trigger:hover {
  background: rgba(255, 255, 255, 0.05);
}

.setting-icon {
  width: 1.125rem;
  height: 1.125rem;
  color: rgba(255, 255, 255, 0.5);
}

/* 内容区 */
.content-area {
  flex: 1;
  min-width: 280px;
  background: var(--theme-bg-primary, #0a0a0f);
  overflow-y: auto;
  overflow-x: hidden;
}

/* 响应式 */
@media (max-width: 768px) {
  .sidebar {
    width: 5%;
    max-width: 72px;
  }

  .admin-layout .main-area {
    margin-left: 5%;
  }

  .logo-text,
  .menu-text {
    display: none;
  }
}

/* 针对 200% 以上缩放优化 */
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

  /* 减小间距 */
  .topbar {
    padding: 0 1rem;
  }

  /* 菜单项间距 */
  .menu-item {
    padding: 0.625rem 1rem;
  }
}

/* 针对极端缩放（250%+）自动折叠侧边栏 */
@media (min-resolution: 2.5dppx) {
  .sidebar {
    width: 5%;
    max-width: 72px;
  }

  .logo-text,
  .menu-text {
    display: none;
  }

  .main-area {
    margin-left: 5%;
  }
}
</style>
