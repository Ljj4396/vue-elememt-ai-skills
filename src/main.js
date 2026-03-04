import 'virtual:uno.css'
import './assets/main.css'
import './assets/uno-overrides.css'

import { createApp } from 'vue'
import App from './App.vue'

import { createPinia } from 'pinia'
import router from './router'
import axiosPlugin from './plugins/axios'

// Element Plus 按需注册
import {
  ElButton,
  ElConfigProvider,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElPagination,
  ElScrollbar,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  ElUpload,
  ElLoading,
} from 'element-plus'
import 'element-plus/dist/index.css'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.use(axiosPlugin)

const elementComponents = [
  ElConfigProvider,
  ElButton,
  ElDatePicker,
  ElDialog,
  ElDropdown,
  ElDropdownItem,
  ElDropdownMenu,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElPagination,
  ElScrollbar,
  ElSwitch,
  ElTable,
  ElTableColumn,
  ElTag,
  ElTooltip,
  ElUpload,
]

elementComponents.forEach((component) => {
  app.use(component)
})

app.directive('loading', ElLoading.directive)

app.mount('#app')
