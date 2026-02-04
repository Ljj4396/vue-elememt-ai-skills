<script setup>
  import { ref, onMounted } from 'vue'
  import { useRouter, useRoute } from 'vue-router'
  import { http, setToken, setUserPermissions, setIsAdmin } from '@/plugins/axios'
  import { ElMessage } from 'element-plus'

  const router = useRouter()
  const route = useRoute()

  const form = ref({
    username: '',
    password: '',
  })
  const loading = ref(false)
  const showPassword = ref(false)

  // 打字机效果
  const displayText = ref('')
  const fullText = 'Welcome Back'
  const typewriterIndex = ref(0)

  onMounted(() => {
    const typeWriter = () => {
      if (typewriterIndex.value < fullText.length) {
        displayText.value += fullText.charAt(typewriterIndex.value)
        typewriterIndex.value++
        setTimeout(typeWriter, 120)
      }
    }
    setTimeout(typeWriter, 500)
  })

  async function handleLogin() {
    if (!form.value.username || !form.value.password) {
      ElMessage.warning('请输入用户名和密码')
      return
    }

    loading.value = true
    try {
      const { data: res } = await http.post('/login', form.value)
      if (res.code === 0) {
        setToken(res.data.token)
        setUserPermissions(res.data.user?.permissions || {})
        setIsAdmin(res.data.user?.isAdmin === true)
        ElMessage.success(`欢迎回来 ${res.data.user.nickname}`)
        const redirect = route.query.redirect || '/'
        router.push(redirect)
      } else {
        ElMessage.error(res.data?.message || '登录失败')
      }
    } catch (e) {
      ElMessage.error('登录失败，请检查网络')
    } finally {
      loading.value = false
    }
  }
</script>

<template>
  <div class="login-container">
    <!-- 动态背景粒子 -->
    <div class="particles">
      <div v-for="i in 50" :key="i" class="particle" :style="particleStyle(i)"></div>
    </div>

    <!-- 光晕背景 -->
    <div class="glow glow-1"></div>
    <div class="glow glow-2"></div>
    <div class="glow glow-3"></div>

    <!-- 登录卡片 -->
    <div class="login-card">
      <div class="card-header">
        <div class="logo-wrapper">
          <div class="logo-ring"></div>
          <div class="logo-core">V</div>
        </div>
        <h1 class="title">
          <span class="typewriter">{{ displayText }}</span>
          <span class="cursor">|</span>
        </h1>
        <p class="subtitle">登录以继续访问系统</p>
      </div>

      <el-form class="login-form" @submit.prevent="handleLogin">
        <div class="input-group">
          <div class="input-wrapper">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </span>
            <input v-model="form.username" type="text" placeholder="用户名" class="neon-input" autocomplete="username" />
          </div>
        </div>

        <div class="input-group">
          <div class="input-wrapper">
            <span class="input-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <input v-model="form.password" :type="showPassword ? 'text' : 'password'" placeholder="密码"
              class="neon-input" autocomplete="current-password" @keyup.enter="handleLogin" />
            <span class="toggle-password" @click="showPassword = !showPassword">
              <svg v-if="!showPassword" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path
                  d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <line x1="1" y1="1" x2="23" y2="23" />
              </svg>
            </span>
          </div>
        </div>

        <button type="submit" class="login-btn" :class="{ loading }" :disabled="loading">
          <span v-if="!loading">登 录</span>
          <span v-else class="loading-dots">
            <span></span><span></span><span></span>
          </span>
        </button>
      </el-form>

      <div class="demo-accounts">
        <p>测试账号</p>
        <div class="accounts">
          <span @click="form.username = 'zhangsan'; form.password = '123456'">zhangsan / 123456</span>
          <span @click="form.username = 'lisi'; form.password = '123456'">lisi / 123456</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  // 生成随机粒子样式
  function particleStyle(i) {
    const size = Math.random() * 4 + 1
    const left = Math.random() * 100
    const delay = Math.random() * 20
    const duration = Math.random() * 20 + 10
    return {
      width: `${size}px`,
      height: `${size}px`,
      left: `${left}%`,
      animationDelay: `${delay}s`,
      animationDuration: `${duration}s`,
    }
  }
  export default { methods: { particleStyle } }
</script>

<style scoped>
  .login-container {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #0a0a0f;
    overflow: hidden;
    z-index: 1000;
    font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  }

  /* 动态粒子 */
  .particles {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 1;
  }

  .particle {
    position: absolute;
    bottom: -10px;
    background: rgba(139, 92, 246, 0.6);
    border-radius: 50%;
    animation: float-up linear infinite;
    box-shadow: 0 0 6px rgba(139, 92, 246, 0.8);
  }

  @keyframes float-up {
    0% {
      transform: translateY(0) scale(1);
      opacity: 0;
    }

    10% {
      opacity: 1;
    }

    90% {
      opacity: 1;
    }

    100% {
      transform: translateY(-110vh) scale(0.5);
      opacity: 0;
    }
  }

  /* 光晕背景 */
  .glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(80px);
    opacity: 0.4;
    animation: glow-pulse 8s ease-in-out infinite;
    z-index: 2;
  }

  .glow-1 {
    width: 50vw;
    height: 50vw;
    max-width: 600px;
    max-height: 600px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    top: -10%;
    left: -10%;
    animation-delay: 0s;
  }

  .glow-2 {
    width: 45vw;
    height: 45vw;
    max-width: 500px;
    max-height: 500px;
    background: linear-gradient(135deg, #ec4899, #f43f5e);
    bottom: -5%;
    right: -5%;
    animation-delay: 2s;
  }

  .glow-3 {
    width: 40vw;
    height: 40vw;
    max-width: 450px;
    max-height: 450px;
    background: linear-gradient(135deg, #06b6d4, #3b82f6);
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    animation-delay: 4s;
  }

  @keyframes glow-pulse {

    0%,
    100% {
      transform: translate(0, 0) scale(1);
      opacity: 0.4;
    }

    33% {
      transform: translate(2%, 2%) scale(1.1);
      opacity: 0.5;
    }

    66% {
      transform: translate(-2%, 1%) scale(0.9);
      opacity: 0.3;
    }
  }

  /* 登录卡片 - 玻璃拟态 */
  .login-card {
    position: relative;
    z-index: 10;
    width: 100%;
    max-width: 500px;
    margin: 20px;
    padding: 52px 56px;
    background: rgba(255, 255, 255, 0.03);
    backdrop-filter: blur(25px);
    -webkit-backdrop-filter: blur(25px);
    border-radius: 28px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow:
      0 25px 50px -12px rgba(0, 0, 0, 0.5),
      inset 0 1px 1px rgba(255, 255, 255, 0.1);
    animation: card-appear 0.8s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes card-appear {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.98);
    }

    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  /* Logo */
  .card-header {
    text-align: center;
    margin-bottom: 40px;
  }

  .logo-wrapper {
    position: relative;
    width: 84px;
    height: 84px;
    margin: 0 auto 24px;
  }

  .logo-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 2px solid transparent;
    background: linear-gradient(135deg, #8b5cf6, #ec4899, #06b6d4) border-box;
    mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    -webkit-mask: linear-gradient(#fff 0 0) padding-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    -webkit-mask-composite: destination-out;
    animation: ring-spin 4s linear infinite;
  }

  @keyframes ring-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .logo-core {
    position: absolute;
    inset: 8px;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 34px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 0 20px rgba(139, 92, 246, 0.8);
    box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3);
  }

  .title {
    font-size: 32px;
    font-weight: 600;
    color: #fff;
    margin: 0 0 10px;
    letter-spacing: 1px;
  }

  .typewriter {
    background: linear-gradient(90deg, #8b5cf6, #ec4899, #06b6d4);
    background-size: 200% 100%;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: gradient-shift 3s ease infinite;
  }

  @keyframes gradient-shift {

    0%,
    100% {
      background-position: 0% 50%;
    }

    50% {
      background-position: 100% 50%;
    }
  }

  .cursor {
    color: #8b5cf6;
    animation: blink 1s step-end infinite;
  }

  @keyframes blink {
    50% {
      opacity: 0;
    }
  }

  .subtitle {
    font-size: 15px;
    color: rgba(255, 255, 255, 0.5);
    margin: 0;
  }

  /* 输入框 */
  .input-group {
    margin-bottom: 24px;
  }

  .input-wrapper {
    position: relative;
    display: flex;
    align-items: center;
  }

  .input-icon {
    position: absolute;
    left: 18px;
    width: 22px;
    height: 22px;
    color: rgba(255, 255, 255, 0.4);
    transition: all 0.3s;
    z-index: 1;
  }

  .input-icon svg {
    width: 100%;
    height: 100%;
  }

  .neon-input {
    width: 100%;
    height: 56px;
    padding: 0 52px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
    font-size: 16px;
    color: #fff;
    outline: none;
    transition: all 0.3s ease;
  }

  .neon-input::placeholder {
    color: rgba(255, 255, 255, 0.25);
  }

  .neon-input:focus {
    border-color: #8b5cf6;
    box-shadow:
      0 0 0 4px rgba(139, 92, 246, 0.15),
      0 0 30px rgba(139, 92, 246, 0.2);
    background: rgba(139, 92, 246, 0.06);
  }

  .neon-input:focus+.input-icon,
  .input-wrapper:focus-within .input-icon {
    color: #8b5cf6;
    transform: scale(1.1);
  }

  .toggle-password {
    position: absolute;
    right: 18px;
    width: 22px;
    height: 22px;
    color: rgba(255, 255, 255, 0.4);
    cursor: pointer;
    transition: all 0.3s;
  }

  .toggle-password:hover {
    color: #8b5cf6;
    transform: scale(1.1);
  }

  .toggle-password svg {
    width: 100%;
    height: 100%;
  }

  /* 登录按钮 */
  .login-btn {
    width: 100%;
    height: 56px;
    margin-top: 12px;
    background: linear-gradient(135deg, #8b5cf6, #6366f1);
    border: none;
    border-radius: 16px;
    font-size: 18px;
    font-weight: 600;
    color: #fff;
    cursor: pointer;
    position: relative;
    overflow: auto;
    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .login-btn::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, #a78bfa, #818cf8);
    opacity: 0;
    transition: opacity 0.3s;
  }

  .login-btn:hover::before {
    opacity: 1;
  }

  .login-btn:hover {
    transform: translateY(-2px);
    box-shadow:
      0 12px 30px rgba(139, 92, 246, 0.4),
      0 0 40px rgba(139, 92, 246, 0.2);
  }

  .login-btn:active {
    transform: translateY(1px);
  }

  .login-btn span {
    position: relative;
    z-index: 1;
  }

  .login-btn.loading {
    pointer-events: none;
    opacity: 0.8;
  }

  .loading-dots {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .loading-dots span {
    width: 10px;
    height: 10px;
    background: #fff;
    border-radius: 50%;
    animation: dot-bounce 1.4s ease-in-out infinite;
  }

  .loading-dots span:nth-child(1) {
    animation-delay: 0s;
  }

  .loading-dots span:nth-child(2) {
    animation-delay: 0.2s;
  }

  .loading-dots span:nth-child(3) {
    animation-delay: 0.4s;
  }

  @keyframes dot-bounce {

    0%,
    80%,
    100% {
      transform: scale(0.6);
      opacity: 0.5;
    }

    40% {
      transform: scale(1);
      opacity: 1;
    }
  }

  /* 测试账号提示 */
  .demo-accounts {
    margin-top: 40px;
    padding-top: 28px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    text-align: center;
  }

  .demo-accounts p {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.3);
    margin: 0 0 16px;
    text-transform: uppercase;
    letter-spacing: 2.5px;
  }

  .accounts {
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .accounts span {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.5);
    padding: 8px 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.05);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.3s;
    font-family: 'Consolas', 'Monaco', monospace;
  }

  .accounts span:hover {
    color: #8b5cf6;
    background: rgba(139, 92, 246, 0.1);
    border-color: rgba(139, 92, 246, 0.3);
    transform: translateY(-1px);
  }

  /* 响应式适配 */
  @media (max-width: 640px) {
    .login-card {
      padding: 40px 32px;
      border-radius: 24px;
    }

    .title {
      font-size: 28px;
    }

    .logo-wrapper {
      width: 72px;
      height: 72px;
    }

    .logo-core {
      font-size: 28px;
    }
  }

  @media (max-width: 480px) {
    .login-card {
      padding: 36px 24px;
      margin: 16px;
    }

    .title {
      font-size: 24px;
    }

    .subtitle {
      font-size: 13px;
    }

    .neon-input {
      height: 52px;
      font-size: 15px;
    }

    .login-btn {
      height: 52px;
      font-size: 16px;
    }
    
    .accounts span {
      padding: 6px 10px;
      font-size: 11px;
    }
  }

  /* 极小屏幕适配 */
  @media (max-height: 700px) {
    .login-card {
      padding: 32px 32px;
    }
    .card-header {
      margin-bottom: 24px;
    }
    .demo-accounts {
      margin-top: 24px;
    }
  }
</style>
