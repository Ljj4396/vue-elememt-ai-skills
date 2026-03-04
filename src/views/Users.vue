<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { http } from '@/plugins/axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Edit, Delete, Refresh, Phone, Message } from '@element-plus/icons-vue'

const listLoading = ref(false)
const submitLoading = ref(false)
const users = ref([])
const searchKeyword = ref('')
const tableHeight = ref('560px')

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

const filteredUsers = computed(() => {
  const keyword = searchKeyword.value.trim().toLowerCase()
  if (!keyword) return users.value
  return users.value.filter((item) => {
    return (
      item.username?.toLowerCase().includes(keyword) ||
      item.nickname?.toLowerCase().includes(keyword) ||
      item.account?.toLowerCase().includes(keyword) ||
      item.phone?.includes(keyword) ||
      item.email?.toLowerCase().includes(keyword)
    )
  })
})

const stats = computed(() => {
  const total = users.value.length
  const visible = filteredUsers.value.length
  const contactBound = users.value.filter((item) => item.phone || item.email).length
  return { total, visible, contactBound }
})

async function loadUsers() {
  listLoading.value = true
  try {
    const { data: res } = await http.get('/users')
    if (res.code === 0) {
      users.value = Array.isArray(res.data) ? res.data : []
    } else {
      ElMessage.error(res.data?.message || '加载用户失败')
    }
  } catch (error) {
    ElMessage.error('网络错误，请稍后重试')
    console.error('loadUsers failed', error)
  } finally {
    listLoading.value = false
  }
}

function handleAdd() {
  isEdit.value = false
  dialogTitle.value = '新增用户'
  form.value = {
    id: null,
    username: '',
    password: '',
    nickname: '',
    account: '',
    phone: '',
    email: '',
  }
  dialogVisible.value = true
}

function handleEdit(row) {
  isEdit.value = true
  dialogTitle.value = '编辑用户'
  form.value = {
    ...row,
    password: '',
  }
  dialogVisible.value = true
}

async function handleSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  submitLoading.value = true
  try {
    const payload = { ...form.value }
    if (isEdit.value && !payload.password) {
      delete payload.password
    }

    const request = isEdit.value
      ? http.put(`/users/${form.value.id}`, payload)
      : http.post('/users', payload)
    const { data: res } = await request

    if (res.code === 0) {
      ElMessage.success(isEdit.value ? '用户信息已更新' : '用户创建成功')
      dialogVisible.value = false
      await loadUsers()
    } else {
      ElMessage.error(res.data?.message || '保存失败')
    }
  } catch (error) {
    ElMessage.error('保存失败，请稍后再试')
    console.error('handleSubmit failed', error)
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定要删除用户「${row.nickname || row.username}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )

    listLoading.value = true
    const { data: res } = await http.delete(`/users/${row.id}`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      await loadUsers()
    } else {
      ElMessage.error(res.data?.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error('handleDelete failed', error)
    }
  } finally {
    listLoading.value = false
  }
}

function formatTime(ts) {
  if (!ts) return '-'
  const date = new Date(ts)
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}

function updateTableHeight() {
  const offset = 360
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
  <div class="users-page">
    <section class="users-hero">
      <div class="hero-copy">
        <p class="hero-kicker">User Center</p>
        <h2>用户与账号管理</h2>
        <p>支持搜索、编辑、创建与删除用户，面向运营后台的高频管理场景。</p>
      </div>
      <div class="hero-stats">
        <article class="hero-stat">
          <span class="hero-stat-label">用户总数</span>
          <strong class="hero-stat-value">{{ stats.total }}</strong>
        </article>
        <article class="hero-stat">
          <span class="hero-stat-label">当前显示</span>
          <strong class="hero-stat-value">{{ stats.visible }}</strong>
        </article>
        <article class="hero-stat">
          <span class="hero-stat-label">已绑定联系方式</span>
          <strong class="hero-stat-value">{{ stats.contactBound }}</strong>
        </article>
      </div>
    </section>

    <section class="toolbar-card">
      <div class="toolbar">
        <el-input
          v-model="searchKeyword"
          placeholder="搜索用户名、昵称、账号、手机号、邮箱"
          clearable
          :prefix-icon="Search"
          class="search-input"
        />
        <div class="toolbar-actions">
          <el-button :icon="Refresh" @click="loadUsers" :loading="listLoading">刷新</el-button>
          <el-button type="primary" :icon="Plus" @click="handleAdd">新增用户</el-button>
        </div>
      </div>
    </section>

    <section class="table-card">
      <el-table
        :data="filteredUsers"
        row-key="id"
        v-loading="listLoading"
        class="data-table"
        :max-height="tableHeight"
      >
        <el-table-column prop="id" label="ID" width="80" align="center">
          <template #default="{ row }">
            <span class="id-tag">#{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column prop="username" label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar">{{ (row.nickname || row.username || 'U').charAt(0) }}</div>
              <div class="user-info">
                <span class="username">{{ row.username }}</span>
                <span class="nickname">{{ row.nickname || '未设置昵称' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="account" label="账号" min-width="120">
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.account || '-' }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="phone" label="手机号" min-width="150">
          <template #default="{ row }">
            <div v-if="row.phone" class="contact-cell">
              <Phone class="contact-icon" />
              <span>{{ row.phone }}</span>
            </div>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="email" label="邮箱" min-width="210">
          <template #default="{ row }">
            <div v-if="row.email" class="contact-cell">
              <Message class="contact-icon" />
              <span>{{ row.email }}</span>
            </div>
            <span v-else class="empty-text">-</span>
          </template>
        </el-table-column>

        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            <span class="time">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="150" fixed="right" align="center">
          <template #default="{ row }">
            <el-tooltip content="编辑用户" placement="top">
              <el-button type="primary" :icon="Edit" circle size="small" @click="handleEdit(row)" />
            </el-tooltip>
            <el-tooltip content="删除用户" placement="top">
              <el-button type="danger" :icon="Delete" circle size="small" @click="handleDelete(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
      </el-table>
    </section>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" :disabled="isEdit" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input
            v-model="form.password"
            type="password"
            show-password
            :placeholder="isEdit ? '留空表示不修改密码' : '请输入密码'"
          />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="账号">
          <el-input v-model="form.account" placeholder="请输入业务账号" />
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
        <el-button type="primary" @click="handleSubmit" :loading="submitLoading">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.users-page {
  padding: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.users-hero {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 1rem;
  padding: 1rem 1.2rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(130deg, rgba(15, 23, 42, 0.86), rgba(30, 58, 138, 0.48)),
    radial-gradient(circle at 85% 20%, rgba(14, 165, 233, 0.2), transparent 45%);
}

.hero-copy h2 {
  margin: 0.2rem 0 0.55rem;
  font-size: clamp(1.2rem, 2vw, 1.5rem);
  color: #f8fafc;
}

.hero-copy p {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.74);
}

.hero-kicker {
  margin: 0;
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(255, 255, 255, 0.58);
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.hero-stat {
  padding: 0.75rem;
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(15, 23, 42, 0.42);
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.hero-stat-label {
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.62);
}

.hero-stat-value {
  font-size: 1.18rem;
  font-weight: 700;
  color: #f8fafc;
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
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-input {
  width: min(100%, 360px);
}

.toolbar-actions {
  display: flex;
  gap: 0.6rem;
}

.table-card {
  overflow: hidden;
}

.data-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(56, 189, 248, 0.12);
  --el-table-row-hover-bg-color: rgba(56, 189, 248, 0.08);
  --el-table-border-color: rgba(255, 255, 255, 0.08);
  --el-table-text-color: rgba(248, 250, 252, 0.9);
  --el-table-header-text-color: #bae6fd;
}

.data-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.id-tag {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.6rem;
  padding: 0.12rem 0.5rem;
  border-radius: 999px;
  font-size: 0.74rem;
  color: #bae6fd;
  background: rgba(14, 165, 233, 0.18);
  border: 1px solid rgba(125, 211, 252, 0.28);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.avatar {
  width: 2.1rem;
  height: 2.1rem;
  border-radius: 0.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.86rem;
  font-weight: 700;
  color: #f8fafc;
  background: linear-gradient(135deg, #2563eb, #06b6d4);
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
  line-height: 1.2;
}

.nickname {
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.62);
}

.contact-cell {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  min-width: 0;
}

.contact-icon {
  width: 0.86rem;
  height: 0.86rem;
  color: #38bdf8;
  flex-shrink: 0;
}

.contact-cell span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-text {
  color: rgba(255, 255, 255, 0.4);
}

.time {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.58);
}

:deep(.el-input__wrapper) {
  background: rgba(255, 255, 255, 0.04);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
}

:deep(.el-input__wrapper:hover),
:deep(.el-input__wrapper.is-focus) {
  box-shadow: inset 0 0 0 1px rgba(56, 189, 248, 0.45);
}

:deep(.el-dialog) {
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.96);
}

:deep(.el-dialog__title) {
  color: #f8fafc;
}

:deep(.el-form-item__label) {
  color: rgba(255, 255, 255, 0.75);
}

:deep(.el-input__inner) {
  color: #f8fafc;
}

@media (max-width: 1024px) {
  .users-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-stats {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    width: 100%;
  }
}
</style>
