import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './style.css'

import VChart from 'vue-echarts'
// 一次性引入完整 echarts，不用拆分各种Chart、Component
import * as echarts from 'echarts'
import 'echarts/theme/dark'

const app = createApp(App)
app.component('v-chart', VChart)
// 全局挂载 echarts
app.config.globalProperties.$echarts = echarts
app.use(router)
app.mount('#app')