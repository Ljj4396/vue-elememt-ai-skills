<script setup>
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { http } from '@/plugins/axios'
import { ElMessage } from 'element-plus'
import { Refresh, Search } from '@element-plus/icons-vue'

const loading = ref(false)
const users = ref([])
const searchKeyword = ref('')
const tableHeight = ref('560px')
const savingMap = reactive({})

const normalizePermissions = (permissions = {}) => ({
  users: permissions?.users !== false,
  ai: permissions?.ai !== false,
  vip: permissions?.vip === true,
})

const filteredUsers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return users.value
  return users.value.filter((user) => {
    return (
      user.username?.toLowerCase().includes(keyword) ||
      user.nickname?.toLowerCase().includes(keyword) ||
      String(user.id).includes(keyword)
    )
  })
})

const stats = computed(() => {
  const total = users.value.length
  const admins = users.value.filter((user) => user.isAdmin).length
  const vipUsers = users.value.filter((user) => user.permissions?.vip).length
  const aiEnabled = users.value.filter((user) => user.isAdmin || user.permissions?.ai).length
  return { total, admins, vipUsers, aiEnabled }
})

async function loadUsers() {
  loading.value = true
  try {
    const { data: res } = await http.get('/users')
    if (res.code === 0) {
      users.value = (res.data || []).map((user) => ({
        ...user,
        permissions: normalizePermissions(user.permissions),
        isAdmin: user.isAdmin === true,
      }))
    } else {
      ElMessage.error(res.data?.message || '加载用户失败')
    }
  } catch (error) {
    ElMessage.error('网络错误，请稍后重试')
    console.error('loadUsers failed', error)
  } finally {
    loading.value = false
  }
}

async function updatePermission(row, key, value) {
  if (row.isAdmin) {
    ElMessage.warning('超管账号权限不可修改')
    return
  }
  if (savingMap[row.id]) return

  const previous = row.permissions?.[key]
  row.permissions[key] = value
  savingMap[row.id] = true
  try {
    const { data: res } = await http.put(`/users/${row.id}`, {
      permissions: row.permissions,
    })
    if (res.code === 0) {
      ElMessage.success('权限已更新')
    } else {
      throw new Error(res.data?.message || '更新失败')
    }
  } catch (error) {
    row.permissions[key] = previous
    ElMessage.error(error?.message || '更新失败')
  } finally {
    savingMap[row.id] = false
  }
}

function updateTableHeight() {
  const offset = 340
  tableHeight.value = `${Math.max(300, window.innerHeight - offset)}px`
}

onMounted(() => {
  loadUsers()
  updateTableHeight()
  window.addEventListener('resize', updateTableHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTableHeight)
})
</script>

<template>
  <div class="permissions-page">
    <section class="permission-hero">
      <div class="hero-copy">
        <p class="hero-kicker">Access Policy</p>
        <h2>账号权限控制台</h2>
        <p>统一管理用户管理权限、AI 助手权限和 VIP 权限，支持实时生效。</p>
      </div>
      <div class="hero-stats">
        <article class="hero-stat">
          <span class="hero-stat-label">用户总数</span>
          <strong class="hero-stat-value">{{ stats.total }}</strong>
        </article>
        <article class="hero-stat">
          <span class="hero-stat-label">超管账号</span>
          <strong class="hero-stat-value">{{ stats.admins }}</strong>
        </article>
        <article class="hero-stat">
          <span class="hero-stat-label">VIP 用户</span>
          <strong class="hero-stat-value">{{ stats.vipUsers }}</strong>
        </article>
        <article class="hero-stat">
          <span class="hero-stat-label">AI 已开放</span>
          <strong class="hero-stat-value">{{ stats.aiEnabled }}</strong>
        </article>
      </div>
    </section>

    <section class="toolbar-card">
      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索 ID / 用户名 / 昵称"
          class="search-input"
        />
        <el-button :icon="Refresh" @click="loadUsers" :loading="loading">刷新</el-button>
      </div>
    </section>

    <section class="table-card">
      <el-table
        :data="filteredUsers"
        row-key="id"
        v-loading="loading"
        class="data-table"
        :max-height="tableHeight"
      >
        <el-table-column prop="id" label="ID" width="80" align="center">
          <template #default="{ row }">
            <span class="id-tag">#{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户" min-width="210">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar">{{ (row.nickname || row.username || 'U').charAt(0) }}</div>
              <div class="user-info">
                <span class="username">{{ row.username }}</span>
                <span class="nickname">
                  {{ row.nickname || '未设置昵称' }}
                  <el-tag v-if="row.isAdmin" size="small" type="warning">超管</el-tag>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="用户管理" min-width="165" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.permissions.users"
              :disabled="row.isAdmin"
              :loading="savingMap[row.id]"
              active-text="允许"
              inactive-text="禁用"
              @change="(val) => updatePermission(row, 'users', val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="智能助手" min-width="165" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.permissions.ai"
              :disabled="row.isAdmin"
              :loading="savingMap[row.id]"
              active-text="允许"
              inactive-text="禁用"
              @change="(val) => updatePermission(row, 'ai', val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="VIP 权限" min-width="150" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.permissions.vip"
              :disabled="row.isAdmin"
              :loading="savingMap[row.id]"
              active-text="已开"
              inactive-text="未开"
              @change="(val) => updatePermission(row, 'vip', val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="今日提问" min-width="130" align="center">
          <template #default="{ row }">
            <span class="usage">
              {{
                row.isAdmin || row.permissions.vip
                  ? '无限'
                  : `${row.aiUsage?.count || 0}/${row.aiUsage?.limit || 10}`
              }}
            </span>
          </template>
        </el-table-column>
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.permissions-page {
  padding: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.permission-hero {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(125deg, rgba(15, 23, 42, 0.9), rgba(20, 83, 45, 0.42)),
    radial-gradient(circle at 90% 18%, rgba(34, 197, 94, 0.22), transparent 45%);
  padding: 1rem 1.2rem;
}

.hero-kicker {
  margin: 0;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.58);
}

.hero-copy h2 {
  margin: 0.2rem 0 0.55rem;
  color: #f8fafc;
  font-size: clamp(1.2rem, 2vw, 1.45rem);
}

.hero-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.875rem;
  line-height: 1.58;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.hero-stat {
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.45);
  padding: 0.7rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
}

.hero-stat-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.62);
}

.hero-stat-value {
  font-size: 1.15rem;
  color: #f8fafc;
  font-weight: 700;
}

.toolbar-card,
.table-card {
  border-radius: 0.95rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.55);
}

.toolbar-card {
  padding: 0.9rem 1rem;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  flex-wrap: wrap;
}

.search-input {
  width: min(100%, 320px);
}

.table-card {
  overflow: hidden;
}

.data-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(34, 197, 94, 0.12);
  --el-table-row-hover-bg-color: rgba(34, 197, 94, 0.09);
  --el-table-border-color: rgba(255, 255, 255, 0.08);
  --el-table-text-color: rgba(248, 250, 252, 0.9);
  --el-table-header-text-color: #bbf7d0;
}

.data-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.id-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.4rem;
  padding: 0.14rem 0.5rem;
  border-radius: 999px;
  font-size: 0.74rem;
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.2);
  border: 1px solid rgba(134, 239, 172, 0.3);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.72rem;
}

.avatar {
  width: 2.08rem;
  height: 2.08rem;
  border-radius: 0.62rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 700;
  color: #f8fafc;
  background: linear-gradient(135deg, #22c55e, #14b8a6);
}

.user-info {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.16rem;
}

.username {
  color: #f8fafc;
  font-weight: 600;
}

.nickname {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.62);
}

.usage {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.9);
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px rgba(34, 197, 94, 0.5);
}

@media (max-width: 1024px) {
  .permission-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-stats {
    grid-template-columns: 1fr;
  }
}
</style>
