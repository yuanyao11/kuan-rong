<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h3>{{ isMember ? '我的工单' : '工单列表' }}</h3>
        <div class="header-actions">
          <button v-if="isAdmin" class="btn btn-primary" @click="goCreate">新建工单</button>
          <button class="btn" @click="exportData">导出数据</button>
        </div>
      </div>

      <div class="search-bar">
        <input v-model="searchForm.orderNo" placeholder="工单编号" />
        <select v-model="searchForm.workType">
          <option value="">全部类型</option>
          <option value="NEW_INSTALL">新装</option>
          <option value="FTTR">FTTR</option>
          <option value="REPAIR">修障</option>
          <option value="RELOCATE">移机</option>
        </select>
        <select v-model="searchForm.city">
          <option value="">全部城市</option>
          <option value="南昌市">南昌市</option>
          <option value="景德镇市">景德镇市</option>
          <option value="萍乡市">萍乡市</option>
          <option value="九江市">九江市</option>
          <option value="新余市">新余市</option>
          <option value="鹰潭市">鹰潭市</option>
          <option value="赣州市">赣州市</option>
          <option value="吉安市">吉安市</option>
          <option value="宜春市">宜春市</option>
          <option value="抚州市">抚州市</option>
          <option value="上饶市">上饶市</option>
        </select>
        <select v-model="searchForm.alertLevel">
          <option value="">全部预警</option>
          <option value="NORMAL">正常</option>
          <option value="YELLOW">黄色预警</option>
          <option value="ORANGE">橙色预警</option>
          <option value="RED">红色预警</option>
        </select>
        <button class="btn btn-primary" @click="search">查询</button>
        <button class="btn" @click="reset">重置</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>工单编号</th>
            <th>类型</th>
            <th>城市</th>
            <th>区域</th>
            <th>当前环节</th>
            <th>SLA 截止时间</th>
            <th>预警状态</th>
            <th>处理人</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id">
            <td>{{ order.orderNo }}</td>
            <td>{{ workTypeLabel(order.workType) }}</td>
            <td>{{ order.city }}</td>
            <td>{{ order.district }}</td>
            <td>{{ nodeLabel(order.currentNode) }}</td>
            <td>{{ formatDateTime(order.slaDeadline) }}</td>
            <td><span class="alert-badge" :class="getAlertClass(order.alertLevel)">{{ alertLabel(order.alertLevel) }}</span></td>
            <td>{{ order.currentHandler || '-' }}</td>
            <td>{{ statusLabel(order.workStatus) }}</td>
            <td>
              <button class="btn btn-primary" @click="viewDetail(order.id)">详情</button>
              <button v-if="canAccept(order)" class="btn btn-info" @click="acceptOrder(order)">接单</button>
              <button v-if="canFeedback(order)" class="btn btn-success" @click="openFeedback(order)">反馈</button>
              <button v-if="isAdmin && !isCompleted(order)" class="btn btn-warning" @click="openUrge(order)">催办</button>
              <button v-if="isAdmin" class="btn btn-danger" @click="deleteOrder(order)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
        <button v-for="page in pages" :key="page" @click="goToPage(page)" :class="{ active: currentPage === page }">{{ page }}</button>
        <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
      </div>
    </div>

    <!-- 反馈弹窗 -->
    <div v-if="showFeedbackModal" class="modal-overlay" @click.self="showFeedbackModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>反馈处理情况</h3>
          <button @click="showFeedbackModal = false">×</button>
        </div>
        <div class="form-group">
          <label>工单编号</label>
          <input :value="feedbackOrder?.orderNo" disabled />
        </div>
        <div class="form-group">
          <label>处理结果</label>
          <select v-model="feedbackForm.result">
            <option value="已完成">已完成</option>
            <option value="客户取消">客户取消</option>
            <option value="待复勘">待复勘</option>
          </select>
        </div>
        <div class="form-group">
          <label>处理说明</label>
          <textarea v-model="feedbackForm.feedback" rows="4" placeholder="请输入处理情况"></textarea>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showFeedbackModal = false">取消</button>
          <button class="btn btn-primary" @click="submitFeedback">提交</button>
        </div>
      </div>
    </div>

    <!-- 催办弹窗（管理员）—— 和 OrderDetail.vue 保持一致 -->
    <div v-if="showUrgeModal" class="modal-overlay" @click.self="showUrgeModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>催办工单</h3>
          <button @click="showUrgeModal = false">×</button>
        </div>
        <div class="form-group">
          <label>工单编号</label>
          <input :value="urgeOrder?.orderNo" disabled />
        </div>
        <div class="form-group">
          <label>处理人</label>
          <input :value="urgeOrder?.currentHandler || '-'" disabled />
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input :value="urgeOrder?.handlerPhone || '-'" disabled />
        </div>
        <div class="form-group">
          <label>催办方式</label>
          <select v-model="urgeForm.type">
            <option value="SMS">钉钉私聊（机器人自动发文字提醒）</option>
            <option value="PHONE">电话催办（点击确认后拨打处理人手机）</option>
          </select>
        </div>
        <div class="form-group">
          <label>催办内容（可选）</label>
          <textarea v-model="urgeForm.content" rows="4"
                    :placeholder="urgeForm.type === 'PHONE'
                      ? '选填：自定义催办内容，不填则使用后台模板自动生成提醒'
                      : '选填：自定义催办内容；不填时将使用 remind_template 表中的模板自动生成'"></textarea>
        </div>
        <div class="form-group">
          <label>管理员备注（可选）</label>
          <textarea v-model="urgeForm.remark" rows="2"
                    placeholder="选填：额外想强调的内容，例如'请优先处理此单'，会拼在催办消息末尾"></textarea>
        </div>
        <div v-if="urgeForm.type === 'PHONE'" class="form-group" style="color:#a0c8e0;font-size:13px;background:#0f2040;padding:10px;border-radius:6px;">
          💡 提示：点击"确认催办"后，系统会先记录日志并给处理人发钉钉消息，<br/>
          然后自动尝试调起手机拨号。<br/>
          👉 如浏览器未自动拨号，可点下方按钮：<br/>
          &nbsp;&nbsp;&nbsp;<a v-if="urgeOrder?.handlerPhone"
             :href="'tel:' + urgeOrder.handlerPhone"
             class="call-btn"
             @click="dialPhone">📞 点击此链接立即拨打 {{ urgeOrder.handlerPhone }}</a>
          &nbsp;&nbsp;&nbsp;<button class="btn copy-btn" @click="copyPhone">📋 复制号码</button>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="showUrgeModal = false">取消</button>
          <button class="btn btn-primary" @click="submitUrge">确认催办</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import router from "@/router/index.js"
import { getUser } from '../utils/auth.js'
import http from '../utils/http.js'

const userInfo = ref(getUser() || {})

const isAdmin = computed(() => ['SUPER_ADMIN', 'ADMIN'].includes(userInfo.value.role))
const isMember = computed(() => userInfo.value.role === 'MEMBER')

const searchForm = ref({
  orderNo: '',
  workType: '',
  city: '',
  alertLevel: ''
})

const orders = ref([])
const currentPage = ref(1)
const totalPages = ref(1)
const pages = ref([])

const showFeedbackModal = ref(false)
const feedbackOrder = ref(null)
const feedbackForm = ref({ result: '已完成', feedback: '' })

const showUrgeModal = ref(false)
const urgeOrder = ref(null)
const urgeForm = ref({ type: 'SMS', content: '', remark: '' })

const workTypeLabel = (t) => ({ NEW_INSTALL: '新装', FTTR: 'FTTR', REPAIR: '修障', RELOCATE: '移机' }[t] || t || '-')
const alertLabel = (t) => ({ NORMAL: '正常', YELLOW: '黄色预警', ORANGE: '橙色预警', RED: '红色预警' }[t] || t || '-')
const statusLabel = (t) => ({ IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }[t] || t || '-')
const nodeLabel = (t) => ({ ACCEPTANCE: '受理', DISPATCH: '派单', CONSTRUCTION: '施工', CHECK: '验收', ARCHIVE: '归档' }[t] || t || '-')

const formatDateTime = (v) => {
  if (!v) return '-'
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return v
    return d.toLocaleString('zh-CN', { hour12: false })
  } catch { return v }
}

const fetchOrders = async () => {
  try {
    const params = new URLSearchParams({
      page: currentPage.value,
      size: 10,
      orderNo: searchForm.value.orderNo,
      workType: searchForm.value.workType,
      city: searchForm.value.city,
      alertLevel: searchForm.value.alertLevel,
      role: userInfo.value.role || '',
      handlerName: isMember.value ? (userInfo.value.username || '') : ''
    })
    const result = await http.get(`/api/workOrder/list?${params}`)
    orders.value = (result.data && result.data.records) ? result.data.records : []
    totalPages.value = (result.data && result.data.pages) ? result.data.pages : 1
    generatePages()
  } catch (e) {
    console.error('获取工单列表失败', e)
  }
}

const generatePages = () => {
  pages.value = []
  for (let i = 1; i <= totalPages.value; i++) pages.value.push(i)
}

const search = () => { currentPage.value = 1; fetchOrders() }
const reset = () => { searchForm.value = { orderNo: '', workType: '', city: '', alertLevel: '' }; search() }
const prevPage = () => { if (currentPage.value > 1) { currentPage.value--; fetchOrders() } }
const nextPage = () => { if (currentPage.value < totalPages.value) { currentPage.value++; fetchOrders() } }
const goToPage = (page) => { currentPage.value = page; fetchOrders() }
const viewDetail = (id) => { router.push(`/order/${id}`) }
const goCreate = () => { router.push('/order/create') }

const canAccept = (order) => {
  if (!isMember.value) return false
  if (order.workStatus === 'COMPLETED' || order.workStatus === 'CANCELLED') return false
  return !order.currentHandler || order.currentHandler.trim() === ''
}
const canFeedback = (order) => {
  if (!isMember.value) return false
  if (order.workStatus === 'COMPLETED' || order.workStatus === 'CANCELLED') return false
  return order.currentHandler && order.currentHandler === userInfo.value.username
}
const isCompleted = (order) =>
  order.workStatus === 'COMPLETED' || order.workStatus === 'CANCELLED'

const acceptOrder = async (order) => {
  if (!confirm(`确认接单：${order.orderNo}？`)) return
  try {
    const data = await http.put(`/api/workOrder/${order.id}/status`, {
      role: userInfo.value.role,
      operator: userInfo.value.username,
      status: 'IN_PROGRESS',
      node: 'CONSTRUCTION',
      handler: userInfo.value.username
    })
    if (data.success) { alert('接单成功'); fetchOrders() }
    else alert(data.errorMsg || data.message || '操作失败')
  } catch (e) { console.error(e); alert('操作失败') }
}

const openFeedback = (order) => {
  feedbackOrder.value = order
  feedbackForm.value = { result: '已完成', feedback: '' }
  showFeedbackModal.value = true
}

const submitFeedback = async () => {
  if (!feedbackForm.value.feedback.trim()) { alert('请输入处理说明'); return }
  try {
    const data = await http.put(`/api/workOrder/${feedbackOrder.value.id}/status`, {
      role: userInfo.value.role,
      operator: userInfo.value.username,
      status: 'COMPLETED',
      node: 'ARCHIVE',
      result: feedbackForm.value.result,
      feedback: feedbackForm.value.feedback
    })
    if (data.success) { alert('反馈成功'); showFeedbackModal.value = false; fetchOrders() }
    else alert(data.errorMsg || data.message || '操作失败')
  } catch (e) { console.error(e); alert('操作失败') }
}

// ==================== 催办（管理员）—— 和 OrderDetail.vue 保持一致 ====================
const openUrge = (order) => {
  urgeOrder.value = order
  urgeForm.value = { type: 'SMS', content: '', remark: '' }
  showUrgeModal.value = true
}

const submitUrge = async () => {
  if (!urgeOrder.value) return
  console.log('[催办][列表] 开始提交，类型:', urgeForm.value.type, '工单:', urgeOrder.value.orderNo)
  try {
    const isPhone = urgeForm.value.type === 'PHONE'
    const path = isPhone ? '/api/urge/phone' : '/api/urge/sms'
    const body = isPhone
      ? {
          orderNo: urgeOrder.value.orderNo,
          operator: userInfo.value.username,
          role: userInfo.value.role,
          // content：自定义催办内容（不填则走模板）
          content: urgeForm.value.content || '',
          // remark：管理员补充备注（会拼到钉钉消息末尾，不会影响模板匹配）
          remark: urgeForm.value.remark || ''
        }
      : {
          orderNo: urgeOrder.value.orderNo,
          operator: userInfo.value.username,
          role: userInfo.value.role,
          content: urgeForm.value.content
        }
    console.log('[催办][列表] 请求体:', JSON.stringify(body))
    const data = await http.post(path, body)
    console.log('[催办][列表] 后端返回:', data)
    if (data.success) {
      if (isPhone && urgeOrder.value.handlerPhone) {
        // 电话催办：成功后弹确认框 → 调起 tel: 拨号
        showUrgeModal.value = false
        const phone = urgeOrder.value.handlerPhone
        const dialResult = window.confirm(
          `✅ 催办已提交！现在将拨打处理人电话：\n\n${urgeOrder.value.currentHandler || '处理人'} - ${phone}\n\n点击"确定"立即拨号；点击"取消"则返回页面。`
        )
        if (dialResult) window.location.href = 'tel:' + phone
      } else {
        alert('✅ 催办成功，已记录并发送钉钉私聊')
        showUrgeModal.value = false
      }
      fetchOrders()
    } else {
      alert('❌ 操作失败：' + (data.errorMsg || data.message || '未知错误'))
    }
  } catch (e) { console.error('[催办][列表] 请求异常:', e); alert('❌ 请求异常，请检查后端服务是否启动：' + e.message) }
}

// 手动拨号（tel 链接可能在某些浏览器被拦截，这里加一个兜底）
const dialPhone = () => {
  if (!urgeOrder.value?.handlerPhone) {
    alert('该工单没有处理人联系电话')
    return
  }
  try { window.location.href = 'tel:' + urgeOrder.value.handlerPhone }
  catch (e) { alert('浏览器不支持自动拨号，请手动拨打：' + urgeOrder.value.handlerPhone) }
}

// 复制手机号（PC端最实用的方式）
const copyPhone = async () => {
  if (!urgeOrder.value?.handlerPhone) return
  try {
    await navigator.clipboard.writeText(urgeOrder.value.handlerPhone)
    alert('✅ 号码已复制：' + urgeOrder.value.handlerPhone + '\n请粘贴到手机拨打')
  } catch (e) {
    const input = document.createElement('input')
    input.value = urgeOrder.value.handlerPhone
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('✅ 号码已复制：' + urgeOrder.value.handlerPhone + '\n请粘贴到手机拨打')
  }
}

const exportData = async () => {
  try {
    const params = new URLSearchParams({
      orderNo: searchForm.value.orderNo,
      workType: searchForm.value.workType,
      city: searchForm.value.city,
      alertLevel: searchForm.value.alertLevel,
      role: userInfo.value.role || '',
      handlerName: isMember.value ? (userInfo.value.username || '') : ''
    })
    const result = await http.get(`/api/workOrder/export?${params}`)
    const payload = (result.data && result.data.records) ? result.data.records : (Array.isArray(result.data) ? result.data : [])
    const list = payload
    const header = '工单编号,类型,城市,区域,安装地址,当前环节,SLA截止时间,处理人,预警状态,状态'
    const rows = list.map(o => `${o.orderNo},${workTypeLabel(o.workType)},${o.city},${o.district},${o.installAddress || ''},${o.currentNode},${o.slaDeadline || ''},${o.currentHandler || ''},${alertLabel(o.alertLevel)},${statusLabel(o.workStatus)}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `工单数据_${new Date().toLocaleDateString()}.csv`
    link.click()
  } catch (e) {
    console.error('导出失败', e)
  }
}

// ==================== 删除工单（仅 ADMIN / SUPER_ADMIN）====================
const deleteOrder = async (order) => {
  if (!order) return
  if (!isAdmin.value) {
    alert('权限不足，只有管理员可以删除工单')
    return
  }
  const label = `${order.orderNo || '该工单'}（${order.workType || '类型未知'} · ${order.city || ''}${order.district ? '-' + order.district : ''}）`
  const ok = confirm(`⚠️ 确认删除【${label}】？删除后不可恢复！`)
  if (!ok) return

  try {
    const params = new URLSearchParams()
    params.append('role', userInfo.value.role || '')
    const data = await http.delete(`/api/workOrder/${order.id}?${params.toString()}`)
    if (data && data.success) {
      alert('✅ ' + (data.message || '删除成功'))
      fetchOrders()
    } else {
      alert('❌ 删除失败：' + (data ? (data.errorMsg || data.message) : '未知错误'))
    }
  } catch (e) {
    console.error('[删除] 失败:', e)
    alert('❌ 请求异常，请检查后端服务：' + (e.message || e))
  }
}

const getAlertClass = (level) => {
  const map = { NORMAL: 'processing', YELLOW: 'warning', ORANGE: 'timeout', RED: 'severe' }
  return map[level] || ''
}

onMounted(() => fetchOrders())
</script>

<style scoped>
/* 沿用 Dashboard 风格，深色科技风 */
.card {
  background: #0b1329;
  border: 1px solid #00b8ff33;
  border-radius: 8px;
  padding: 16px;
  color: #d0e8ff;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-header h3 { margin: 0; color: #00b8ff; letter-spacing: 2px; }
.header-actions { display: flex; gap: 10px; }
.search-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.search-bar input, .search-bar select {
  padding: 8px 12px;
  background: #070c1b;
  color: #d0e8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  outline: none;
  min-width: 120px;
}
.btn {
  padding: 8px 16px;
  background: #00b8ff22;
  color: #00b8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}
.btn:hover { background: #00b8ff44; }
.btn-primary { background: #00b8ff; color: #070c1b; border-color: #00b8ff; }
.btn-primary:hover { background: #39ff14; border-color: #39ff14; color: #070c1b; }
.btn-warning { background: #f7d038; color: #070c1b; border-color: #f7d038; }
.btn-info { background: #9d4edd; color: #fff; border-color: #9d4edd; }
.btn-success { background: #39ff14; color: #070c1b; border-color: #39ff14; }

.table {
  width: 100%;
  border-collapse: collapse;
  background: #070c1b;
  border: 1px solid #00b8ff22;
}
.table th {
  padding: 12px;
  background: #0f2040;
  color: #00b8ff;
  text-align: left;
  font-size: 13px;
  letter-spacing: 1px;
  border-bottom: 1px solid #00b8ff33;
}
.table td {
  padding: 10px 12px;
  border-bottom: 1px solid #00b8ff11;
  color: #d0e8ff;
  font-size: 13px;
}
.table tr:hover { background: #00b8ff11; }

.alert-badge {
  padding: 3px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: bold;
}
.alert-badge.processing { background: #00b8ff22; color: #00b8ff; }
.alert-badge.warning { background: #f7d03822; color: #f7d038; border: 1px solid #f7d03855; }
.alert-badge.timeout { background: #ff6b3522; color: #ff6b35; border: 1px solid #ff6b3555; }
.alert-badge.severe { background: #ff303022; color: #ff3030; border: 1px solid #ff303055; animation: pulse 1.5s infinite; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.pagination {
  display: flex;
  gap: 6px;
  justify-content: center;
  margin-top: 16px;
}
.pagination button {
  padding: 6px 12px;
  background: #070c1b;
  color: #d0e8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  cursor: pointer;
}
.pagination button.active { background: #00b8ff; color: #070c1b; }
.pagination button:disabled { opacity: 0.5; cursor: not-allowed; }

.modal-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.modal-content {
  background: #0b1329;
  border: 1px solid #00b8ff;
  border-radius: 8px;
  padding: 20px;
  min-width: 420px;
  color: #d0e8ff;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.modal-header h3 { margin: 0; color: #00b8ff; }
.modal-header button {
  background: none;
  border: none;
  color: #d0e8ff;
  font-size: 24px;
  cursor: pointer;
}
.form-group { margin-bottom: 14px; }
.form-group label { display: block; margin-bottom: 6px; font-size: 13px; color: #a0c8e0; }
.form-group input, .form-group select, .form-group textarea {
  width: 100%;
  padding: 8px 12px;
  background: #070c1b;
  color: #d0e8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 16px;
}
.btn-warning {
  padding: 8px 16px;
  background: #f7d038;
  color: #070c1b;
  border: 1px solid #f7d038;
  border-radius: 4px;
  cursor: pointer;
}
</style>
