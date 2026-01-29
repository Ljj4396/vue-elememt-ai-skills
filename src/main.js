import './assets/main.css'

import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import router from './router'
import axiosPlugin from './plugins/axios'

// Element Plus 全局引入
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'
import zhCn from 'element-plus/dist/locale/zh-cn.mjs'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(axiosPlugin)
app.use(ElementPlus, { locale: zhCn })

app.mount('#app')
