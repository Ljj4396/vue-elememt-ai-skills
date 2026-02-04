<script setup>
import { ref, reactive, onMounted } from 'vue'
import { http } from '@/plugins/axios'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'

const loading = ref(false)
const users = ref([])
const savingMap = reactive({})

const normalizePermissions = (permissions = {}) => ({
  users: permissions?.users !== false,
  ai: permissions?.ai !== false,
  vip: permissions?.vip === true,
})

async function loadUsers() {
  loading.value = true
  try {
    const { data: res } = await http.get('/users')
    if (res.code === 0) {
      users.value = res.data.map((u) => ({
        ...u,
        permissions: normalizePermissions(u.permissions),
        isAdmin: u.isAdmin === true,
      }))
    } else {
      ElMessage.error(res.data?.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
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
    const { data: res } = await http.put(`/users/${row.id}`, { permissions: row.permissions })
    if (res.code === 0) {
      ElMessage.success('权限已更新')
    } else {
      throw new Error(res.data?.message || '更新失败')
    }
  } catch (e) {
    row.permissions[key] = previous
    ElMessage.error(e?.message || '更新失败')
  } finally {
    savingMap[row.id] = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <div class="permissions-page">
    <div class="toolbar-card">
      <div class="toolbar">
        <div class="title">
          <div class="title-main">账号权限控制</div>
          <div class="title-sub">控制用户管理与智能助手的访问权限</div>
        </div>
        <el-button :icon="Refresh" @click="loadUsers" :loading="loading">刷新</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="users" v-loading="loading" class="data-table" :max-height="'calc(100vh - 260px)'">
        <el-table-column prop="id" label="ID" width="80" align="center">
          <template #default="{ row }">
            <span class="id-tag">#{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar">{{ (row.nickname || row.username).charAt(0) }}</div>
              <div class="user-info">
                <span class="username">{{ row.username }}</span>
                <span class="nickname">
                  {{ row.nickname || '-' }}
                  <el-tag v-if="row.isAdmin" size="small" type="warning">超管</el-tag>
                </span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="用户管理" min-width="160" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.permissions.users"
              :loading="savingMap[row.id]"
              :disabled="row.isAdmin"
              active-text="允许"
              inactive-text="禁用"
              @change="(val) => updatePermission(row, 'users', val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="智能助手" min-width="160" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.permissions.ai"
              :loading="savingMap[row.id]"
              :disabled="row.isAdmin"
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
              :loading="savingMap[row.id]"
              :disabled="row.isAdmin"
              active-text="已开"
              inactive-text="未开"
              @change="(val) => updatePermission(row, 'vip', val)"
            />
          </template>
        </el-table-column>

        <el-table-column label="今日提问" min-width="140" align="center">
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
    </div>
  </div>
</template>

<style scoped>
.permissions-page {
  padding: 24px;
}

.toolbar-card {
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  margin-bottom: 20px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
}

.title-main {
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.title-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

.table-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: auto;
}

.data-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(139, 92, 246, 0.08);
  --el-table-row-hover-bg-color: rgba(139, 92, 246, 0.08);
  --el-table-border-color: rgba(255, 255, 255, 0.06);
  --el-table-text-color: rgba(255, 255, 255, 0.85);
  --el-table-header-text-color: #a78bfa;
}

.data-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.id-tag {
  padding: 2px 8px;
  background: rgba(139, 92, 246, 0.15);
  border-radius: 4px;
  font-size: 12px;
  color: #a78bfa;
  font-weight: 500;
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.avatar {
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
  flex-shrink: 0;
}

.user-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.username {
  font-weight: 500;
  color: #fff;
}

.nickname {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.usage {
  color: rgba(255, 255, 255, 0.8);
  font-weight: 500;
}
</style>
