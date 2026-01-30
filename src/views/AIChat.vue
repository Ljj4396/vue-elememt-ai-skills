<script setup>
import { ref, reactive, nextTick, onMounted } from 'vue'
import { ChatDotRound, Position, Promotion, MagicStick, Warning, Delete, Upload, Plus, Microphone } from '@element-plus/icons-vue'
import { http } from '@/plugins/axios'
import { ElMessage } from 'element-plus'

const scrollRef = ref(null)
const fileInputRef = ref(null)
const inputMsg = ref('')
const isTyping = ref(false)
const pendingImages = ref([])

const chatHistory = reactive([
  {
    role: 'ai',
    content: '你好！我是你的智能助手。你可以问我关于系统操作、今日占卜解读，或者任何你想聊的话题。',
    time: new Date().toLocaleTimeString()
  }
])

const quickPrompts = [
  { icon: 'MagicStick', text: '解读今日生肖冲煞', type: 'fortune' },
  { icon: 'Warning', text: '如何修改我的账号密码？', type: 'system' },
  { icon: 'Promotion', text: '帮我规划一下今天的日程', type: 'chat' }
]

const scrollToBottom = async () => {
  await nextTick()
  if (scrollRef.value) {
    scrollRef.value.setScrollTop(scrollRef.value.wrapRef.scrollHeight)
  }
}

const simulateAIResponse = async (userText) => {
  isTyping.value = true
  
  // 添加一个空的 AI 消息占位
  const aiMsg = reactive({
    role: 'ai',
    content: '正在思考中...',
    time: new Date().toLocaleTimeString()
  })
  chatHistory.push(aiMsg)
  scrollToBottom()
  
  try {
    // 构造发送给后端的上下文
    const contextMessages = chatHistory
      .slice(0, -1) // 不包含刚才那个“正在思考”
      .map(m => {
        const role = m.role === 'ai' ? 'assistant' : 'user'
        if (Array.isArray(m.images) && m.images.length > 0) {
          const content = []
          if (m.content && m.content.trim()) {
            content.push({ type: 'input_text', text: m.content })
          }
          m.images.forEach((img) => {
            if (img?.dataUrl) {
              content.push({ type: 'input_image', image_url: img.dataUrl })
            }
          })
          return { role, content }
        }
        return { role, content: m.content }
      })

    const { data: res } = await http.post('/chat', { messages: contextMessages })
    
    if (res.code === 0) {
      const fullResponse = res.data.content
      aiMsg.content = '' // 清空“正在思考”
      
      // 逐字输出效果
      let currentText = ''
      for (let char of fullResponse) {
        currentText += char
        aiMsg.content = currentText
        // 根据回复长度动态调整速度
        await new Promise(resolve => setTimeout(resolve, fullResponse.length > 100 ? 10 : 30))
        scrollToBottom()
      }
    } else {
      aiMsg.content = '抱歉，我遇到了一些问题：' + (res.data?.message || '未知错误')
    }
  } catch (e) {
    aiMsg.content = '网络连接失败，请检查后端服务是否开启。'
    console.error(e)
  } finally {
    isTyping.value = false
  }
}

const handleSend = () => {
  const hasText = !!inputMsg.value.trim()
  const hasImages = pendingImages.value.length > 0
  if ((!hasText && !hasImages) || isTyping.value) return
  
  const userText = inputMsg.value
  chatHistory.push({
    role: 'user',
    content: userText,
    images: hasImages ? [...pendingImages.value] : [],
    time: new Date().toLocaleTimeString()
  })
  
  inputMsg.value = ''
  pendingImages.value = []
  scrollToBottom()
  
  // 延迟一秒模拟思考
  setTimeout(() => simulateAIResponse(userText), 800)
}

const usePrompt = (text) => {
  inputMsg.value = text
  handleSend()
}

const pickImages = () => {
  if (fileInputRef.value) fileInputRef.value.click()
}

const handleFileChange = (e) => {
  const files = Array.from(e.target.files || [])
  if (!files.length) return
  files.forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      pendingImages.value.push({
        name: file.name,
        dataUrl: reader.result
      })
    }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}

const removePendingImage = (index) => {
  pendingImages.value.splice(index, 1)
}

const clearHistory = () => {
  chatHistory.splice(1)
}

onMounted(() => {
  scrollToBottom()
})
</script>

<template>
  <div class="ai-container">
    <!-- 左侧边栏 (可选，目前作为装饰或历史切换) -->
    <div class="ai-sidebar">
      <div class="sidebar-header">
        <ChatDotRound class="icon" />
        <span>对话列表</span>
      </div>
      <div class="history-list">
        <div class="history-item active">当前对话</div>
        <div class="history-item empty">暂无更多历史</div>
      </div>
      <el-button class="clear-btn" :icon="Delete" @click="clearHistory">清空对话记录</el-button>
    </div>

    <!-- 右侧主对话区 -->
    <div class="ai-main">
      <el-scrollbar ref="scrollRef" class="chat-window">
        <div class="messages-wrapper">
          <div 
            v-for="(msg, index) in chatHistory" 
            :key="index" 
            :class="['message-row', msg.role === 'user' ? 'user-row' : 'ai-row']"
          >
            <div class="avatar">
              <div v-if="msg.role === 'ai'" class="ai-avatar">
                <svg class="gpt-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="6.5" r="3.2" />
                  <circle cx="16.5" cy="8.5" r="3.2" />
                  <circle cx="17" cy="13.5" r="3.2" />
                  <circle cx="12" cy="16.5" r="3.2" />
                  <circle cx="7" cy="13.5" r="3.2" />
                  <circle cx="7.5" cy="8.5" r="3.2" />
                </svg>
              </div>
              <div v-else class="user-avatar">YOU</div>
            </div>
            <div class="message-content">
              <div class="bubble">
                <div v-if="msg.images?.length" class="image-grid">
                  <img
                    v-for="(img, imgIndex) in msg.images"
                    :key="imgIndex"
                    :src="img.dataUrl"
                    :alt="img.name || 'image'"
                  />
                </div>
                <p v-if="msg.content">{{ msg.content }}</p>
                <span v-if="isTyping && index === chatHistory.length - 1" class="cursor">|</span>
              </div>
              <span class="time">{{ msg.time }}</span>
            </div>
          </div>
        </div>

        <!-- 初始快捷建议 -->
        <div v-if="chatHistory.length <= 1" class="welcome-section">
          <h2>你可以试着问我：</h2>
          <div class="prompt-grid">
            <div 
              v-for="p in quickPrompts" 
              :key="p.text" 
              class="prompt-card"
              @click="usePrompt(p.text)"
            >
              <component :is="p.icon" class="p-icon" />
              <span>{{ p.text }}</span>
            </div>
          </div>
        </div>
      </el-scrollbar>

      <!-- 输入框区域 -->
      <div class="input-area">
        <div v-if="pendingImages.length" class="pending-images">
          <div
            v-for="(img, idx) in pendingImages"
            :key="idx"
            class="pending-item"
          >
            <img :src="img.dataUrl" :alt="img.name || 'image'" />
            <button class="remove-btn" @click="removePendingImage(idx)">×</button>
          </div>
        </div>
        <div class="pill-input-wrapper">
          <el-button class="plus-btn" @click="pickImages">
            <el-icon><Plus /></el-icon>
          </el-button>
          
          <el-input
            v-model="inputMsg"
            placeholder="有问题，尽管问"
            class="clean-input"
            @keyup.enter.exact.prevent="handleSend"
          />

          <div class="input-actions">
            <el-icon class="mic-icon"><Microphone /></el-icon>
            <el-button 
              class="pill-send-btn" 
              :disabled="(!inputMsg.trim() && !pendingImages.length) || isTyping"
              @click="handleSend"
            >
              <svg class="wave-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,6H13V18H11V6M7,9H9V15H7V9M15,9H17V15H15V9Z" />
              </svg>
            </el-button>
          </div>
        </div>
        <input
          ref="fileInputRef"
          type="file"
          accept="image/*"
          multiple
          class="file-input"
          @change="handleFileChange"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-container {
  display: flex;
  height: calc(100vh - 120px);
  background: rgba(20, 20, 30, 0.6);
  border-radius: 16px;
  border: 1px solid rgba(255, 255, 255, 0.05);
  overflow: hidden;
  backdrop-filter: blur(20px);
}

/* 侧边栏样式 */
.ai-sidebar {
  width: 240px;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.2);
}

.sidebar-header {
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 12px;
  font-weight: bold;
  font-size: 18px;
  color: #8b5cf6;
}

.history-list {
  flex: 1;
  padding: 0 12px;
}

.history-item {
  padding: 12px 16px;
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.6);
  transition: all 0.3s;
}

.history-item.active {
  background: rgba(139, 92, 246, 0.1);
  color: #a78bfa;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.history-item.empty {
  text-align: center;
  font-style: italic;
  opacity: 0.5;
}

.clear-btn {
  margin: 20px;
  background: transparent;
  border-color: rgba(255, 69, 58, 0.3);
  color: #ff453a;
}

/* 主窗口样式 */
.ai-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(135deg, rgba(139, 92, 246, 0.02) 0%, transparent 100%);
}

.chat-window {
  flex: 1;
}

.messages-wrapper {
  padding: 30px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.message-row {
  display: flex;
  gap: 16px;
  max-width: 85%;
}

.ai-row {
  align-self: flex-start;
}

.user-row {
  align-self: flex-end;
  flex-direction: row-reverse;
}

.avatar {
  flex-shrink: 0;
}

.ai-avatar {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #10b981, #22c55e);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 6px 16px rgba(16, 185, 129, 0.35);
}

.user-avatar {
  width: 40px;
  height: 40px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  font-weight: bold;
}

.bubble {
  padding: 12px 18px;
  border-radius: 16px;
  font-size: 14px;
  line-height: 1.6;
  position: relative;
}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 8px;
}

.image-grid img {
  width: 100%;
  height: 120px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.ai-row .bubble {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  border-top-left-radius: 4px;
}

.user-row .bubble {
  background: linear-gradient(135deg, #8b5cf6, #6366f1);
  color: white;
  border-top-right-radius: 4px;
}

.time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.3);
  margin-top: 4px;
  display: block;
}

.user-row .time {
  text-align: right;
}

.cursor {
  display: inline-block;
  width: 2px;
  background: #34d399;
  margin-left: 2px;
  animation: blink 1s infinite;
}

.gpt-icon {
  width: 22px;
  height: 22px;
  fill: none;
  stroke: #e7fff6;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes blink {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}

/* 欢迎区样式 */
.welcome-section {
  padding: 60px 40px;
  text-align: center;
}

.welcome-section h2 {
  font-size: 24px;
  background: linear-gradient(90deg, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  margin-bottom: 30px;
}

.prompt-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.prompt-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 24px;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.prompt-card:hover {
  background: rgba(139, 92, 246, 0.08);
  border-color: #8b5cf6;
  transform: translateY(-5px);
}

.p-icon {
  width: 24px;
  height: 24px;
  color: #8b5cf6;
}

/* 输入区样式 */
.input-area {
  padding: 20px 40px 30px;
}

.pill-input-wrapper {
  display: flex;
  align-items: center;
  background: #ffffff;
  border-radius: 100px;
  padding: 6px 8px 6px 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.pill-input-wrapper:focus-within {
  box-shadow: 0 4px 25px rgba(0, 0, 0, 0.2);
}

.plus-btn {
  background: transparent !important;
  border: none !important;
  padding: 0 !important;
  margin-right: 12px;
  color: #333 !important;
  font-size: 20px;
  height: auto !important;
}

.clean-input :deep(.el-input__wrapper) {
  background: transparent !important;
  box-shadow: none !important;
  padding: 0 !important;
}

.clean-input :deep(.el-input__inner) {
  color: #333 !important;
  font-size: 16px;
  height: 40px;
}

.clean-input :deep(.el-input__inner::placeholder) {
  color: #999;
}

.input-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  padding-right: 4px;
}

.mic-icon {
  font-size: 20px;
  color: #666;
  cursor: pointer;
  transition: color 0.2s;
}

.mic-icon:hover {
  color: #333;
}

.pill-send-btn {
  width: 40px;
  height: 40px;
  background: #000000 !important;
  border: none !important;
  border-radius: 50% !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white !important;
  transition: all 0.2s ease;
}

.pill-send-btn:hover {
  transform: scale(1.05);
  opacity: 0.9;
}

.pill-send-btn:disabled {
  background: #e0e0e0 !important;
  color: #a0a0a0 !important;
  cursor: not-allowed;
}

.wave-icon {
  width: 22px;
  height: 22px;
}

.file-input {
  display: none;
}

.pending-images {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px;
  margin-bottom: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.pending-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.25);
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.pending-item:hover {
  transform: translateY(-2px);
  border-color: rgba(139, 92, 246, 0.5);
}

.pending-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  cursor: pointer;
  line-height: 20px;
  font-size: 12px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
}
</style>
