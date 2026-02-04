<script setup>
import { ref, onMounted, computed } from 'vue'
import { http } from '@/plugins/axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete, Refresh, Phone, Message } from '@element-plus/icons-vue'

const loading = ref(false)
const users = ref([])
const searchKeyword = ref('')

// 弹窗
const dialogVisible = ref(false)
const dialogTitle = ref('新增用户')
const isEdit = ref(false)
const formRef = ref(null)
const form = ref({
  id: null,
  username: '',
  password: '',
  nickname: '',
  account: '',
  phone: '',
  email: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
}

// 过滤后的用户列表
const filteredUsers = computed(() => {
  if (!searchKeyword.value) return users.value
  const kw = searchKeyword.value.toLowerCase()
  return users.value.filter(
    (u) =>
      u.username?.toLowerCase().includes(kw) ||
      u.nickname?.toLowerCase().includes(kw) ||
      u.account?.toLowerCase().includes(kw) ||
      u.phone?.includes(kw) ||
      u.email?.toLowerCase().includes(kw)
  )
})

// 加载用户列表
async function loadUsers() {
  loading.value = true
  try {
    const { data: res } = await http.get('/users')
    if (res.code === 0) {
      users.value = res.data
    } else {
      ElMessage.error(res.data?.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    loading.value = false
  }
}

// 打开新增弹窗
function handleAdd() {
  isEdit.value = false
  dialogTitle.value = '新增用户'
  form.value = { id: null, username: '', password: '', nickname: '', account: '', phone: '', email: '' }
  dialogVisible.value = true
}

// 打开编辑弹窗
function handleEdit(row) {
  isEdit.value = true
  dialogTitle.value = '编辑用户'
  form.value = { ...row, password: '' }
  dialogVisible.value = true
}

// 提交表单
async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const payload = { ...form.value }
    if (isEdit.value && !payload.password) delete payload.password

    const { data: res } = isEdit.value
      ? await http.put(`/users/${form.value.id}`, payload)
      : await http.post('/users', payload)

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
      dialogVisible.value = false
      loadUsers()
    } else {
      ElMessage.error(res.data?.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    loading.value = false
  }
}

// 删除用户
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确定要删除用户「${row.nickname || row.username}」吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    loading.value = true
    const { data: res } = await http.delete(`/users/${row.id}`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      loadUsers()
    } else {
      ElMessage.error(res.data?.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  } finally {
    loading.value = false
  }
}

// 格式化时间
function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

onMounted(loadUsers)
</script>

<template>
  <div class="users-page">
    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-number">{{ users.length }}</div>
        <div class="stat-label">总用户数</div>
      </div>
      <div class="stat-card">
        <div class="stat-number">{{ filteredUsers.length }}</div>
        <div class="stat-label">当前显示</div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar-card">
      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名、昵称、账号、手机、邮箱..."
          clearable
          :prefix-icon="Search"
          class="search-input"
          style="width: 320px"
        />
        <div class="toolbar-actions">
          <el-button :icon="Refresh" @click="loadUsers" :loading="loading">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增用户</el-button>
        </div>
      </div>
    </div>

    <!-- 数据表格 -->
    <div class="table-card">
      <el-table :data="filteredUsers" v-loading="loading" class="data-table" :max-height="'calc(100vh - 360px)'">
        <el-table-column prop="id" label="ID" width="80" align="center">
          <template #default="{ row }">
            <span class="id-tag">#{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户名" min-width="140">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar">{{ (row.nickname || row.username).charAt(0) }}</div>
              <div class="user-info">
                <span class="username">{{ row.username }}</span>
                <span class="nickname">{{ row.nickname || '-' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="account" label="账号" min-width="100">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.account || '-' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="手机号" min-width="140">
          <template #default="{ row }">
            <div class="contact-cell" v-if="row.phone">
              <Phone class="contact-icon" />
              <span>{{ row.phone }}</span>
            </div>
            <span v-else class="empty">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="email" label="邮箱" min-width="180">
          <template #default="{ row }">
            <div class="contact-cell" v-if="row.email">
              <Message class="contact-icon" />
              <span>{{ row.email }}</span>
            </div>
            <span v-else class="empty">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            <span class="time">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="编辑" placement="top">
              <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(row)" />
            </el-tooltip>
            <el-tooltip content="删除" placement="top">
              <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="isEdit ? '留空表示不修改' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="账号" prop="account">
          <el-input v-model="form.account" placeholder="请输入账号" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="loading">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page {
  padding: 24px;
}

/* 统计卡片 */
.stats-row {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.stat-card {
  flex: 1;
  max-width: 200px;
  padding: 20px 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #8b5cf6;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
  margin-top: 4px;
}

/* 工具栏 */
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

.search-input :deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

.search-input :deep(.el-input__wrapper:hover),
.search-input :deep(.el-input__wrapper.is-focus) {
  border-color: #8b5cf6;
}

.search-input :deep(.el-input__inner) {
  color: #fff;
}

.search-input :deep(.el-input__inner::placeholder) {
  color: rgba(255, 255, 255, 0.3);
}

.toolbar-actions {
  display: flex;
  gap: 10px;
}

/* 表格卡片 */
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

.contact-cell {
  display: flex;
  align-items: center;
  gap: 6px;
}

.contact-icon {
  width: 14px;
  height: 14px;
  color: #8b5cf6;
  flex-shrink: 0;
}

.empty {
  color: rgba(255, 255, 255, 0.3);
}

.time {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

/* 弹窗样式 */
:deep(.el-dialog) {
  background: #1a1a24;
  border: 1px solid rgba(139, 92, 246, 0.2);
  border-radius: 12px;
}

:deep(.el-dialog__header) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding: 16px 20px;
}

:deep(.el-dialog__title) {
  color: #fff;
  font-weight: 600;
}

:deep(.el-dialog__body) {
  padding: 20px;
}

:deep(.el-dialog__footer) {
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding: 12px 20px;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: none;
}

:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  border-color: #8b5cf6;
}

:deep(.el-input__inner) {
  color: #fff;
}

/* 响应式 */
@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: stretch;
  }

  .search-input {
    width: 100% !important;
  }

  .stats-row {
    flex-wrap: wrap;
  }

  .stat-card {
    min-width: 120px;
  }
}
</style>
