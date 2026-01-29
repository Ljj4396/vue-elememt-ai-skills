<script setup>
import { ref, onMounted } from 'vue'
import { http } from '@/plugins/axios'
import { User, DataLine, Monitor, Clock } from '@element-plus/icons-vue'

const stats = ref({
  totalUsers: 0,
  todayLogins: 0,
  systemStatus: '正常运行',
})
const currentTime = ref('')
const greeting = ref('')

// 加载统计数据
async function loadStats() {
  try {
    const { data: res } = await http.get('/users')
    if (res.code === 0) {
      stats.value.totalUsers = res.data.length
    }
  } catch (e) {
    console.error('加载统计失败', e)
  }
}

// 更新时间
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
  setInterval(updateTime, 1000)
})
</script>

<template>
  <div class="dashboard">
    <!-- 欢迎区域 -->
    <div class="welcome-section">
      <div class="welcome-text">
        <h1>{{ greeting }}，欢迎回来</h1>
        <p class="time">{{ currentTime }}</p>
      </div>
      <div class="welcome-decoration">
        <div class="deco-ring"></div>
        <div class="deco-ring"></div>
        <div class="deco-ring"></div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon users">
          <User />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.totalUsers }}</span>
          <span class="stat-label">用户总数</span>
        </div>
        <div class="stat-trend up">
          <span>+12%</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon logins">
          <DataLine />
        </div>
        <div class="stat-info">
          <span class="stat-value">{{ stats.todayLogins || 28 }}</span>
          <span class="stat-label">今日登录</span>
        </div>
        <div class="stat-trend up">
          <span>+5%</span>
        </div>
      </div>

      <div class="stat-card">
        <div class="stat-icon system">
          <Monitor />
        </div>
        <div class="stat-info">
          <span class="stat-value status">{{ stats.systemStatus }}</span>
          <span class="stat-label">系统状态</span>
        </div>
        <div class="stat-indicator online"></div>
      </div>

      <div class="stat-card">
        <div class="stat-icon uptime">
          <Clock />
        </div>
        <div class="stat-info">
          <span class="stat-value">99.9%</span>
          <span class="stat-label">运行时长</span>
        </div>
      </div>
    </div>

    <!-- 快捷操作 -->
    <div class="quick-actions">
      <h3 class="section-title">快捷操作</h3>
      <div class="actions-grid">
        <router-link to="/users" class="action-card">
          <div class="action-icon">
            <User />
          </div>
          <span>用户管理</span>
        </router-link>
      </div>
    </div>
  </div>
</template>

<style scoped>
.dashboard {
  padding: 24px;
  min-height: calc(100vh - 60px);
}

/* 欢迎区域 */
.welcome-section {
  position: relative;
  padding: 32px 40px;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1));
  border-radius: 20px;
  border: 1px solid rgba(139, 92, 246, 0.2);
  margin-bottom: 24px;
  overflow: hidden;
}

.welcome-text h1 {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 600;
  color: #fff;
}

.welcome-text .time {
  margin: 0;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  font-family: 'Consolas', monospace;
}

.welcome-decoration {
  position: absolute;
  right: 40px;
  top: 50%;
  transform: translateY(-50%);
}

.deco-ring {
  position: absolute;
  border: 2px solid rgba(139, 92, 246, 0.3);
  border-radius: 50%;
  animation: ring-pulse 3s ease-in-out infinite;
}

.deco-ring:nth-child(1) {
  width: 60px;
  height: 60px;
  right: 0;
  top: -30px;
}

.deco-ring:nth-child(2) {
  width: 100px;
  height: 100px;
  right: -20px;
  top: -50px;
  animation-delay: 0.5s;
}

.deco-ring:nth-child(3) {
  width: 140px;
  height: 140px;
  right: -40px;
  top: -70px;
  animation-delay: 1s;
}

@keyframes ring-pulse {
  0%, 100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.05);
  }
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 32px;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(139, 92, 246, 0.3);
  transform: translateY(-2px);
}

.stat-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 24px;
}

.stat-icon.users {
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(139, 92, 246, 0.1));
  color: #8b5cf6;
}

.stat-icon.logins {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.1));
  color: #3b82f6;
}

.stat-icon.system {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(16, 185, 129, 0.1));
  color: #10b981;
}

.stat-icon.uptime {
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.2), rgba(245, 158, 11, 0.1));
  color: #f59e0b;
}

.stat-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

.stat-value.status {
  font-size: 16px;
  color: #10b981;
}

.stat-label {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
}

.stat-trend {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
}

.stat-trend.up {
  background: rgba(16, 185, 129, 0.1);
  color: #10b981;
}

.stat-indicator {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.stat-indicator.online {
  background: #10b981;
  box-shadow: 0 0 10px #10b981;
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* 快捷操作 */
.quick-actions {
  margin-top: 32px;
}

.section-title {
  margin: 0 0 20px;
  font-size: 18px;
  font-weight: 600;
  color: #fff;
}

.actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 24px 16px;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 12px;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.7);
  transition: all 0.3s ease;
}

.action-card:hover {
  background: rgba(139, 92, 246, 0.1);
  border-color: rgba(139, 92, 246, 0.3);
  color: #8b5cf6;
  transform: translateY(-2px);
}

.action-icon {
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(139, 92, 246, 0.1);
  border-radius: 12px;
  font-size: 20px;
  color: #8b5cf6;
}

.action-card span {
  font-size: 14px;
  font-weight: 500;
}
</style>
