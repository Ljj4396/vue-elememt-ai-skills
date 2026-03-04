<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { http } from '@/plugins/axios'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Download, Delete, Document } from '@element-plus/icons-vue'
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
const listTableHeight = ref('260px')
const dataTableHeight = ref('520px')

const parsedModeLabel = computed(() => (mode.value === 'balance' ? '余额模式' : '原始模式'))
const selectedTitle = computed(() => current.value?.fileName || fileName.value || '未选择文件')
const summaryCards = computed(() => {
  if (!summary.value) return []
  return [
    { key: 'debit', label: '借方合计', value: summary.value.debit ?? '-' },
    { key: 'credit', label: '贷方合计', value: summary.value.credit ?? '-' },
    { key: 'balance', label: '余额合计', value: summary.value.balance ?? '-' },
  ]
})

function resetData() {
  current.value = null
  fileName.value = ''
  columns.value = []
  rows.value = []
  mode.value = 'raw'
  summary.value = null
}

function setCurrent(entry) {
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

function formatTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return `${d.toLocaleDateString('zh-CN')} ${d.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })}`
}

async function fetchUploads() {
  listLoading.value = true
  try {
    const { data: res } = await http.get('/balance/list', {
      params: { page: page.value, pageSize: pageSize.value },
    })

    if (res.code === 0) {
      uploads.value = res.data?.list || []
      total.value = res.data?.total || 0

      if (!current.value && uploads.value.length > 0) {
        setCurrent(uploads.value[0])
      } else if (
        current.value &&
        !uploads.value.some((item) => item.id === current.value?.id) &&
        uploads.value.length > 0
      ) {
        setCurrent(uploads.value[0])
      } else if (uploads.value.length === 0) {
        resetData()
      }
    } else {
      ElMessage.error(res.data?.message || '加载上传记录失败')
    }
  } catch (error) {
    ElMessage.error('加载失败，请检查网络连接')
    console.error('fetchUploads failed', error)
  } finally {
    listLoading.value = false
  }
}

async function handleUpload({ file }) {
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
        ElMessage.info('未识别到余额表结构，已按原始表格展示')
      } else {
        ElMessage.success('余额表解析成功')
      }
      page.value = 1
      await fetchUploads()
    } else {
      ElMessage.error(res.data?.message || '上传解析失败')
    }
  } catch (error) {
    ElMessage.error('上传失败，请稍后重试')
    console.error('handleUpload failed', error)
  } finally {
    loading.value = false
  }
}

function exportExcel() {
  if (!rows.value.length || !columns.value.length) {
    ElMessage.warning('当前没有可导出的数据')
    return
  }

  const exportRows = rows.value.map((row) => {
    const record = {}
    columns.value.forEach((col) => {
      record[col.label] = row[col.key]
    })
    return record
  })

  const worksheet = XLSX.utils.json_to_sheet(exportRows, {
    header: columns.value.map((col) => col.label),
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, mode.value === 'balance' ? '余额表' : '原始表')

  const plainFileName = fileName.value ? fileName.value.replace(/\.\w+$/, '') : '余额表'
  XLSX.writeFile(workbook, `${plainFileName}-导出.xlsx`)
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(
      `确定删除记录「${row.fileName || row.sheetName || row.id}」吗？`,
      '删除确认',
      {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning',
      },
    )
    const { data: res } = await http.delete(`/balance/${row.id}`)
    if (res.code === 0) {
      ElMessage.success('删除成功')
      if (current.value?.id === row.id) {
        resetData()
      }
      await fetchUploads()
    } else {
      ElMessage.error(res.data?.message || '删除失败')
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
      console.error('handleDelete failed', error)
    }
  }
}

function handlePageChange(val) {
  page.value = val
  fetchUploads()
}

function updateTableHeights() {
  const viewportHeight = window.innerHeight
  listTableHeight.value = `${Math.max(200, Math.round(viewportHeight * 0.24))}px`
  dataTableHeight.value = `${Math.max(280, viewportHeight - 520)}px`
}

onMounted(() => {
  fetchUploads()
  updateTableHeights()
  window.addEventListener('resize', updateTableHeights)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateTableHeights)
})
</script>

<template>
  <div class="balance-page">
    <section class="balance-hero">
      <div class="hero-copy">
        <p class="hero-kicker">Balance Workspace</p>
        <h2>余额表解析与导出</h2>
        <p>上传 Excel 后自动识别并生成可导出的余额明细，支持原始表和余额表双模式。</p>
      </div>
      <div class="hero-meta">
        <article class="meta-card">
          <span class="meta-label">记录总数</span>
          <strong class="meta-value">{{ total }}</strong>
        </article>
        <article class="meta-card">
          <span class="meta-label">当前模式</span>
          <strong class="meta-value">{{ parsedModeLabel }}</strong>
        </article>
      </div>
    </section>

    <section class="toolbar-card">
      <div class="toolbar">
        <div class="title">
          <div class="title-main">上传与导出</div>
          <div class="title-sub">支持 `.xlsx` / `.xls` 文件上传</div>
        </div>
        <div class="toolbar-actions">
          <el-upload :show-file-list="false" :http-request="handleUpload" accept=".xlsx,.xls">
            <el-button type="primary" :icon="Upload" :loading="loading">上传 Excel</el-button>
          </el-upload>
          <el-button :icon="Download" @click="exportExcel" :disabled="!rows.length">导出当前数据</el-button>
        </div>
      </div>
    </section>

    <section class="table-card uploads-card">
      <el-table
        :data="uploads"
        row-key="id"
        v-loading="listLoading"
        class="data-table"
        :max-height="listTableHeight"
        @row-click="setCurrent"
      >
        <el-table-column prop="fileName" label="文件名" min-width="220" />
        <el-table-column prop="sheetName" label="工作表" min-width="160" />
        <el-table-column prop="mode" label="模式" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.mode === 'balance' ? 'success' : 'info'">
              {{ row.mode === 'balance' ? '余额模式' : '原始模式' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rowCount" label="行数" width="90" align="center" />
        <el-table-column label="上传时间" width="170" align="center">
          <template #default="{ row }">
            <span class="time">{{ formatTime(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" align="center">
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
    </section>

    <section v-if="summaryCards.length" class="summary-card">
      <article v-for="item in summaryCards" :key="item.key" class="summary-item">
        <span class="summary-label">{{ item.label }}</span>
        <strong class="summary-value">{{ item.value }}</strong>
      </article>
    </section>

    <section class="table-card">
      <header class="detail-header">
        <div class="detail-title">
          <Document class="detail-icon" />
          <span>{{ selectedTitle }}</span>
        </div>
        <el-tag size="small" type="warning">{{ parsedModeLabel }}</el-tag>
      </header>
      <el-table :data="rows" v-loading="loading" class="data-table" :max-height="dataTableHeight">
        <el-table-column
          v-for="col in columns"
          :key="col.key"
          :prop="col.key"
          :label="col.label"
          min-width="120"
        />
        <template #empty>
          <div class="empty">请先上传或选择一条记录查看明细</div>
        </template>
      </el-table>
    </section>
  </div>
</template>

<style scoped>
.balance-page {
  padding: clamp(1rem, 2vw, 1.5rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.balance-hero {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 1rem;
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(130deg, rgba(15, 23, 42, 0.9), rgba(180, 83, 9, 0.42)),
    radial-gradient(circle at 88% 20%, rgba(251, 191, 36, 0.23), transparent 45%);
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
  margin: 0.22rem 0 0.55rem;
  color: #f8fafc;
  font-size: clamp(1.2rem, 2vw, 1.45rem);
}

.hero-copy p {
  margin: 0;
  color: rgba(255, 255, 255, 0.72);
  font-size: 0.875rem;
  line-height: 1.58;
}

.hero-meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.65rem;
}

.meta-card {
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.42);
  padding: 0.7rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.meta-label {
  font-size: 0.72rem;
  color: rgba(255, 255, 255, 0.62);
}

.meta-value {
  font-size: 1.1rem;
  font-weight: 700;
  color: #f8fafc;
}

.toolbar-card,
.table-card,
.summary-card {
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
  gap: 0.8rem;
  flex-wrap: wrap;
}

.title-main {
  font-size: 1rem;
  color: #f8fafc;
  font-weight: 600;
}

.title-sub {
  margin-top: 0.18rem;
  font-size: 0.76rem;
  color: rgba(255, 255, 255, 0.62);
}

.toolbar-actions {
  display: flex;
  gap: 0.6rem;
}

.table-card {
  overflow: hidden;
}

.uploads-card {
  padding-bottom: 0.45rem;
}

.data-table {
  --el-table-bg-color: transparent;
  --el-table-tr-bg-color: transparent;
  --el-table-header-bg-color: rgba(251, 191, 36, 0.14);
  --el-table-row-hover-bg-color: rgba(251, 191, 36, 0.09);
  --el-table-border-color: rgba(255, 255, 255, 0.08);
  --el-table-text-color: rgba(248, 250, 252, 0.9);
  --el-table-header-text-color: #fde68a;
}

.data-table :deep(.el-table__inner-wrapper::before) {
  display: none;
}

.time {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.58);
}

.empty {
  color: rgba(255, 255, 255, 0.45);
  padding: 1rem 0;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding: 0.65rem 0.75rem 0.2rem;
}

.summary-card {
  padding: 0.9rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.65rem;
}

.summary-item {
  border-radius: 0.75rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(15, 23, 42, 0.4);
  padding: 0.7rem 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.summary-label {
  font-size: 0.74rem;
  color: rgba(255, 255, 255, 0.62);
}

.summary-value {
  font-size: 1.05rem;
  color: #f8fafc;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
}

.detail-title span {
  color: #f8fafc;
  font-size: 0.88rem;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.detail-icon {
  width: 1rem;
  height: 1rem;
  color: #f59e0b;
  flex-shrink: 0;
}

@media (max-width: 1024px) {
  .balance-hero {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 680px) {
  .hero-meta,
  .summary-card {
    grid-template-columns: 1fr;
  }

  .toolbar-actions {
    width: 100%;
  }
}
</style>
