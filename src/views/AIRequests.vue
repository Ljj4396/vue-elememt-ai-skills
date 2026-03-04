<script setup>
import { ref, onMounted } from 'vue'
import { http } from '@/plugins/axios'
import { ElMessage } from 'element-plus'
import { Refresh, Check, Close } from '@element-plus/icons-vue'

const loading = ref(false)
const requests = ref([])
const actionLoading = ref({})

const statusMap = {
  pending: { label: '待审核', type: 'warning' },
  approved: { label: '已通过', type: 'success' },
  rejected: { label: '已拒绝', type: 'danger' },
}

const formatTime = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

async function loadRequests() {
  loading.value = true
  try {
    const { data: res } = await http.get('/ai/requests')
    if (res.code === 0) {
      requests.value = res.data || []
    } else {
      ElMessage.error(res.data?.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    loading.value = false
  }
}

async function approveRequest(row) {
  if (actionLoading.value[row.id]) return
  actionLoading.value[row.id] = true
  try {
    const { data: res } = await http.put(`/ai/requests/${row.id}/approve`)
    if (res.code === 0) {
      ElMessage.success('已通过')
      loadRequests()
    } else {
      ElMessage.error(res.data?.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    actionLoading.value[row.id] = false
  }
}

async function rejectRequest(row) {
  if (actionLoading.value[row.id]) return
  actionLoading.value[row.id] = true
  try {
    const { data: res } = await http.put(`/ai/requests/${row.id}/reject`)
    if (res.code === 0) {
      ElMessage.success('已拒绝')
      loadRequests()
    } else {
      ElMessage.error(res.data?.message || '操作失败')
    }
  } catch (e) {
    ElMessage.error('网络错误')
  } finally {
    actionLoading.value[row.id] = false
  }
}

onMounted(loadRequests)
</script>

<template>
  <div class="requests-page">
    <div class="toolbar-card">
      <div class="toolbar">
        <div class="title">
          <div class="title-main">VIP 权限申请</div>
          <div class="title-sub">查看并处理智能助手的权限申请</div>
        </div>
        <el-button :icon="Refresh" @click="loadRequests" :loading="loading">刷新</el-button>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="requests" v-loading="loading" class="data-table" :max-height="'calc(100vh - 260px)'">
        <el-table-column prop="id" label="ID" width="80" align="center">
          <template #default="{ row }">
            <span class="id-tag">#{{ row.id }}</span>
          </template>
        </el-table-column>

        <el-table-column label="用户" min-width="180">
          <template #default="{ row }">
            <div class="user-cell">
              <div class="avatar">{{ (row.nickname || row.username || 'U').charAt(0) }}</div>
              <div class="user-info">
                <span class="username">{{ row.username }}</span>
                <span class="nickname">{{ row.nickname || '-' }}</span>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="reason" label="申请原因" min-width="240">
          <template #default="{ row }">
            <div class="reason">{{ row.reason || '-' }}</div>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="statusMap[row.status]?.type || 'info'" size="small">
              {{ statusMap[row.status]?.label || '未知' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="申请时间" width="160" align="center">
          <template #default="{ row }">
            <span class="time">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="160" align="center">
          <template #default="{ row }">
            <el-button
              type="success"
              size="small"
              :icon="Check"
              :loading="actionLoading[row.id]"
              :disabled="row.status !== 'pending'"
              @click="approveRequest(row)"
            >
              通过
            </el-button>
            <el-button
              type="danger"
              size="small"
              :icon="Close"
              :loading="actionLoading[row.id]"
              :disabled="row.status !== 'pending'"
              @click="rejectRequest(row)"
            >
              拒绝
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>
  </div>
</template>
