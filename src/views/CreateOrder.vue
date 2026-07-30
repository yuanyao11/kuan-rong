<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h3>新建工单</h3>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-danger" @click="goMock">一键生成模拟工单</button>
          <button class="btn" @click="goBack">返回列表</button>
        </div>
      </div>

      <div class="form-grid">
        <div class="form-item">
          <label>工单类型 *</label>
          <select v-model="form.workType">
            <option value="">请选择</option>
            <option value="NEW_INSTALL">新装</option>
            <option value="FTTR">FTTR</option>
            <option value="REPAIR">修障</option>
            <option value="RELOCATE">移机</option>
          </select>
        </div>

        <div class="form-item">
          <label>城市 *</label>
          <select v-model="form.city">
            <option value="">请选择</option>
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
        </div>

        <div class="form-item">
          <label>区域 *</label>
          <input v-model="form.district" placeholder="如 红谷滩区" />
        </div>

        <div class="form-item">
          <label>装机地址 *</label>
          <input v-model="form.installAddress" placeholder="请输入装机地址" />
        </div>

        <div class="form-item">
          <label>服务中心</label>
          <input v-model="form.serviceCenter" placeholder="服务中心" />
        </div>

        <div class="form-item">
          <label>宽带编号</label>
          <input v-model="form.broadbandNo" placeholder="宽带编号" />
        </div>

        <div class="form-item">
          <label>处理人</label>
          <select v-model="form.handlerUsername" @change="onHandlerChange">
            <option value="">请选择处理人（从一线人员列表获取）</option>
            <option v-for="h in handlers" :key="h.username" :value="h.username">
              {{ h.name }}（{{ h.phone }}）
            </option>
          </select>
        </div>

        <div class="form-item">
          <label>处理人姓名（展示用）</label>
          <input v-model="form.currentHandler" placeholder="处理人姓名" />
        </div>

        <div class="form-item">
          <label>处理人电话</label>
          <input v-model="form.handlerPhone" placeholder="处理人电话" />
        </div>

        <div class="form-item full">
          <label>备注</label>
          <textarea v-model="form.processFeedback" rows="3" placeholder="备注信息"></textarea>
        </div>
      </div>

      <div class="form-actions">
        <button class="btn" @click="goBack">取消</button>
        <button class="btn btn-primary" @click="submit">创建</button>
      </div>

      <p style="color:#888; font-size:12px; margin-top:12px;">
        提示：创建后系统会按工单类型查询 SLA 规则，自动生成 sla_deadline = create_time + slaHours，并刷新预警等级。
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import http from '../utils/http.js'
import { getUser } from '../utils/auth.js'

const router = useRouter()

const handlers = ref([])

const form = ref({
  workType: '',
  city: '',
  district: '',
  installAddress: '',
  serviceCenter: '',
  broadbandNo: '',
  handlerUsername: '',
  currentHandler: '',
  handlerPhone: '',
  processFeedback: ''
})

const goBack = () => { router.push('/orders') }

const onHandlerChange = () => {
  const h = handlers.value.find(x => x.username === form.value.handlerUsername)
  if (h) {
    form.value.currentHandler = h.name || h.username
    form.value.handlerPhone = h.phone
  } else {
    form.value.currentHandler = ''
    form.value.handlerPhone = ''
  }
}

const fetchHandlers = async () => {
  try {
    const data = await http.get('/api/user/handlers')
    if (data && data.success && Array.isArray(data.data)) {
      handlers.value = data.data
    } else if (data && Array.isArray(data.data)) {
      handlers.value = data.data
    }
  } catch (e) {
    console.error('获取一线人员列表失败', e)
  }
}

const submit = async () => {
  if (!form.value.workType) { alert('请选择工单类型'); return }
  if (!form.value.city) { alert('请选择城市'); return }
  if (!form.value.district) { alert('请填写区域'); return }
  if (!form.value.installAddress) { alert('请填写装机地址'); return }

  const user = getUser() || {}

  const body = {
    workType: form.value.workType,
    city: form.value.city,
    district: form.value.district,
    installAddress: form.value.installAddress,
    serviceCenter: form.value.serviceCenter,
    broadbandNo: form.value.broadbandNo,
    currentHandler: form.value.currentHandler,
    handlerPhone: form.value.handlerPhone,
    processFeedback: form.value.processFeedback,
    role: user.role
  }

  try {
    const data = await http.post('/api/workOrder', body)
    if (data && data.success) {
      alert('工单创建成功，工单号：' + (data.data?.orderNo || ''))
      goBack()
    } else {
      alert((data && data.message) || '创建失败')
    }
  } catch (e) {
    console.error(e)
    alert('创建失败')
  }
}

const goMock = async () => {
  if (!confirm('将按规则批量生成模拟工单：\n- 数量：50 条\n- 创建时间：2026-07-07 至 2026-07-09\n- 截止时间：创建时间 + 48 小时\n继续？')) {
    return
  }
  const user = getUser() || {}
  try {
    const params = new URLSearchParams({
      count: '50',
      startDate: '2026-07-07',
      endDate: '2026-07-09',
      role: user.role || 'ADMIN'
    })
    const data = await http.post('/api/workOrder/mock?' + params.toString())
    if (data && data.success) {
      alert('✅ ' + (data.message || '生成成功')
        + (data.data ? ('（共 ' + data.data.count + ' 条，时间 ' + data.data.createTimeFrom + ' ~ ' + data.data.createTimeTo + '）') : ''))
    } else {
      alert((data && data.message) || '生成失败')
    }
  } catch (e) {
    console.error(e)
    alert('生成失败：' + (e.message || e))
  }
}

onMounted(() => {
  fetchHandlers()
})
</script>

<style scoped>
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
  margin-bottom: 20px;
}
.card-header h3 { margin: 0; color: #00b8ff; letter-spacing: 2px; }
.form-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.form-item { display: flex; flex-direction: column; gap: 6px; }
.form-item.full { grid-column: 1 / -1; }
.form-item label { font-size: 13px; color: #a0c8e0; }
.form-item input, .form-item select, .form-item textarea {
  padding: 8px 12px;
  background: #070c1b;
  color: #d0e8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  outline: none;
  box-sizing: border-box;
  width: 100%;
}
.form-actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
.btn {
  padding: 8px 16px;
  background: #00b8ff22;
  color: #00b8ff;
  border: 1px solid #00b8ff55;
  border-radius: 4px;
  cursor: pointer;
}
.btn:hover { background: #00b8ff44; }
.btn-primary { background: #00b8ff; color: #070c1b; border-color: #00b8ff; }
.btn-primary:hover { background: #39ff14; border-color: #39ff14; color: #070c1b; }
.btn-danger { background: #ff6b35; color: #fff; border-color: #ff6b35; }
.btn-danger:hover { background: #e55a2b; }
</style>
