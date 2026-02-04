<script setup>
import { ref, onMounted } from 'vue'
import { http } from '@/plugins/axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download, Delete } from '@element-plus/icons-vue'
import * as XLSX from 'xlsx'

const loading = ref(false)
const listLoading = ref(false)
const uploads = ref([])
const current = ref(null)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const fileName = ref('')
const columns = ref([])
const rows = ref([])
const mode = ref('raw')
const summary = ref(null)

const resetData = () => {
  current.value = null
  columns.value = []
  rows.value = []
  mode.value = 'raw'
  summary.value = null
}

const setCurrent = (entry) => {
  if (!entry) {
    resetData()
    return
  }
  current.value = entry
  fileName.value = entry.fileName || ''
  columns.value = entry.data?.columns || []
  rows.value = entry.data?.rows || []
  mode.value = entry.mode || entry.data?.mode || 'raw'
  summary.value = entry.summary || entry.data?.summary || null
}

const formatTime = (ts) => {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('zh-CN') + ' ' + d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}

const fetchUploads = async () => {
  listLoading.value = true
  try {
    const { data: res } = await http.get('/balance/list', {
      params: { page: page.value, pageSize: pageSize.value },
    })
    if (res.code === 0) {
      uploads.value = res.data.list || []
      total.value = res.data.total || 0
      if (!current.value) {
        setCurrent(uploads.value[0])
      } else if (!uploads.value.some((item) => item.id === current.value?.id)) {
        setCurrent(uploads.value[0])
      }
    } else {
      ElMessage.error(res.data?.message || '加载失败')
    }
  } catch (e) {
    ElMessage.error('加载失败，请检查网络')
  } finally {
    listLoading.value = false
  }
}

const handleUpload = async ({ file }) => {
  if (!file) return
  loading.value = true
  fileName.value = file.name || ''
  try {
    const formData = new FormData()
    formData.append('file', file)
    const { data: res } = await http.post('/balance/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res.code === 0) {
      setCurrent(res.data)
      if ((res.data.mode || 'raw') === 'raw') {
        ElMessage.info('未识别到余额表结构，已按原表展示')
      }
      page.value = 1
      await fetchUploads()
    } else {
      ElMessage.error(res.data?.message || '解析失败')
    }
  } catch (e) {
    ElMessage.error('上传失败，请检查网络')
  } finally {
    loading.value = false
  }
}

const exportExcel = () => {
  if (!rows.value.length) {
    ElMessage.warning('暂无可导出的数据')
    return
  }
  const headers = columns.value.map((c) => c.label)
  const exportRows = rows.value.map((row) => {
    const obj = {}
    columns.value.forEach((col) => {
      obj[col.label] = row[col.key]
    })
    return obj
  })
  const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: headers })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, mode.value === 'balance' ? '余额表' : '原始表')
  const name = fileName.value ? fileName.value.replace(/\.\w+$/, '') : '余额表'
  XLSX.writeFile(workbook, `${name}-余额表.xlsx`)
}

const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.fileName || row.sheetName || row.id}」吗？`, '删除确认', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    })
    const { data: res } = await http.delete(`/balance/${row.id}`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      if (current.value?.id === row.id) {
        setCurrent(null)
      }
      await fetchUploads()
    } else {
      ElMessage.error(res.data?.message || '删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') ElMessage.error('操作失败')
  }
}

const handlePageChange = (val) => {
  page.value = val
  fetchUploads()
}

onMounted(fetchUploads)
</script>

<template>
  <div class="balance-page">
    <div class="toolbar-card">
      <div class="toolbar">
        <div class="title">
          <div class="title-main">余额表</div>
          <div class="title-sub">上传 Excel 并生成余额表，可导出下载</div>
        </div>
        <div class="toolbar-actions">
          <el-upload
            :show-file-list="false"
            :http-request="handleUpload"
            accept=".xlsx,.xls"
          >
            <el-button type="primary" :icon="Upload" :loading="loading">上传 Excel</el-button>
          </el-upload>
          <el-button :icon="Download" @click="exportExcel" :disabled="!rows.length">
            导出余额表
          </el-button>
        </div>
      </div>
    </div>

    <div class="table-card uploads-card">
      <el-table
        :data="uploads"
        v-loading="listLoading"
        class="data-table"
        :max-height="'calc(100vh - 420px)'"
        @row-click="setCurrent"
      >
        <el-table-column prop="fileName" label="文件名" min-width="200" />
        <el-table-column prop="sheetName" label="工作表" min-width="160" />
        <el-table-column prop="rowCount" label="行数" width="90" align="center" />
        <el-table-column label="上传时间" width="160" align="center">
          <template #default="{ row }">
            <span class="time">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" align="center">
          <template #default="{ row }">
            <el-button type="primary" link @click.stop="setCurrent(row)">查看</el-button>
            <el-button type="danger" link :icon="Delete" @click.stop="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
        <template #empty>
          <div class="empty">暂无上传记录</div>
        </template>
      </el-table>
      <div class="pagination">
        <el-pagination
          background
          layout="prev, pager, next"
          :page-size="pageSize"
          :current-page="page"
          :total="total"
          @current-change="handlePageChange"
        />
      </div>
    </div>

    <div v-if="summary" class="summary-card">
      <div class="summary-item">
        <span class="label">借方合计</span>
        <span class="value">{{ summary.debit }}</span>
      </div>
      <div class="summary-item">
        <span class="label">贷方合计</span>
        <span class="value">{{ summary.credit }}</span>
      </div>
      <div class="summary-item">
        <span class="label">余额合计</span>
        <span class="value">{{ summary.balance }}</span>
      </div>
    </div>

    <div class="table-card">
      <el-table :data="rows" v-loading="loading" class="data-table" :max-height="'calc(100vh - 360px)'">
        <el-table-column
          v-for="col in columns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          min-width="120"
        />
        <template #empty>
          <div class="empty">请选择一条记录查看详情</div>
        </template>
      </el-table>
    </div>
  </div>
</template>

<style scoped>
.balance-page {
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

.toolbar-actions {
  display: flex;
  gap: 10px;
}

.summary-card {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.summary-item {
  flex: 1;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  padding: 16px 20px;
}

.summary-item .label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.5);
}

.summary-item .value {
  display: block;
  margin-top: 6px;
  font-size: 20px;
  font-weight: 600;
  color: #a78bfa;
}

.table-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  overflow: auto;
}

.uploads-card {
  margin-bottom: 20px;
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

.empty {
  padding: 40px 0;
  color: rgba(255, 255, 255, 0.5);
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px 16px;
}
</style>
