<template>
  <div class="screen-wrap">
    <!-- 顶部：标题 + 时间 + 统计卡片 -->
    <div class="screen-top">
      <div class="top-left">
        <h1 class="system-title">工单全局态势监控大屏</h1>
      </div>
      <div class="top-center">
        <div class="real-time">{{ currentTime }}</div>
      </div>
      <div class="top-right">
        <div class="stat-card">
          <div class="card-label">总量</div>
          <div class="card-num">{{ overview.total || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="card-label">处理中</div>
          <div class="card-num">{{ overview.processing || 0 }}</div>
        </div>
        <div class="stat-card">
          <div class="card-label">已完成</div>
          <div class="card-num">{{ overview.completed || 0 }}</div>
        </div>
        <div class="stat-card warn">
          <div class="card-label">黄色</div>
          <div class="card-num">{{ overview.yellow || 0 }}</div>
        </div>
        <div class="stat-card danger">
          <div class="card-label">橙色</div>
          <div class="card-num">{{ overview.orange || 0 }}</div>
        </div>
        <div class="stat-card severe">
          <div class="card-label">红色</div>
          <div class="card-num">{{ overview.red || 0 }}</div>
        </div>
      </div>
    </div>

    <!-- Tab 导航：数据类型切换 + 工单类型筛选 -->
    <div class="screen-tabs">
      <div class="tab-nav">
        <span
          v-for="tab in tabs"
          :key="tab.key"
          :class="{ active: activeTab === tab.key }"
          @click="switchTab(tab.key)"
        >{{ tab.label }}</span>
      </div>
      <div class="type-switch">
        <span
          v-for="t in workTypes"
          :key="t.value"
          :class="{ active: selectedType === t.value }"
          @click="switchType(t.value)"
        >{{ t.label }}</span>
      </div>
    </div>

    <!-- Tab 1：地图分析 -->
    <div v-if="activeTab === 'map'" class="screen-content">
      <div class="content-grid two-col">
        <div class="chart-panel panel-map">
          <div class="panel-title">江西地市区域工单热力分布</div>
          <v-chart
            v-if="dataReady && cityDistribution.length > 0"
            class="ec-box"
            :option="heatOption"
          />
          <div v-else class="ec-box-empty">加载中...</div>
        </div>
        <div class="chart-panel panel-scroll">
          <div class="panel-title">预警工单实时滚动</div>
          <div class="scroll-list" ref="scrollRef">
            <div v-for="(item, idx) in warnList" :key="idx" class="list-row">
              <span class="row-city">{{ item.city }}</span>
              <span class="row-type">{{ item.workType }}</span>
              <span class="row-level" :class="levelClass(item.alertLevel)">{{ item.alertLevel }}</span>
              <span class="row-time">{{ item.createTime }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab 2：统计分析 -->
    <div v-if="activeTab === 'stats'" class="screen-content">
      <div class="content-grid two-col">
        <div class="chart-panel">
          <div class="panel-title">工单类型分布</div>
          <v-chart class="ec-box" :option="pieOption" />
        </div>
        <div class="chart-panel">
          <div class="panel-title">预警等级分布</div>
          <v-chart class="ec-box" :option="barAlertOption" />
        </div>
      </div>
      <div class="content-grid one-row">
        <div class="chart-panel">
          <div class="panel-title" style="display:flex;align-items:center;justify-content:space-between;">
            <span>{{ trendDate }} 每小时工单趋势（共 {{ trendTotal }} 单）</span>
            <span style="font-size:13px;font-weight:normal;color:#b0d8ff;">
              <button class="mini-btn" :class="{active: trendDate==='today'}" @click="setTrendDate('today')">今天</button>
              <button class="mini-btn" :class="{active: trendDate==='yesterday'}" @click="setTrendDate('yesterday')">昨天</button>
              <input type="date" v-model="trendDateInput" @change="pickTrendDate" style="margin-left:6px;color:#000" />
            </span>
          </div>
          <v-chart class="ec-box" :option="lineOption" ref="lineChart" @click="onTrendClick" />
        </div>
      </div>
    </div>

    <!-- Tab 3：区域排行 -->
    <div v-if="activeTab === 'rank'" class="screen-content">
      <div class="content-grid two-col rank-row">
        <div class="chart-panel">
          <div class="panel-title">区域超时 TOP 排行（Top 10）</div>
          <v-chart class="ec-box" :option="rankOption" />
        </div>
        <div class="chart-panel">
          <div class="panel-title">区域预警热力分布（黄/橙/红，Top 10）</div>
          <v-chart class="ec-box" :option="districtOption" />
        </div>
      </div>
      <div class="content-grid one-row">
        <div class="chart-panel">
          <div class="panel-title">各地市工单总量 / 预警总量</div>
          <v-chart class="ec-box" :option="cityBarOption" />
        </div>
      </div>
    </div>
  </div>

  <!-- 点击"趋势图某一点"后，显示该小时段内工单明细 -->
  <div v-if="trendDetailVisible" class="modal-mask" @click.self="trendDetailVisible=false">
    <div class="modal-panel">
      <div class="modal-header">
        <span>{{ trendDetailTitle }}</span>
        <span class="close-btn" @click="trendDetailVisible=false">×</span>
      </div>
      <div class="modal-body">
        <table class="detail-table" v-if="trendDetailList.length">
          <thead>
            <tr>
              <th>工单号</th>
              <th>类型</th>
              <th>地市</th>
              <th>区县</th>
              <th>处理人</th>
              <th>状态</th>
              <th>预警</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(o, i) in trendDetailList" :key="o.id || i">
              <td>{{ o.orderNo }}</td>
              <td>{{ o.workType }}</td>
              <td>{{ o.city }}</td>
              <td>{{ o.district }}</td>
              <td>{{ o.currentHandler || '-' }}</td>
              <td>{{ o.workStatus || '-' }}</td>
              <td>{{ o.alertLevel || '-' }}</td>
              <td>{{ (o.createTime || '').toString().slice(0, 19) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-else class="empty-hint">该小时段内暂无工单</div>
      </div>
      <div class="modal-footer">
        <button class="btn" @click="trendDetailVisible=false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue'
import * as echarts from 'echarts'
import jiangxiGeo from '@/assets/jiangxi.json'

// 关键：在 <script setup> 同步阶段立即注册地图（而不是 onMounted），确保 ECharts 在任何地方
// 使用 map: 'jiangxi' 前，地图定义已经就绪。异步/延后注册会导致 ECharts 内部 labelLayoutHelper
// 读到 null 的 geoJson 坐标数组，抛出 "Cannot read properties of null (reading '0')"。
try {
  if (jiangxiGeo && (jiangxiGeo.features || (jiangxiGeo.features && jiangxiGeo.features.length))) {
    echarts.registerMap('jiangxi', jiangxiGeo)
  }
} catch (e) {
  console.error('地图注册失败:', e)
}

// 数据加载标志位：用于控制地图的条件渲染
const dataReady = ref(false)

// 全局深色科技配色
const COLORS = ['#00b8ff', '#39ff14', '#ff6b35', '#f7d038', '#9d4edd']

// 工单类型选项（与后端枚举保持一致）
const workTypes = [
  { label: '全部', value: '' },
  { label: '新装', value: 'NEW_INSTALL' },
  { label: 'FTTR', value: 'FTTR' },
  { label: '修障', value: 'REPAIR' },
  { label: '移机', value: 'RELOCATE' }
]

const selectedType = ref('')

// Tab 导航配置
const tabs = [
  { label: '地图分析', key: 'map' },
  { label: '统计分析', key: 'stats' },
  { label: '区域排行', key: 'rank' }
]
const activeTab = ref('map')

// 手动 resize 所有图表：派发 window resize，确保 ECharts 重新测量容器尺寸
// 不使用 v-chart 的 autoresize 避免 ECharts 地图在 labelLayoutHelper 内的 null 访问错误
const manualResize = () => {
  window.dispatchEvent(new Event('resize'))
  setTimeout(() => window.dispatchEvent(new Event('resize')), 50)
}
let windowResizeTimer = null

// 切换 Tab 时重置滚动定时器
const switchTab = (key) => {
  activeTab.value = key
  if (scrollTimer) {
    clearInterval(scrollTimer)
    scrollTimer = null
  }
  if (key === 'map') {
    nextTick(() => {
      scrollTimer = setInterval(autoScroll, 30)
    })
  }
  // 切换后刷新图表尺寸（手动，避免 autoresize 的地图 bug）
  nextTick(() => {
    manualResize()
  })
}

// 当前登录用户（统一从 auth.js 读取）
import { getUser } from '../utils/auth.js'
const userInfo = ref(getUser() || {})

const authParam = () => {
  const u = userInfo.value || {}
  const params = []
  if (selectedType.value) params.push(`workType=${encodeURIComponent(selectedType.value)}`)
  if (u.role) params.push(`role=${encodeURIComponent(u.role)}`)
  if (u.role === 'MEMBER' && u.username) params.push(`handlerName=${encodeURIComponent(u.username)}`)
  return params.length ? ('?' + params.join('&')) : ''
}

// 基础数据
const overview = ref({})
const cityDistribution = ref([])
const typeDistribution = ref([])
const alertDistribution = ref([])
const lineData = ref([])
const topTimeout = ref([])
const districtAlert = ref([])
const warnList = ref([])

// 趋势图组件实例 ref（模板里 ref="lineChart"）
const lineChart = ref(null)

// 趋势图日期 & 点击弹窗
const trendDate = ref(formatDate(new Date()))
const trendDateInput = ref(formatDate(new Date()))
const trendTotal = computed(() => {
  return (lineData.value || []).reduce((s, x) => s + Number((x && x.count) || 0), 0)
})
const trendDetailVisible = ref(false)
const trendDetailTitle = ref('')
const trendDetailList = ref([])

function formatDate(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
function setTrendDate(which) {
  if (which === 'today') {
    trendDate.value = formatDate(new Date())
    trendDateInput.value = trendDate.value
  } else if (which === 'yesterday') {
    const d = new Date()
    d.setDate(d.getDate() - 1)
    trendDate.value = formatDate(d)
    trendDateInput.value = trendDate.value
  }
  fetchData()
}
function pickTrendDate() {
  if (!trendDateInput.value) return
  trendDate.value = trendDateInput.value
  fetchData()
}

// 点击折线图某一个 dataPoint，拉取该小时段内的工单明细
function onTrendClick(params) {
  const p = params && params[0] ? params[0] : params
  if (!p || typeof p.dataIndex === 'undefined' || p.componentType !== 'series') return
  const item = lineData.value[p.dataIndex]
  if (!item) return
  const date = item.date || trendDate.value
  const hour = typeof item.hourNum === 'number' ? item.hourNum : Number(String(item.hour || '').split(':')[0])
  openTrendDetail(date, hour)
}
async function openTrendDetail(date, hour) {
  if (hour == null || isNaN(Number(hour))) return
  const hourStr = String(hour).padStart(2, '0')
  trendDetailTitle.value = `${date} ${hourStr}:00 - ${hourStr}:59 工单明细`
  trendDetailList.value = []
  trendDetailVisible.value = true
  try {
    const qs = authParam()
    const r = await fetch(`http://localhost:8080/api/workOrder/trend/${encodeURIComponent(date)}/${hour}${qs}`)
    const j = await r.json()
    const data = (j && j.data != null) ? j.data : j
    trendDetailList.value = Array.isArray(data) ? data : []
  } catch (e) {
    console.error('加载小时段工单明细失败', e)
    trendDetailList.value = []
  }
}

// 实时时间
const currentTime = ref('')
const updateTime = () => {
  const d = new Date()
  currentTime.value = d.toLocaleString('zh-CN', { hour12: false })
}
let timeTimer = setInterval(updateTime, 1000)

let fetchTimer = null
let scrollTimer = null
const scrollRef = ref(null)

const levelClass = (lvl) => {
  if (!lvl) return ''
  if (lvl.includes('YELLOW') || lvl === '黄色预警') return 'warn'
  if (lvl.includes('ORANGE') || lvl === '橙色预警') return 'orange'
  if (lvl.includes('RED') || lvl === '红色预警') return 'danger'
  return ''
}

// ========== ECharts 配置项 ==========
// 1.工单类型饼图
const pieOption = ref({
  dark: true,
  tooltip: { trigger: 'item' },
  legend: { left: 'center', top: 10, textStyle: { color: '#b0d8ff', fontSize: 13 } },
  series: [{
    type: 'pie',
    radius: ['35%', '70%'],
    center: ['50%', '58%'],
    data: [],
    label: { show: false, color: '#b0d8ff', fontSize: 12 },
    labelLine: { show: false },
    itemStyle: { color: function (params) { return COLORS[params.dataIndex % COLORS.length] } }
  }]
})
watch(typeDistribution, val => {
  if (val && val.length > 0) {
    pieOption.value.series[0].data = val.map(item => ({
      name: item.label || item.workType || item.work_type || '未知',
      value: item.count || 0
    }))
    pieOption.value.series[0].label = { show: true, color: '#b0d8ff', fontSize: 13, formatter: '{b}\n{d}%' }
    pieOption.value.series[0].labelLine = { show: true, length: 10, length2: 15, lineStyle: { color: '#00b8ff55' } }
  } else {
    pieOption.value.series[0].data = [{ name: '暂无数据', value: 1, itemStyle: { color: '#88888844' } }]
    pieOption.value.series[0].label = { show: true, color: '#888888' }
  }
}, { deep: true })

// 2.预警等级柱状图
const barAlertOption = ref({
  dark: true,
  tooltip: { trigger: 'axis' },
  grid: { left: '8%', right: '8%', bottom: '8%', top: '15%', containLabel: true },
  xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00b8ff33' } }, splitLine: { lineStyle: { color: '#00b8ff11' } } },
  yAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 13 } },
  series: [{
    type: 'bar',
    data: [],
    barWidth: '50%',
    itemStyle: {
      color: function (params) {
        const name = params.name || ''
        if (name.includes('RED') || name.includes('红色')) return '#ff3030'
        if (name.includes('ORANGE') || name.includes('橙色')) return '#ff6b35'
        if (name.includes('YELLOW') || name.includes('黄色')) return '#f7d038'
        return '#00b8ff'
      }
    },
    label: { show: true, position: 'right', color: '#b0d8ff', fontSize: 13 }
  }]
})
watch(alertDistribution, val => {
  barAlertOption.value.yAxis.data = val.map(i => i.label || i.alertLevel || i.alert_level || '未知')
  barAlertOption.value.series[0].data = val.map(i => i.count || 0)
}, { deep: true })

// 3.江西地市地图热力
const heatOption = ref({
  dark: true,
  tooltip: { trigger: 'item', formatter: '{b}<br/>工单数量：{c}单' },
  visualMap: {
    min: 0,
    max: 200,
    left: 'left',
    bottom: '5%',
    textStyle: { color: '#fff', fontSize: 12 },
    inRange: { color: ['#27F56C', '#27F5D6', '#27EEF5'] }
  },
  series: [{
    name: '工单总量',
    type: 'map',
    map: 'jiangxi',
    roam: false,
    zoom: 1.1,
    label: { show: false, color: '#ffffff' },
    emphasis: {
      label: { show: true, color: '#ffffff', fontSize: 14, fontWeight: 'bold' }
    },
    itemStyle: { borderColor: '#00b8ff44', areaColor: '#0b1329' },
    data: []
  }]
})
watch(cityDistribution, val => {
  if (val && val.length > 0) {
    heatOption.value.series[0].data = val.map(item => ({
      name: item.city,
      value: item.count || item.total || 0
    }))
    heatOption.value.series[0].label = { show: true, color: '#ffffff', fontSize: 11 }
    nextTick(() => {
      dataReady.value = true
    })
  }
}, { deep: true })

// 4.24小时趋势折线
const lineOption = ref({
  dark: true,
  tooltip: {
    trigger: 'axis',
    formatter: (params) => {
      const p = params && params[0]
      if (!p) return ''
      return `${p.name}<br/>工单量：${p.value}<br/><span style="color:#00b8ff">点击该数据点可查看 ${p.name} 的工单明细</span>`
    }
  },
  legend: { data: ['工单量'], textStyle: { color: '#b0d8ff', fontSize: 13 }, top: 10 },
  grid: { left: '4%', right: '4%', bottom: '8%', top: '18%', containLabel: true },
  xAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12 }, splitLine: { lineStyle: { color: '#00b8ff11' } } },
  yAxis: { type: 'value', axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12 }, splitLine: { lineStyle: { color: '#00b8ff11' } } },
  series: [{
    name: '工单量',
    type: 'line',
    smooth: true,
    symbol: 'circle',
    symbolSize: 12,
    cursor: 'pointer',
    data: [],
    itemStyle: { color: '#00b8ff' },
    lineStyle: { width: 3, color: '#00b8ff' },
    emphasis: {
      focus: 'series',
      scale: true,
      itemStyle: { color: '#ff6b35', shadowBlur: 10, shadowColor: 'rgba(255, 107, 53, 0.5)' }
    },
    areaStyle: {
      color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
        { offset: 0, color: '#00b8ff66' },
        { offset: 1, color: '#00b8ff00' }
      ])
    }
  }]
})
watch(lineData, val => {
  const arr = (Array.isArray(val) ? val : []).filter(i => i && (typeof i.count === 'number' || typeof i.hour === 'string'))
  lineOption.value.xAxis.data = arr.map(i => String(i.hour || ''))
  lineOption.value.series[0].data = arr.map(i => ({
    value: Number(i.count || 0),
    hourNum: typeof i.hourNum === 'number' ? i.hourNum : Number(String(i.hour || '').split(':')[0]),
    date: i.date || trendDate.value
  }))
  nextTick(() => { bindTrendClick() })
}, { deep: true })

function bindTrendClick() {
  if (lineChart.value && lineChart.value.getEchartsInstance) {
    try {
      const inst = lineChart.value.getEchartsInstance()
      inst.off('click')
      inst.on('click', (params) => {
        if (params && params.componentType === 'series' && typeof params.dataIndex !== 'undefined') {
          const item = lineData.value[params.dataIndex]
          if (item) {
            const date = item.date || trendDate.value
            const hour = typeof item.hourNum === 'number' ? item.hourNum : Number(String(item.hour || '').split(':')[0])
            openTrendDetail(date, hour)
          }
        }
      })
    } catch (e) {
      // 实例还未就绪，忽略，等 onMounted 再绑一次
    }
  }
}

// 5.区域超时 top 横向柱状
const rankOption = ref({
  dark: true,
  tooltip: { trigger: 'axis' },
  grid: { left: 140, right: 60, bottom: 34, top: 18, containLabel: true },
  xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12 }, splitLine: { lineStyle: { color: '#00b8ff11' } } },
  yAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12 } },
  series: [{
    type: 'bar',
    data: [],
    barWidth: '55%',
    itemStyle: { color: '#ff6b35' },
    label: { show: true, position: 'right', color: '#b0d8ff', fontSize: 13 }
  }]
})
watch(topTimeout, val => {
  // 只展示前 10 条（足够信息 + 控制高度）
  const top = (val || []).slice(0, 10)
  rankOption.value.yAxis.data = top.map(i => (i.city || '') + (i.district ? ' - ' + i.district : ''))
  rankOption.value.series[0].data = top.map(i => i.timeoutCount || i.count || 0)
}, { deep: true })

// 6.区域预警堆叠条形图（district 维度）
const districtOption = ref({
  dark: true,
  tooltip: { trigger: 'axis' },
  legend: { data: ['黄色预警', '橙色预警', '红色预警'], textStyle: { color: '#b0d8ff', fontSize: 13 }, top: 10 },
  grid: { left: 140, right: 60, bottom: 34, top: 42, containLabel: true },
  xAxis: { type: 'value', axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12 }, splitLine: { lineStyle: { color: '#00b8ff11' } } },
  yAxis: { type: 'category', data: [], axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12 } },
  series: [
    { name: '黄色预警', type: 'bar', stack: 'total', data: [], itemStyle: { color: '#f7d038' } },
    { name: '橙色预警', type: 'bar', stack: 'total', data: [], itemStyle: { color: '#ff6b35' } },
    { name: '红色预警', type: 'bar', stack: 'total', data: [], itemStyle: { color: '#ff3030' } }
  ]
})
watch(districtAlert, val => {
  // 只展示前 10 条（按黄+橙+红总和降序，控制该面板高度
  const arr = (val || [])
    .map(i => ({ ...i, total: (i.yellow || 0) + (i.orange || 0) + (i.red || 0) }))
    .filter(i => i.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
  districtOption.value.yAxis.data = arr.map(i => (i.city || '') + (i.district ? ' - ' + i.district : ''))
  districtOption.value.series[0].data = arr.map(i => i.yellow || 0)
  districtOption.value.series[1].data = arr.map(i => i.orange || 0)
  districtOption.value.series[2].data = arr.map(i => i.red || 0)
}, { deep: true })

// 7.地市总量柱状图
// 江西 11 个地市的固定顺序（行政区划标准顺序：北→南、东→西）
const JIANGXI_CITIES = [
  '南昌市', '景德镇市', '萍乡市', '九江市',
  '新余市', '鹰潭市', '赣州市', '吉安市',
  '宜春市', '抚州市', '上饶市'
]
const cityBarOption = ref({
  dark: true,
  tooltip: { trigger: 'axis' },
  legend: { data: ['总量', '预警总量'], textStyle: { color: '#b0d8ff', fontSize: 13 }, top: 10 },
  grid: { left: '5%', right: '4%', bottom: '12%', top: '18%', containLabel: true },
  xAxis: { type: 'category', data: JIANGXI_CITIES.slice(), axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12, rotate: 0 } },
  yAxis: { type: 'value', axisLine: { lineStyle: { color: '#00b8ff33' } }, axisLabel: { color: '#b0d8ff', fontSize: 12 }, splitLine: { lineStyle: { color: '#00b8ff11' } } },
  series: [
    { name: '总量', type: 'bar', data: [], itemStyle: { color: '#00b8ff' }, barWidth: 22 },
    { name: '预警总量', type: 'bar', data: [], itemStyle: { color: '#ff6b35' }, barWidth: 22 }
  ]
})
watch(cityDistribution, val => {
  // 将后端返回的数据按 JIANGXI_CITIES 的固定顺序对齐；
  // 没有数据的城市显示为 0，避免某些地市因暂无工单而不出现在横坐标轴上
  const cityMap = new Map((val || []).map(i => [i.city, i]))
  cityBarOption.value.xAxis.data = JIANGXI_CITIES.slice()
  cityBarOption.value.series[0].data = JIANGXI_CITIES.map(city => {
    const item = cityMap.get(city)
    return (item && item.total) || 0
  })
  cityBarOption.value.series[1].data = JIANGXI_CITIES.map(city => {
    const item = cityMap.get(city)
    return ((item && item.yellow) || 0) + ((item && item.orange) || 0) + ((item && item.red) || 0)
  })
}, { deep: true })

// 拉取数据
const fetchData = async () => {
  try {
    const qs = authParam()
    const trendQs = (qs.length ? (qs + '&') : '?') + `date=${encodeURIComponent(trendDate.value)}`
    const [overviewRes, cityRes, typeRes, alertRes, lineRes, topRes, districtRes] = await Promise.all([
      fetch(`http://localhost:8080/api/workOrder/overview${qs}`),
      fetch(`http://localhost:8080/api/workOrder/cityDistribution${qs}`),
      fetch(`http://localhost:8080/api/workOrder/typeDistribution${qs}`),
      fetch(`http://localhost:8080/api/workOrder/alertDistribution${qs}`),
      fetch(`http://localhost:8080/api/workOrder/trend${trendQs}`),
      fetch(`http://localhost:8080/api/workOrder/topTimeout${qs}`),
      fetch(`http://localhost:8080/api/workOrder/districtDistribution${qs}`)
    ])
    const unwrap = async (r) => { try { const j = await r.json(); return (j && j.data != null) ? j.data : j } catch (e) { return r } }
    overview.value = await unwrap(overviewRes)
    cityDistribution.value = await unwrap(cityRes)
    typeDistribution.value = await unwrap(typeRes)
    alertDistribution.value = await unwrap(alertRes)
    lineData.value = await unwrap(lineRes)
    topTimeout.value = await unwrap(topRes)
    districtAlert.value = await unwrap(districtRes)

    const warn = []
    districtAlert.value.forEach(d => {
      const totalWarn = (d.yellow || 0) + (d.orange || 0) + (d.red || 0)
      if (totalWarn > 0) {
        warn.push({
          city: (d.city || '') + (d.district ? ' - ' + d.district : ''),
          workType: selectedType.value ? workTypes.find(t => t.value === selectedType.value)?.label || selectedType.value : '全类型',
          alertLevel: d.red > 0 ? 'RED' : (d.orange > 0 ? 'ORANGE' : 'YELLOW'),
          createTime: new Date().toLocaleString('zh-CN', { hour12: false }),
          count: totalWarn
        })
      }
    })
    warnList.value = []
    for (let i = 0; i < Math.min(3, warn.length); i++) {
      warnList.value.push(...warn)
    }
    if (warnList.value.length === 0) {
      warnList.value = [{
        city: '暂无',
        workType: '-',
        alertLevel: 'YELLOW',
        createTime: '-',
        count: 0
      }]
    }
  } catch (e) {
    console.error('大屏数据加载失败', e)
  }
}

const switchType = (val) => {
  selectedType.value = val
  fetchData()
}

const autoScroll = () => {
  const box = scrollRef.value
  if (!box) return
  if (box.scrollTop >= box.scrollHeight - box.clientHeight) box.scrollTop = 0
  else box.scrollTop += 1
}

// 手动 resize（已在上方定义，此处避免重复声明，仅保留 onMounted/onUnmounted）

onMounted(() => {
  updateTime()
  fetchData()
  fetchTimer = setInterval(fetchData, 60000)
  if (activeTab.value === 'map') {
    nextTick(() => {
      scrollTimer = setInterval(autoScroll, 30)
    })
  }
  // 趋势图的点击事件：v-chart 实例可能到 onMounted 后才就绪，这里兜底再绑定一次
  nextTick(() => { bindTrendClick() })
  // 首次挂载后触发一次 resize，确保地图图表拿到正确的容器尺寸
  nextTick(() => {
    manualResize()
  })
  // 监听 window resize（节流，避免频繁触发）
  window.addEventListener('resize', () => {
    if (windowResizeTimer) clearTimeout(windowResizeTimer)
    windowResizeTimer = setTimeout(() => {}, 150)
  })
})

onUnmounted(() => {
  clearInterval(timeTimer)
  clearInterval(fetchTimer)
  clearInterval(scrollTimer)
  if (windowResizeTimer) clearTimeout(windowResizeTimer)
})
</script>

<style scoped>
.screen-wrap {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  max-height: 100vh;
  overflow: hidden;
  background: #070c1b;
  background-image: radial-gradient(#0f2040 1px, transparent 1px);
  background-size: 30px 30px;
  color: #fff;
  padding: 10px;
  box-sizing: border-box;
  font-size: 14px;
  gap: 10px;
}

/* ===== 顶部：标题 + 时间 + 统计卡 ===== */
.screen-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 90px;
  min-height: 90px;
  padding: 10px 20px;
  border: 1px solid #00b8ff33;
  border-radius: 8px;
  background: #0b132999;
  box-shadow: 0 0 12px #00b8ff22;
  box-sizing: border-box;
  flex-shrink: 0;
}
.top-left { min-width: 240px; flex-shrink: 0; }
.top-center {
  flex: 1;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}
.top-right { display: flex; gap: 10px; justify-content: flex-end; flex-shrink: 0; }

.system-title {
  font-size: 22px;
  color: #00b8ff;
  letter-spacing: 2px;
  margin: 0;
  text-shadow: 0 0 8px #00b8ff;
  white-space: nowrap;
}
.real-time {
  font-size: 16px;
  color: #39ff14;
  letter-spacing: 1px;
}

.stat-card {
  padding: 6px 14px;
  border: 1px solid #00b8ff44;
  border-radius: 6px;
  text-align: center;
  min-width: 72px;
  background: #00b8ff0a;
}
.stat-card.warn { border-color: #f7d03888; background: #f7d0380f; }
.stat-card.danger { border-color: #ff6b3588; background: #ff6b350f; }
.stat-card.severe { border-color: #ff303088; background: #ff30300f; }
.card-label { font-size: 12px; color: #b0d8ff; }
.card-num { font-size: 20px; font-weight: bold; margin-top: 2px; color: #00b8ff; line-height: 1.2; }
.stat-card.warn .card-num { color: #f7d038; }
.stat-card.danger .card-num { color: #ff6b35; }
.stat-card.severe .card-num { color: #ff3030; }

/* ===== Tab 切换 + 工单类型 ===== */
.screen-tabs {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 8px 16px;
  border: 1px solid #00b8ff33;
  border-radius: 8px;
  background: #0b132999;
  box-sizing: border-box;
  flex-shrink: 0;
}
.tab-nav {
  display: flex;
  gap: 10px;
}
.tab-nav span {
  padding: 8px 20px;
  border: 1px solid #00b8ff55;
  border-radius: 20px;
  color: #b0d8ff;
  font-size: 14px;
  cursor: pointer;
  background: #00b8ff11;
  transition: all 0.25s ease;
  user-select: none;
}
.tab-nav span:hover { background: #00b8ff33; color: #fff; }
.tab-nav span.active {
  background: linear-gradient(90deg, #00b8ff, #39ff14);
  color: #070c1b;
  border-color: transparent;
  font-weight: bold;
  box-shadow: 0 0 12px #00b8ff88;
}

.type-switch {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}
.type-switch span {
  padding: 6px 14px;
  border: 1px solid #00b8ff55;
  border-radius: 16px;
  color: #b0d8ff;
  font-size: 12px;
  cursor: pointer;
  background: #00b8ff11;
  transition: all 0.25s ease;
  user-select: none;
}
.type-switch span:hover { background: #00b8ff33; color: #fff; }
.type-switch span.active {
  background: linear-gradient(90deg, #00b8ff, #39ff14);
  color: #070c1b;
  border-color: transparent;
  font-weight: bold;
}

/* ===== 主体内容区 ===== */
.screen-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
}

/* 双列布局：地图 + 滚动列表，或两个图表 */
.content-grid.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  flex: 1;
  min-height: 0;
}

/* 区域排行（两条横柱图）：需要更大的纵向空间，给它 1.8 倍 flex，让它能展示 10 条 */
.content-grid.two-col.rank-row {
  flex: 1.8;
  min-height: 0;
}
.content-grid.two-col.rank-row .ec-box {
  min-height: 260px;
}

/* 单排行布局：用于趋势图、总量柱状图等 —— 缩小固定高度，腾出更多空间给其他 two-col */
.content-grid.one-row {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  height: 220px;
  min-height: 220px;
  flex-shrink: 0;
}

/* 特殊面板：地图区域占 65% 宽，滚动列表占 35% 宽 */
.content-grid.two-col:has(.panel-map) {
  grid-template-columns: 1.6fr 1fr;
}

.chart-panel {
  display: flex;
  flex-direction: column;
  border: 1px solid #00b8ff33;
  border-radius: 8px;
  background: #0b132999;
  padding: 10px 14px;
  box-shadow: 0 0 8px #00b8ff15;
  box-sizing: border-box;
  overflow: hidden;
  min-height: 0;
}
.panel-title {
  font-size: 15px;
  color: #00b8ff;
  padding-bottom: 8px;
  border-bottom: 1px solid #00b8ff22;
  margin-bottom: 8px;
  letter-spacing: 1px;
  flex-shrink: 0;
}

/* 核心：ECharts 容器 —— flex:1 占据剩余空间，同时给硬的 min-height 避免读取到 0 */
.ec-box {
  flex: 1;
  width: 100%;
  min-height: 200px;
  /* 不使用 height:100%，避免被父容器压缩时与 min-height 冲突导致横向溢出 */
}

.ec-box-empty {
  flex: 1;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #b0d8ff;
  font-size: 14px;
  min-height: 200px;
}

/* 预警滚动列表 */
.panel-scroll .scroll-list {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.list-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 6px;
  border-bottom: 1px solid #00b8ff15;
  font-size: 13px;
}
.row-city { flex: 1.4; color: #b0d8ff; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-type { flex: 1; color: #d0e8ff; text-align: center; }
.row-level { flex: 0.8; text-align: center; font-weight: bold; }
.row-level.warn { color: #f7d038; }
.row-level.orange { color: #ff6b35; }
.row-level.danger { color: #ff3030; }
.row-time { flex: 1.4; text-align: right; color: #88aacc; font-size: 12px; }

/* 小屏响应式：小于 1360px 时主体双列变单列堆叠 */
@media (max-width: 1360px) {
  .content-grid.two-col { grid-template-columns: 1fr; }
  .content-grid.two-col:has(.panel-map) { grid-template-columns: 1fr; }
  .content-grid.one-row { height: 260px; min-height: 260px; }
  .system-title { font-size: 20px; }
  .stat-card { min-width: 64px; padding: 6px 10px; }
  .card-num { font-size: 18px; }
}
@media (max-width: 900px) {
  .screen-top { flex-direction: column; align-items: stretch; height: auto; min-height: 0; }
  .top-right { justify-content: center; flex-wrap: wrap; }
  .screen-tabs { flex-direction: column; align-items: stretch; }
  .tab-nav, .type-switch { justify-content: center; }
}

/* ===== 趋势图标题区：日期选择 + 弹窗 ===== */
.mini-btn {
  background: transparent;
  color: #b0d8ff;
  border: 1px solid #00b8ff55;
  padding: 2px 10px;
  margin-right: 6px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
}
.mini-btn:hover { background: #00b8ff22; }
.mini-btn.active { background: #00b8ff; color: #070c1b; font-weight: bold; }

/* 趋势图曲线"点"样式已经由 echarts 渲染；下面是弹窗样式 */
.modal-mask {
  position: fixed; inset: 0;
  background: rgba(0, 0, 0, 0.75);
  z-index: 9999;
  display: flex; align-items: center; justify-content: center;
}
.modal-panel {
  width: min(900px, 90vw);
  max-height: 80vh;
  background: #071225;
  border: 1px solid #00b8ff55;
  color: #fff;
  display: flex; flex-direction: column;
  border-radius: 6px;
  overflow: hidden;
}
.modal-header {
  padding: 12px 16px;
  font-size: 15px;
  color: #00b8ff;
  border-bottom: 1px solid #00b8ff33;
  display: flex; justify-content: space-between; align-items: center;
  background: linear-gradient(90deg, #001a33, #071225);
}
.close-btn { cursor: pointer; font-size: 22px; line-height: 1; color: #fff; }
.modal-body { padding: 16px; overflow-y: auto; }
.modal-footer {
  padding: 10px 16px;
  border-top: 1px solid #00b8ff33;
  text-align: right;
}
.detail-table {
  width: 100%; border-collapse: collapse; font-size: 13px;
}
.detail-table th, .detail-table td {
  padding: 8px 10px; border-bottom: 1px dashed #00b8ff22; text-align: left;
}
.detail-table th {
  background: #001a33; color: #00b8ff; font-weight: normal;
}
.detail-table tbody tr:hover { background: #002140; }
.empty-hint { color: #b0d8ff; text-align: center; padding: 40px 0; }
.btn {
  background: #00b8ff; color: #070c1b; border: none; padding: 6px 16px;
  border-radius: 4px; cursor: pointer; font-size: 13px;
}
.btn:hover { background: #00d4ff; }
</style>
