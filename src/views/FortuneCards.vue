<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { MagicStick, Calendar, Compass, InfoFilled, Star, UserFilled } from '@element-plus/icons-vue'
import { Solar, Lunar } from 'lunar-typescript'

// 运势等级配置
const LUCK_LEVELS = [
  { label: '大吉', color: '#ff4d4f', bg: 'rgba(255, 77, 79, 0.1)' },
  { label: '中吉', color: '#ff7a45', bg: 'rgba(255, 122, 69, 0.1)' },
  { label: '小吉', color: '#ffc53d', bg: 'rgba(255, 197, 61, 0.1)' },
  { label: '吉', color: '#73d13d', bg: 'rgba(115, 209, 61, 0.1)' },
  { label: '平', color: '#40a9ff', bg: 'rgba(64, 169, 255, 0.1)' },
]

// 12星座数据 (新增 element 属性)
const ZODIAC_SIGNS = [
  { name: '白羊座', date: '3.21-4.19', icon: '♈', element: '火' },
  { name: '金牛座', date: '4.20-5.20', icon: '♉', element: '土' },
  { name: '双子座', date: '5.21-6.21', icon: '♊', element: '风' },
  { name: '巨蟹座', date: '6.22-7.22', icon: '♋', element: '水' },
  { name: '狮子座', date: '7.23-8.22', icon: '♌', element: '火' },
  { name: '处女座', date: '8.23-9.22', icon: '♍', element: '土' },
  { name: '天秤座', date: '9.23-10.23', icon: '♎', element: '风' },
  { name: '天蝎座', date: '10.24-11.22', icon: '♏', element: '水' },
  { name: '射手座', date: '11.23-12.21', icon: '♐', element: '火' },
  { name: '摩羯座', date: '12.22-1.19', icon: '♑', element: '土' },
  { name: '水瓶座', date: '1.20-2.18', icon: '♒', element: '风' },
  { name: '双鱼座', date: '2.19-3.20', icon: '♓', element: '水' }
]

// 12生肖数据
const CHINESE_ZODIAC = [
  { name: '鼠', icon: '🐭', zhi: '子' },
  { name: '牛', icon: '🐮', zhi: '丑' },
  { name: '虎', icon: '🐯', zhi: '寅' },
  { name: '兔', icon: '🐰', zhi: '卯' },
  { name: '龙', icon: '🐲', zhi: '辰' },
  { name: '蛇', icon: '🐍', zhi: '巳' },
  { name: '马', icon: '🐴', zhi: '午' },
  { name: '羊', icon: '🐑', zhi: '未' },
  { name: '猴', icon: '🐵', zhi: '申' },
  { name: '鸡', icon: '🐔', zhi: '酉' },
  { name: '狗', icon: '🐶', zhi: '戌' },
  { name: '猪', icon: '🐷', zhi: '亥' }
]

// 获取历法数据
const selectedDate = ref(new Date())
const solar = computed(() => Solar.fromDate(selectedDate.value))
const lunar = computed(() => Lunar.fromDate(selectedDate.value))

const dateInfo = computed(() => ({
  solar: `${solar.value.getYear()}年${solar.value.getMonth()}月${solar.value.getDay()}日`,
  lunar: `农历${lunar.value.getMonthInChinese()}月${lunar.value.getDayInChinese()}`,
  ganZhi: `${lunar.value.getYearInGanZhi()}(${lunar.value.getYearShengXiao()})年 ${lunar.value.getMonthInGanZhi()}月 ${lunar.value.getDayInGanZhi()}日`,
  weekday: `星期${solar.value.getWeekInChinese()}`,
  jieQi: lunar.value.getJieQi() || '无节气'
}))

const almanac = computed(() => ({
  yi: lunar.value.getDayYi().slice(0, 4).join(' '),
  ji: lunar.value.getDayJi().slice(0, 4).join(' '),
  chong: lunar.value.getDayChongDesc(),
  sha: lunar.value.getDaySha(),
  wuXing: lunar.value.getBaZi().slice(4, 6).join(''),
}))

// 真实历法驱动的运势生成逻辑
function generateFortune(item, type) {
  let level;
  let message = ''
  let isChong = false

  // 规范化日级 API 调用，确保兼容性
  const zhiShen = lunar.value.getDayZhiShen ? lunar.value.getDayZhiShen() : (lunar.value.getZhiShen ? lunar.value.getZhiShen() : '开')
  const xiu = lunar.value.getXiu() 
  const xiuLuck = lunar.value.getXiuLuck() 
  
  // 获取今日九星 (修正 API 名为 getDayNineStar)
  const nineStarObj = lunar.value.getDayNineStar ? lunar.value.getDayNineStar() : null
  const nineStarName = nineStarObj ? nineStarObj.toString() : '九紫火'
  
  // 获取今日纳音 (修正 API 名为 getDayNayun)
  const nayun = lunar.value.getDayNayun ? lunar.value.getDayNayun() : '海中金'
  
  const dayChong = almanac.value.chong 
  
  if (type === 'zodiac') {
    // 1. 五行生克计算 (差异化核心)
    const dayWuXing = almanac.value.wuXing.charAt(0) 
    const relationship = {
      '火': { '木': '得生', '火': '旺相', '金': '制约', '水': '受克', '土': '泄气' },
      '土': { '火': '得生', '土': '旺相', '水': '制约', '木': '受克', '金': '泄气' },
      '水': { '金': '得生', '水': '旺相', '火': '制约', '土': '受克', '木': '泄气' },
      '风': { '水': '得生', '木': '旺相', '土': '制约', '火': '受克', '金': '泄气' }
    }
    const status = relationship[item.element][dayWuXing] || '平稳'
    
    // 2. 差异化文案生成
    const indexSeed = ZODIAC_SIGNS.indexOf(item) + lunar.value.getDay()
    const luckyColors = ['琥珀金', '深海蓝', '玫瑰紫', '翡翠绿', '胭脂红', '玄武黑']
    const luckyNum = (indexSeed * 7) % 10 + 1
    
    const zodiacMsgs = [
      `${item.name}今日气场[${status}]。受[${xiu}宿]运行影响，你的逻辑思维异常活跃，适合处理复杂的财务或规划问题。`,
      `观[${nineStarName}]之变，${item.name}今日宜关注[${item.element}]元素能量，建议向${lunar.value.getPositionCai()}方拓展，会有意想不到的转机。`,
      `今日${item.name}的守护星与[${zhiShen}]神位共鸣。即便外界纷扰，只要坚守内心，好运自会降临。`,
      `能量流转显示，${item.name}今日在沟通方面有极佳表现。幸运色为[${luckyColors[indexSeed % luckyColors.length]}]，幸运数字为[${luckyNum}]。`
    ]
    message = zodiacMsgs[indexSeed % zodiacMsgs.length]
    
  } else {
    // 十二生肖逻辑：深度关联地支合化 (六合/三合/逢冲)
    const itemZhi = item.zhi
    const dayZhi = lunar.value.getDayZhi()
    
    // 地支关系逻辑
    const liuHeMap = { '子':'丑', '丑':'子', '寅':'亥', '亥':'寅', '卯':'戌', '戌':'卯', '辰':'酉', '酉':'辰', '巳':'申', '申':'巳', '午':'未', '未':'午' }
    const sanHeMap = { '申':'子辰', '子':'申辰', '辰':'申子', '亥':'卯未', '卯':'亥未', '未':'亥卯', '寅':'午戌', '午':'寅戌', '戌':'寅午', '巳':'酉丑', '酉':'巳丑', '丑':'巳酉' }
    
    isChong = dayChong.includes(item.name)
    const isLiuHe = liuHeMap[dayZhi] === itemZhi
    const isSanHe = sanHeMap[dayZhi] && sanHeMap[dayZhi].includes(itemZhi)
    
    if (isChong) {
      // 提取煞位 (例如从 "冲狗煞南" 中提取 "南")
      const shaPos = dayChong.split('煞')[1] || lunar.value.getDaySha()
      message = `属${item.name}者今日[逢冲]。受[${dayChong.split('(')[0]}]及纳音[${nayun}]波动影响，气场极不稳定，宜守不宜动，忌往${shaPos}方。`
      level = LUCK_LEVELS[4]
    } else if (isLiuHe) {
      message = `属${item.name}者今日[六合]大吉。地支与今日[${dayZhi}]相合化，气场极其和谐，值[${zhiShen}]神位，利于谈合、社交及重要决策。`
      level = LUCK_LEVELS[0]
    } else if (isSanHe) {
      message = `属${item.name}者今日[三合]呈祥。得星轨贵人暗中护佑，事半功倍。结合纳音[${nayun}]之气，利于在${lunar.value.getPositionCai()}方谋划发展。`
      level = LUCK_LEVELS[1]
    } else {
      // 普通生肖差异化 (引入基于地支的随机偏移)
      const offset = (itemZhi.charCodeAt(0) + lunar.value.getDay()) % 3
      const advices = [
        `属${item.name}者今日运势[稳健]。值[${zhiShen}]日，能量温和，适合处理积累已久的琐事。`,
        `属${item.name}者今日运势[渐升]。受纳音[${nayun}]滋养，思维灵动，宜在${lunar.value.getPositionXi()}方寻找灵感。`,
        `属${item.name}者今日运势[中平]。建议保持作息规律，不宜过度劳累，晚间运势会有所回升。`
      ]
      message = advices[offset]
      level = LUCK_LEVELS[3]
    }
  }

  // 3. 差异化等级计算
  if (type === 'zodiac') {
    const luckScore = (item.name.length + xiuLuck.length) % 5
    level = LUCK_LEVELS[luckScore]
  }

  return {
    ...item,
    level,
    message,
    isFlipped: false,
    extra: type === 'zodiac' ? `${nineStarName}·${xiu}宿` : `${nayun}·${zhiShen}日`
  }
}

const zodiacCards = ref([])
const chineseZodiacCards = ref([])
const animatingCard = ref(null)

const updateCards = () => {
  zodiacCards.value = ZODIAC_SIGNS.map(s => generateFortune(s, 'zodiac'))
  chineseZodiacCards.value = CHINESE_ZODIAC.map(c => generateFortune(c, 'chinese'))
}

onMounted(() => {
  updateCards()
})

// 监听日期变化刷新卡牌
watch(selectedDate, () => {
  updateCards()
})

function handleFlip(card, event) {
  if (animatingCard.value) return
  
  // 如果已经是翻开状态，直接在原地盖回
  if (card.isFlipped) {
    card.isFlipped = false
    return
  }
  
  // 启动剧场动画 (仅用于翻开)
  const el = event.currentTarget
  const rect = el.getBoundingClientRect()
  
  // 启动剧场动画
  animatingCard.value = {
    ...card,
    rect: {
      top: rect.top,
      left: rect.left,
      width: rect.width,
      height: rect.height
    }
  }

  // 动画结束后处理
  setTimeout(() => {
    card.isFlipped = true
    animatingCard.value = null
  }, 2200)
}

function resetAll() {
  zodiacCards.value.forEach(c => c.isFlipped = false)
  chineseZodiacCards.value.forEach(c => c.isFlipped = false)
}
</script>

<template>
  <div class="fortune-page">
    <!-- 剧场动画 Overlay -->
    <Teleport to="body">
      <div v-if="animatingCard" class="theater-overlay">
        <div 
          class="theater-card"
          :style="{
            '--start-top': animatingCard.rect.top + 'px',
            '--start-left': animatingCard.rect.left + 'px',
            '--card-w': animatingCard.rect.width + 'px',
            '--card-h': animatingCard.rect.height + 'px'
          }"
        >
          <div class="theater-card-inner">
            <!-- 正面 (旋转中) -->
            <div class="card-front theater-front" :class="animatingCard.element ? 'zodiac-front' : 'chinese-front'">
              <div class="sign-icon">{{ animatingCard.icon }}</div>
              <div class="sign-name">{{ animatingCard.name }}</div>
            </div>
            <!-- 背面 (揭晓) -->
            <div class="card-back theater-back" :style="{ '--luck-color': animatingCard.level.color, '--luck-bg': animatingCard.level.bg }">
              <div class="luck-level">{{ animatingCard.level.label }}</div>
              <div class="luck-msg">{{ animatingCard.message }}</div>
            </div>
          </div>
          <!-- 能量光晕 -->
          <div class="energy-pulse"></div>
        </div>
      </div>
    </Teleport>

    <div class="header-section">
      <div class="title-wrapper">
        <MagicStick class="magic-icon" />
        <h1>星象生肖占卜</h1>
        <div class="date-tag-wrapper">
          <div class="date-tag">
            <Calendar class="calendar-icon" />
            <span>{{ dateInfo.solar }} {{ dateInfo.weekday }}</span>
            <!-- 隐形日期选择器，覆盖在标签上 -->
            <el-date-picker
              v-model="selectedDate"
              type="date"
              :clearable="false"
              class="invisible-picker"
              popper-class="fortune-date-popper"
            />
          </div>
        </div>
      </div>

      <div class="calendar-panel">
        <div class="panel-main">
          <div class="lunar-date">{{ dateInfo.lunar }}</div>
          <div class="ganzhi-info">{{ dateInfo.ganZhi }}</div>
        </div>
        <div class="almanac-row">
          <div class="almanac-item yi"><span class="label">宜</span><span class="value">{{ almanac.yi }}</span></div>
          <div class="almanac-item ji"><span class="label">忌</span><span class="value">{{ almanac.ji }}</span></div>
        </div>
      </div>

      <div class="actions">
        <button class="reset-btn" @click="resetAll">重置全部卡牌</button>
      </div>
    </div>

    <!-- 12星座板块 -->
    <section class="fortune-section">
      <h2 class="section-title"><Star class="section-icon" /> 十二星座 · 每日星语</h2>
      <div class="cards-grid">
        <div 
          v-for="card in zodiacCards" 
          :key="card.name" 
          class="card-container" 
          :class="{ 'is-hidden': animatingCard?.name === card.name }"
          @click="handleFlip(card, $event)"
        >
          <div class="card-inner" :class="{ 'is-flipped': card.isFlipped }">
            <div class="card-front zodiac-front">
              <div class="sign-icon">{{ card.icon }}</div>
              <div class="sign-name">{{ card.name }}</div>
              <div class="sign-date">{{ card.date }}</div>
            </div>
            <div class="card-back" :style="{ '--luck-color': card.level.color, '--luck-bg': card.level.bg }">
              <div class="luck-level">{{ card.level.label }}</div>
              <div class="luck-msg">{{ card.message }}</div>
              <div class="card-footer">{{ card.name }} · {{ card.extra }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- 12生肖板块 -->
    <section class="fortune-section">
      <h2 class="section-title"><Compass class="section-icon" /> 十二生肖 · 岁时吉凶</h2>
      <div class="cards-grid">
        <div 
          v-for="card in chineseZodiacCards" 
          :key="card.name" 
          class="card-container" 
          :class="{ 'is-hidden': animatingCard?.name === card.name }"
          @click="handleFlip(card, $event)"
        >
          <div class="card-inner" :class="{ 'is-flipped': card.isFlipped }">
            <div class="card-front chinese-front">
              <div class="sign-icon">{{ card.icon }}</div>
              <div class="sign-name">生肖 {{ card.name }}</div>
              <div class="sign-zhi">地支 [{{ card.zhi }}]</div>
            </div>
            <div class="card-back" :style="{ '--luck-color': card.level.color, '--luck-bg': card.level.bg }">
              <div class="luck-level">{{ card.level.label }}</div>
              <div class="luck-msg">{{ card.message }}</div>
              <div class="card-footer">属{{ card.name }} · {{ card.extra }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.fortune-page {
  padding: 40px;
  min-height: 100%;
  background: #0a0a0f;
  color: #fff;
}

/* 剧场动画 Overlay */
.theater-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(15px);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: auto;
}

.theater-card {
  position: absolute;
  width: var(--card-w);
  height: var(--card-h);
  left: var(--start-left);
  top: var(--start-top);
  animation: theatrical-sequence 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  transform-style: preserve-3d;
  perspective: 2000px;
}

.theater-card-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transform-style: preserve-3d;
}

@keyframes theatrical-sequence {
  0% {
    transform: translate(0, 0) rotateY(0) scale(1);
    left: var(--start-left);
    top: var(--start-top);
  }
  /* 移动到中心并放大 */
  25% {
    transform: translate(calc(50vw - var(--start-left) - var(--card-w)/2), 
                        calc(50vh - var(--start-top) - var(--card-h)/2)) 
               rotateY(0) scale(2);
  }
  /* 旋转三圈 */
  70% {
    transform: translate(calc(50vw - var(--start-left) - var(--card-w)/2), 
                        calc(50vh - var(--start-top) - var(--card-h)/2)) 
               rotateY(1080deg) scale(2.2);
  }
  /* 翻开背面 */
  85% {
    transform: translate(calc(50vw - var(--start-left) - var(--card-w)/2), 
                        calc(50vh - var(--start-top) - var(--card-h)/2)) 
               rotateY(1260deg) scale(2);
  }
  /* 回归原位 */
  100% {
    transform: translate(0, 0) rotateY(1260deg) scale(1);
    left: var(--start-left);
    top: var(--start-top);
  }
}

.theater-front, .theater-back {
  position: absolute;
  inset: 0;
  backface-visibility: hidden;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.theater-back {
  transform: rotateY(180deg);
  background: var(--luck-bg);
  border: 2px solid var(--luck-color);
  padding: 20px;
  text-align: center;
}

.energy-pulse {
  position: absolute;
  inset: -20px;
  border-radius: 30px;
  background: radial-gradient(circle, rgba(139, 92, 246, 0.3) 0%, transparent 70%);
  opacity: 0;
  animation: pulse-bloom 2.2s ease-out infinite;
  pointer-events: none;
}

@keyframes pulse-bloom {
  40% { opacity: 0; transform: scale(0.8); }
  70% { opacity: 1; transform: scale(1.2); }
  100% { opacity: 0; transform: scale(1.5); }
}

/* 隐藏正在动画的原卡牌 */
.card-container.is-hidden {
  opacity: 0;
  pointer-events: none;
}

.header-section {
  text-align: center;
  margin-bottom: 60px;
}

.title-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 15px;
  margin-bottom: 24px;
}

.magic-icon {
  width: 32px;
  height: 32px;
  color: #8b5cf6;
}

.header-section h1 {
  font-size: 36px;
  font-weight: 800;
  margin: 0;
  background: linear-gradient(90deg, #fff, #8b5cf6, #ec4899);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.date-tag {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(139, 92, 246, 0.1);
  padding: 6px 16px;
  border-radius: 30px;
  border: 1px solid rgba(139, 92, 246, 0.3);
  font-size: 14px;
  color: #a78bfa;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative; /* 必须开启相对定位 */
  overflow: hidden;
}

.date-tag:hover {
  background: rgba(139, 92, 246, 0.2);
  border-color: #8b5cf6;
  transform: scale(1.05);
}

/* 隐形日期选择器样式 */
.invisible-picker {
  position: absolute !important;
  inset: 0;
  width: 100% !important;
  height: 100% !important;
  opacity: 0; /* 完全透明 */
  cursor: pointer;
}

:deep(.invisible-picker .el-input__wrapper) {
  width: 100% !important;
  height: 100% !important;
  padding: 0 !important;
}

.calendar-panel {
  display: inline-flex;
  flex-direction: column;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 20px 40px;
  backdrop-filter: blur(20px);
}

.lunar-date { font-size: 24px; font-weight: 600; margin-bottom: 5px; }
.ganzhi-info { font-size: 14px; color: rgba(255, 255, 255, 0.4); margin-bottom: 15px; }

.almanac-row { display: flex; gap: 40px; justify-content: center; }
.almanac-item { display: flex; align-items: center; gap: 10px; }
.almanac-item .label {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: bold;
}
.yi .label { background: #52c41a; color: #fff; }
.ji .label { background: #ff4d4f; color: #fff; }

.actions { margin-top: 30px; }
.reset-btn {
  background: transparent; border: 1px solid rgba(139, 92, 246, 0.5); color: #8b5cf6;
  padding: 8px 20px; border-radius: 10px; cursor: pointer; transition: all 0.3s;
}
.reset-btn:hover { background: rgba(139, 92, 246, 0.1); color: #fff; border-color: #8b5cf6; }

.fortune-section { margin-bottom: 80px; }
.section-title {
  display: flex; align-items: center; gap: 12px; font-size: 24px; font-weight: 700; margin-bottom: 30px; color: #fff; padding-left: 10px; border-left: 4px solid #8b5cf6;
}
.section-icon { width: 24px; height: 24px; color: #8b5cf6; }

.cards-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 25px;
}

.card-container { 
  aspect-ratio: 4/5; 
  perspective: 2000px; 
  cursor: pointer; 
  transition: transform 0.3s ease;
}

.card-container:hover {
  transform: translateY(-8px) scale(1.03);
}

.card-inner { 
  position: relative; 
  width: 100%; 
  height: 100%; 
  transition: transform 1.2s cubic-bezier(0.34, 1.56, 0.64, 1); 
  transform-style: preserve-3d; 
}

.card-inner.is-flipped { 
  transform: rotateY(180deg) translateZ(50px); 
}

.card-front, .card-back {
  position: absolute; 
  width: 100%; 
  height: 100%; 
  -webkit-backface-visibility: hidden; 
  backface-visibility: hidden; 
  border-radius: 20px; 
  overflow: hidden;
  box-shadow: 0 15px 35px rgba(0,0,0,0.5);
}

.card-front {
  background: linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 100%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 20px;
  backdrop-filter: blur(10px);
}

.zodiac-front { 
  background: radial-gradient(circle at top right, rgba(99, 102, 241, 0.15), transparent); 
}
.chinese-front { 
  background: radial-gradient(circle at top right, rgba(236, 72, 153, 0.15), transparent); 
}

.sign-icon { 
  font-size: 54px; 
  margin-bottom: 15px; 
  filter: drop-shadow(0 0 15px rgba(255,255,255,0.3));
  transition: transform 0.5s ease;
}

.card-container:hover .sign-icon {
  transform: scale(1.1) rotate(5deg);
}

.sign-name { font-size: 18px; font-weight: 700; margin-bottom: 5px; color: #fff; }
.sign-date, .sign-zhi { font-size: 12px; color: rgba(255, 255, 255, 0.5); font-family: 'Consolas', monospace; }

.card-back {
  background: var(--luck-bg); 
  border: 2px solid var(--luck-color); 
  transform: rotateY(180deg);
  display: flex; flex-direction: column; padding: 24px; justify-content: space-between; text-align: left;
  box-shadow: 0 0 25px var(--luck-bg), inset 0 0 20px var(--luck-bg);
  animation: neon-pulse 2s infinite ease-in-out;
}

/* 增加翻牌扫光特效 */
.card-back::after {
  content: '';
  position: absolute;
  top: -150%;
  left: -150%;
  width: 400%;
  height: 400%;
  background: linear-gradient(
    45deg,
    transparent 45%,
    rgba(255, 255, 255, 0.0) 48%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0.0) 52%,
    transparent 55%
  );
  transform: rotate(-45deg);
  pointer-events: none;
}

.is-flipped .card-back::after {
  animation: shine-sweep 1.2s forwards;
  animation-delay: 0.2s;
}

@keyframes shine-sweep {
  0% { transform: translate(-20%, -20%) rotate(-45deg); }
  100% { transform: translate(20%, 20%) rotate(-45deg); }
}

@keyframes neon-pulse {
  0%, 100% { border-color: var(--luck-color); opacity: 1; }
  50% { border-color: #fff; opacity: 0.9; }
}

.luck-level { 
  font-size: 24px; 
  font-weight: 900; 
  color: var(--luck-color); 
  margin-bottom: 15px; 
  text-align: center;
  text-shadow: 0 0 10px var(--luck-color);
}
.luck-msg { font-size: 14px; line-height: 1.7; color: rgba(255, 255, 255, 0.9); flex: 1; display: flex; align-items: center; }
.card-footer { font-size: 11px; color: rgba(255, 255, 255, 0.4); text-align: center; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; }

@media (max-width: 768px) {
  .fortune-page { padding: 20px; }
  .cards-grid { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 15px; }
  .header-section h1 { font-size: 28px; }
  .calendar-panel { padding: 15px 20px; min-width: 100%; }
}
</style>
