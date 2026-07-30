<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h3>工单详情</h3>
        <div style="display:flex; gap:8px; align-items:center;">
          <span style="font-size:12px;color:#888;">
            当前用户: {{ userInfo.username || '(未登录)' }} | 角色: {{ userInfo.role || '未知' }} | 权限: {{ isAdmin ? '✅ 管理员' : '❌ 成员/未知' }}
          </span>
          <button v-if="isAdmin && order && !isCompleted" class="btn btn-warning" @click="openUrge">催办</button>
          <button v-if="isAdmin && order" class="btn btn-danger" @click="deleteOrder">删除</button>
          <button class="btn" @click="goBack">返回列表</button>
        </div>
      </div>

      <div v-if="order" class="order-detail">
        <div class="detail-row">
          <div class="detail-item"><label>工单编号</label><span>{{ order.orderNo }}</span></div>
          <div class="detail-item"><label>工单类型</label><span>{{ workTypeLabel(order.workType) }}</span></div>
          <div class="detail-item"><label>预警状态</label><span class="alert-badge" :class="getAlertClass(order.alertLevel)">{{ alertLabel(order.alertLevel) }}</span></div>
          <div class="detail-item"><label>工单状态</label><span>{{ statusLabel(order.workStatus) }}</span></div>
        </div>

        <div class="detail-row">
          <div class="detail-item"><label>宽带账号</label><span>{{ order.broadbandNo || '-' }}</span></div>
          <div class="detail-item"><label>城市</label><span>{{ order.city }}</span></div>
          <div class="detail-item"><label>区域</label><span>{{ order.district }}</span></div>
          <div class="detail-item"><label>服务中心</label><span>{{ order.serviceCenter || '-' }}</span></div>
        </div>

        <div class="detail-row">
          <div class="detail-item full"><label>安装地址</label><span>{{ order.installAddress }}</span></div>
        </div>

        <div class="detail-row">
          <div class="detail-item"><label>当前环节</label><span>{{ nodeLabel(order.currentNode) }}</span></div>
          <div class="detail-item"><label>SLA 截止时间</label><span>{{ formatDateTime(order.slaDeadline) }}</span></div>
          <div class="detail-item"><label>剩余时间</label><span>{{ remainText }}</span></div>
        </div>

        <div class="detail-row">
          <div class="detail-item"><label>处理人</label><span>{{ order.currentHandler || '-' }}</span></div>
          <div class="detail-item"><label>联系电话</label>
            <span>
              {{ order.handlerPhone || '-' }}
              <a v-if="order.handlerPhone" :href="'tel:' + order.handlerPhone"
                 style="margin-left:8px;display:inline-block;padding:2px 8px;background:#00b8ff;color:#fff;border-radius:10px;font-size:12px;text-decoration:none;cursor:pointer;">📞 拨打</a>
            </span>
          </div>
        </div>

        <div class="detail-row">
          <div class="detail-item"><label>创建时间</label><span>{{ formatDateTime(order.createTime) }}</span></div>
          <div class="detail-item"><label>更新时间</label><span>{{ formatDateTime(order.updateTime) }}</span></div>
        </div>

        <div v-if="order.processFeedback" class="detail-row">
          <div class="detail-item full"><label>处理反馈</label><span>{{ order.processFeedback }}</span></div>
        </div>
      </div>

      <div class="card" style="margin-top: 20px;">
        <h3>操作日志</h3>
        <table class="table">
          <thead>
            <tr><th>动作类型</th><th>内容</th><th>处理结果</th><th>操作人</th><th>时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="log in remindLogs" :key="log.id">
              <td>{{ log.urgeType || '-' }}</td>
              <td>{{ log.urgeContent || '-' }}</td>
              <td>{{ urgeResultText(log.urgeResult) }}</td>
              <td>{{ log.urgeUser || '-' }}</td>
              <td>{{ formatDateTime(log.urgeTime) || '-' }}</td>
            </tr>
            <tr v-if="remindLogs.length === 0"><td colspan="5" class="no-data">暂无记录</td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- 催办弹窗（管理员） -->
    <div v-if="showUrgeModal" class="modal-overlay" @click.self="showUrgeModal = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>催办工单</h3>
          <button @click="showUrgeModal = false">×</button>
        </div>
        <div class="form-group">
          <label>工单编号</label>
          <input :value="order?.orderNo" disabled />
        </div>
        <div class="form-group">
          <label>处理人</label>
          <input :value="order?.currentHandler || '-'" disabled />
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input :value="order?.handlerPhone || '-'" disabled />
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
          &nbsp;&nbsp;&nbsp;<a v-if="order?.handlerPhone"
             :href="'tel:' + order.handlerPhone"
             class="call-btn"
             @click="dialPhone">📞 点击此链接立即拨打 {{ order.handlerPhone }}</a>
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
import { useRoute } from 'vue-router'
import router from "@/router/index.js"
import { getUser } from '../utils/auth.js'
import http from '../utils/http.js'

const route = useRoute()

const userInfo = ref(getUser() || {})

const order = ref(null)
const remindLogs = ref([])
const isAdmin = computed(() => ['SUPER_ADMIN', 'ADMIN'].includes(userInfo.value.role))
const isCompleted = computed(() =>
  order.value && (order.value.workStatus === 'COMPLETED' || order.value.workStatus === 'CANCELLED')
)

const showUrgeModal = ref(false)
const urgeForm = ref({ type: 'SMS', content: '', remark: '' })

const workTypeLabel = (t) => ({ NEW_INSTALL: '新装', FTTR: 'FTTR', REPAIR: '修障', RELOCATE: '移机' }[t] || t || '-')
const alertLabel = (t) => ({ NORMAL: '正常', YELLOW: '黄色预警', ORANGE: '橙色预警', RED: '红色预警' }[t] || t || '-')
const statusLabel = (t) => ({ IN_PROGRESS: '进行中', COMPLETED: '已完成', CANCELLED: '已取消' }[t] || t || '-')
const nodeLabel = (t) => ({ ACCEPTANCE: '受理', DISPATCH: '派单', CONSTRUCTION: '施工', CHECK: '验收', ARCHIVE: '归档' }[t] || t || '-')
const urgeResultText = (v) => {
  if (v == null || v === '') return '-'
  if (v === 1 || v === '1') return '成功'
  if (v === 0 || v === '0') return '失败'
  return v
}

const formatDateTime = (v) => {
  if (!v) return ''
  try {
    const d = new Date(v)
    if (isNaN(d.getTime())) return v
    return d.toLocaleString('zh-CN', { hour12: false })
  } catch { return v }
}

const remainText = computed(() => {
  if (!order.value || !order.value.slaDeadline) return '-'
  const remain = order.value.remainingMinutes
  if (remain != null && typeof remain === 'number') {
    const h = Math.floor(Math.abs(remain) / 60)
    const m = Math.abs(remain) % 60
    return remain >= 0 ? `${h}小时${m}分钟` : `超时 ${h}小时${m}分钟`
  }
  return '-'
})

const fetchOrderDetail = async () => {
  const id = route.params.id
  try {
    const result = await http.get(`/api/workOrder/${id}`)
    const payload = result.data || result
    order.value = payload
    remindLogs.value = (payload && payload.remindLogs) || []
  } catch (e) {
    console.error('获取工单详情失败', e)
  }
}

const goBack = () => { router.push('/orders') }

// ==================== 删除工单（仅 ADMIN / SUPER_ADMIN）====================
const deleteOrder = async () => {
  if (!order.value) return
  if (!isAdmin.value) {
    alert('权限不足，只有管理员可以删除工单')
    return
  }
  const o = order.value
  const label = `${o.orderNo || '该工单'}（${o.workType || '类型未知'} · ${o.city || ''}${o.district ? '-' + o.district : ''}）`
  const ok = confirm(`⚠️ 确认删除【${label}】？删除后不可恢复！`)
  if (!ok) return

  try {
    const params = new URLSearchParams()
    params.append('role', userInfo.value.role || '')
    const data = await http.delete(`/api/workOrder/${o.id}?${params.toString()}`)
    if (data && data.success) {
      alert('✅ ' + (data.message || '删除成功'))
      router.push('/orders')
    } else {
      alert('❌ 删除失败：' + (data ? (data.errorMsg || data.message) : '未知错误'))
    }
  } catch (e) {
    console.error('[删除][详情] 失败:', e)
    alert('❌ 请求异常，请检查后端服务：' + (e.message || e))
  }
}

const openUrge = () => {
  urgeForm.value = { type: 'SMS', content: '', remark: '' }
  showUrgeModal.value = true
}

const submitUrge = async () => {
  if (!order.value) return
  console.log('[催办] 开始提交，类型:', urgeForm.value.type, '工单:', order.value.orderNo)
  try {
    const isPhone = urgeForm.value.type === 'PHONE'
    const path = isPhone ? '/api/urge/phone' : '/api/urge/sms'
    // 电话催办：remark 里放"要强调的内容"
    // 钉钉私聊：content 里放自定义催办文字
    const body = isPhone
      ? {
          orderNo: order.value.orderNo,
          operator: userInfo.value.username,
          role: userInfo.value.role,
          // content：自定义催办内容（不填则走模板）
          content: urgeForm.value.content || '',
          // remark：管理员补充备注（会拼到钉钉消息末尾，不会影响模板匹配）
          remark: urgeForm.value.remark || ''
        }
      : {
          orderNo: order.value.orderNo,
          operator: userInfo.value.username,
          role: userInfo.value.role,
          content: urgeForm.value.content
        }
    console.log('[催办] 请求体:', JSON.stringify(body))
    const data = await http.post(path, body)
    console.log('[催办] 后端返回:', data)
    if (data.success) {
      if (isPhone && order.value.handlerPhone) {
        // 电话催办：先弹窗提示用户即将拨号（解决某些浏览器拦截问题）
        showUrgeModal.value = false
        const phone = order.value.handlerPhone
        // 方式一：尝试调起系统拨号
        const dialResult = window.confirm(
          `✅ 催办已提交！现在将拨打处理人电话：\n\n${order.value.currentHandler || '处理人'} - ${phone}\n\n点击"确定"立即拨号；点击"取消"则返回页面。`
        )
        if (dialResult) {
          window.location.href = 'tel:' + phone
        }
      } else {
        alert('✅ 催办成功，已记录并发送钉钉私聊')
        showUrgeModal.value = false
      }
      fetchOrderDetail()
    } else {
      alert('❌ 操作失败：' + (data.errorMsg || data.message || '未知错误'))
    }
  } catch (e) {
    console.error('[催办] 请求异常:', e)
    alert('❌ 请求异常，请检查后端服务是否启动：' + e.message)
  }
}

// 手动拨号（tel 链接可能在某些浏览器被拦截，这个方法加一个兜底）
const dialPhone = () => {
  if (!order.value?.handlerPhone) {
    alert('该工单没有处理人联系电话')
    return
  }
  try {
    window.location.href = 'tel:' + order.value.handlerPhone
  } catch (e) {
    alert('浏览器不支持自动拨号，请手动拨打：' + order.value.handlerPhone)
  }
}

// 复制手机号（PC端最实用的方式）
const copyPhone = async () => {
  if (!order.value?.handlerPhone) return
  try {
    await navigator.clipboard.writeText(order.value.handlerPhone)
    alert('✅ 号码已复制：' + order.value.handlerPhone + '\n请粘贴到手机拨打')
  } catch (e) {
    // 不支持 clipboard API 时降级
    const input = document.createElement('input')
    input.value = order.value.handlerPhone
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    alert('✅ 号码已复制：' + order.value.handlerPhone + '\n请粘贴到手机拨打')
  }
}

const getAlertClass = (level) => {
  const map = { NORMAL: 'processing', YELLOW: 'warning', ORANGE: 'timeout', RED: 'severe' }
  return map[level] || ''
}

onMounted(() => fetchOrderDetail())
</script>

<style scoped>
.order-detail {
  display: flex;
  flex-direction: column;
  gap: 15px;
}
.detail-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}
.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  min-width: 200px;
}
.detail-item.full { flex: 1; min-width: 100%; }
.detail-item label { font-size: 12px; color: #666; }
.detail-item span { font-size: 14px; font-weight: 500; }
.alert-badge { padding: 3px 10px; border-radius: 10px; font-size: 12px; font-weight: bold; display: inline-block; width: fit-content; }
.alert-badge.processing { background: #00b8ff22; color: #00b8ff; }
.alert-badge.warning { background: #f7d03822; color: #f7d038; border: 1px solid #f7d03855; }
.alert-badge.timeout { background: #ff6b3522; color: #ff6b35; border: 1px solid #ff6b3555; }
.alert-badge.severe { background: #ff303022; color: #ff3030; border: 1px solid #ff303055; animation: pulse 1.5s infinite; }

@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.6; } }

.card {
  background: #0b1329;
  border: 1px solid #00b8ff33;
  border-radius: 8px;
  padding: 16px 20px;
  color: #d0e8ff;
}
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.card-header h3 { margin: 0; color: #00b8ff; letter-spacing: 2px; }
.card h3 { color: #00b8ff; margin: 0 0 12px; letter-spacing: 1px; font-size: 16px; }
.btn {
  padding: 8px 16px;
  background: #00b8ff22;
  color: #00b8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  cursor: pointer;
}
.btn:hover { background: #00b8ff44; }
.table {
  width: 100%;
  border-collapse: collapse;
  background: #070c1b;
}
.table th {
  padding: 10px 12px;
  background: #0f2040;
  color: #00b8ff;
  text-align: left;
  font-size: 13px;
  border-bottom: 1px solid #00b8ff33;
}
.table td {
  padding: 10px 12px;
  color: #d0e8ff;
  font-size: 13px;
  border-bottom: 1px solid #00b8ff11;
}
.no-data { text-align: center; color: #888; }
.modal-overlay {
  position: fixed; top: 0; left: 0;
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
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.modal-header h3 { margin: 0; color: #00b8ff; }
.modal-header button { background: none; border: none; color: #d0e8ff; font-size: 24px; cursor: pointer; }
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
  display: flex; justify-content: flex-end;
  gap: 10px; margin-top: 16px;
}
.btn-warning {
  background: #f7d038;
  color: #070c1b;
  border: 1px solid #f7d038;
  border-radius: 4px;
  padding: 8px 16px;
  cursor: pointer;
}
.call-btn {
  display: inline-block;
  padding: 6px 12px;
  background: #ff6b35;
  color: #fff;
  border-radius: 4px;
  text-decoration: none;
  font-size: 13px;
  cursor: pointer;
  margin: 4px 4px 4px 0;
}
.call-btn:hover { background: #ff8856; }
.copy-btn {
  display: inline-block;
  padding: 6px 12px;
  background: #00b8ff33;
  color: #00b8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  margin: 4px 4px 4px 0;
}
.copy-btn:hover { background: #00b8ff55; }
</style>
