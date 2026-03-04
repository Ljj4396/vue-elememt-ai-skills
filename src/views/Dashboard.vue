<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { http } from '@/plugins/axios'
import {
  User,
  DataLine,
  Monitor,
  Clock,
  Setting,
  MagicStick,
  ChatDotRound,
  Money,
} from '@element-plus/icons-vue'

const stats = ref({
  totalUsers: 0,
  todayLogins: 28,
  systemStatus: '正常运行',
  uptime: 99.9,
})
const currentTime = ref('')
const greeting = ref('')
let timerId

const statCards = computed(() => [
  {
    key: 'users',
    label: '用户总数',
    value: String(stats.value.totalUsers),
    trend: '+12%',
    icon: User,
    tone: 'users',
  },
  {
    key: 'logins',
    label: '今日登录',
    value: String(stats.value.todayLogins),
    trend: '+5%',
    icon: DataLine,
    tone: 'logins',
  },
  {
    key: 'status',
    label: '系统状态',
    value: stats.value.systemStatus,
    icon: Monitor,
    tone: 'system',
    isStatus: true,
  },
  {
    key: 'uptime',
    label: '运行时长',
    value: `${stats.value.uptime}%`,
    icon: Clock,
    tone: 'uptime',
  },
])

const quickActions = [
  { to: '/balance', title: '余额表', desc: '查看财务记录', icon: Money },
  { to: '/ai', title: '智能助手', desc: '处理 AI 对话', icon: ChatDotRound },
  { to: '/fortune', title: '每日运势', desc: '浏览今日卡片', icon: MagicStick },
  { to: '/theme', title: '主题选择', desc: '切换页面风格', icon: Setting },
]

async function loadStats() {
  try {
    const { data: res } = await http.get('/users')
    if (res.code === 0) {
      stats.value.totalUsers = res.data.length
      stats.value.todayLogins = Math.max(12, Math.round(res.data.length * 0.18))
    }
  } catch (error) {
    console.error('加载统计失败', error)
  }
}

function updateTime() {
  const now = new Date()
  currentTime.value = now.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const hour = now.getHours()
  if (hour < 6) greeting.value = '夜深了'
  else if (hour < 9) greeting.value = '早上好'
  else if (hour < 12) greeting.value = '上午好'
  else if (hour < 14) greeting.value = '中午好'
  else if (hour < 18) greeting.value = '下午好'
  else if (hour < 22) greeting.value = '晚上好'
  else greeting.value = '夜深了'
}

onMounted(() => {
  loadStats()
  updateTime()
  timerId = window.setInterval(updateTime, 1000)
})

onBeforeUnmount(() => {
  if (timerId) {
    window.clearInterval(timerId)
  }
})
</script>

<template>
  <div class="dashboard">
    <section class="welcome-section">
      <div class="welcome-copy">
        <p class="welcome-kicker">Dashboard</p>
        <h1>{{ greeting }}，欢迎回来</h1>
        <p class="welcome-time">{{ currentTime }}</p>
        <div class="welcome-kpis" aria-label="概览指标">
          <span>在线率 {{ stats.uptime }}%</span>
          <span>活跃用户 {{ stats.todayLogins }}</span>
          <span>系统 {{ stats.systemStatus }}</span>
        </div>
      </div>
      <div class="welcome-glow" aria-hidden="true"></div>
    </section>

    <section class="stats-wrap" aria-label="统计卡片">
      <div class="stats-grid">
        <article v-for="card in statCards" :key="card.key" class="stat-card">
          <div class="stat-icon" :class="card.tone">
            <component :is="card.icon" />
          </div>
          <div class="stat-info">
            <span class="stat-value" :class="{ status: card.isStatus }">{{ card.value }}</span>
            <span class="stat-label">{{ card.label }}</span>
          </div>
          <div v-if="card.trend" class="stat-trend up">{{ card.trend }}</div>
          <div v-if="card.isStatus" class="stat-indicator online"></div>
        </article>
      </div>
    </section>

    <section class="quick-actions">
      <h2 class="section-title">快捷操作</h2>
      <div class="actions-grid">
        <router-link v-for="action in quickActions" :key="action.to" :to="action.to" class="action-card">
          <div class="action-icon">
            <component :is="action.icon" />
          </div>
          <div class="action-text">
            <span class="action-title">{{ action.title }}</span>
            <span class="action-desc">{{ action.desc }}</span>
          </div>
        </router-link>
      </div>
    </section>
  </div>
</template>

<style scoped>
.dashboard {
  padding: clamp(1rem, 2vw, 1.5rem);
  min-height: calc(100vh - 4rem);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.welcome-section {
  position: relative;
  padding: clamp(1.25rem, 3vw, 2rem);
  border-radius: 1rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background:
    linear-gradient(130deg, rgba(30, 41, 59, 0.72), rgba(88, 28, 135, 0.5)),
    radial-gradient(circle at 85% 20%, rgba(59, 130, 246, 0.26), transparent 45%);
  overflow: hidden;
  backdrop-filter: blur(10px);
}

.welcome-copy {
  position: relative;
  z-index: 1;
  max-width: 44rem;
}

.welcome-kicker {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: rgba(255, 255, 255, 0.62);
}

.welcome-copy h1 {
  margin: 0;
  font-size: clamp(1.4rem, 3vw, 1.95rem);
  line-height: 1.25;
  color: #fff;
}

.welcome-time {
  margin: 0.55rem 0 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.74);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.welcome-kpis {
  margin-top: 1rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.625rem;
}

.welcome-kpis span {
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.09);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.88);
  font-size: 0.75rem;
}

.welcome-glow {
  position: absolute;
  right: -3.5rem;
  top: -3rem;
  width: 12.5rem;
  height: 12.5rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.5), transparent 70%);
  filter: blur(2px);
  opacity: 0.75;
}

.stats-wrap {
  animation: fade-up 0.4s ease-out both;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.stat-card {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.875rem;
  padding: 1rem;
  border-radius: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.45);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  border-color: rgba(139, 92, 246, 0.35);
  background: rgba(30, 41, 59, 0.56);
}

.stat-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 0.75rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.375rem;
}

.stat-icon.users {
  color: #a78bfa;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(99, 102, 241, 0.08));
}

.stat-icon.logins {
  color: #60a5fa;
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(6, 182, 212, 0.08));
}

.stat-icon.system {
  color: #34d399;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(34, 197, 94, 0.08));
}

.stat-icon.uptime {
  color: #fbbf24;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(251, 191, 36, 0.08));
}

.stat-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-value {
  font-size: clamp(1.2rem, 3vw, 1.45rem);
  font-weight: 700;
  color: #f8fafc;
  line-height: 1.2;
}

.stat-value.status {
  font-size: 1rem;
  color: #34d399;
}

.stat-label {
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.66);
}

.stat-trend {
  padding: 0.25rem 0.5rem;
  border-radius: 0.45rem;
  font-size: 0.75rem;
  font-weight: 600;
}

.stat-trend.up {
  color: #34d399;
  background: rgba(16, 185, 129, 0.14);
}

.stat-indicator {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
}

.stat-indicator.online {
  background: #34d399;
  box-shadow: 0 0 0.75rem rgba(52, 211, 153, 0.6);
}

.quick-actions {
  animation: fade-up 0.45s ease-out both;
  animation-delay: 0.06s;
}

.section-title {
  margin: 0 0 0.85rem;
  font-size: 1.05rem;
  font-weight: 600;
  color: #f8fafc;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 0.875rem;
}

.action-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.9rem;
  border-radius: 0.85rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 23, 42, 0.42);
  text-decoration: none;
  transition: transform 0.2s ease, border-color 0.2s ease, background-color 0.2s ease;
}

.action-card:hover {
  transform: translateY(-2px);
  border-color: rgba(139, 92, 246, 0.32);
  background: rgba(76, 29, 149, 0.24);
}

.action-icon {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 0.7rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: #c4b5fd;
  background: rgba(139, 92, 246, 0.18);
  flex-shrink: 0;
}

.action-text {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.action-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.95);
}

.action-desc {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.62);
}

@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 640px) {
  .stats-grid,
  .actions-grid {
    grid-template-columns: 1fr;
  }

  .stat-card {
    grid-template-columns: auto 1fr;
  }

  .stat-trend,
  .stat-indicator {
    justify-self: end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stats-wrap,
  .quick-actions,
  .stat-card,
  .action-card {
    animation: none;
    transition: none;
  }

  .stat-card:hover,
  .action-card:hover {
    transform: none;
  }
}
</style>
