<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h3>SLA 规则管理</h3>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-primary" @click="showAddModal = true">添加规则</button>
        </div>
      </div>

      <p style="color:#999; font-size:13px; line-height:1.7;">
        字段语义：
        <br/>· 正常时长：sla_hours，规定时间以内。
        <br/>· 预警时长：yellow_alert_hours，距离 deadline 还剩 N 小时进入 <b>黄色预警 YELLOW</b>。
        <br/>· 普通超时：orange_alert_hours，超过 deadline N 小时算 <b>橙色预警 ORANGE</b>。
        <br/>· 严重超时：red_alert_hours，超过 deadline N 小时算 <b>红色预警 RED</b>，并自动钉钉催办（24 小时内同工单只催一次）。
        <br/>· 规则保存后，系统会自动按最新规则重算所有未完成工单的 sla_deadline，并刷新预警等级。
      </p>

      <table class="table">
        <thead>
          <tr>
            <th>工单类型</th>
            <th>正常时长(小时)</th>
            <th>距离 deadline 预警(小时)</th>
            <th>超过 deadline 普通超时(小时)</th>
            <th>超过 deadline 严重超时(小时)</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="rule in rules" :key="rule.id">
            <td>{{ workTypeLabel(rule.workType) }}</td>
            <td>{{ rule.slaHours }}</td>
            <td>{{ rule.yellowAlertHours }}</td>
            <td>{{ rule.orangeAlertHours }}</td>
            <td>{{ rule.redAlertHours }}</td>
            <td>{{ rule.isActive === 1 ? '启用' : '禁用' }}</td>
            <td>
              <button class="btn btn-primary" @click="editRule(rule)">编辑</button>
              <button class="btn btn-danger" @click="deleteRule(rule.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editRuleData.id ? '编辑规则' : '添加规则' }}</h3>
          <button @click="closeModal">×</button>
        </div>
        <div class="form-group">
          <label>工单类型</label>
          <select v-model="editRuleData.workType" :disabled="!!editRuleData.id">
            <option value="NEW_INSTALL">新装</option>
            <option value="FTTR">FTTR</option>
            <option value="REPAIR">修障</option>
            <option value="RELOCATE">移机</option>
          </select>
        </div>
        <div class="form-group">
          <label>正常时长(小时)</label>
          <input type="number" step="0.1" v-model.number="editRuleData.slaHours" />
        </div>
        <div class="form-group">
          <label>距离 deadline 多少小时进入黄色预警</label>
          <input type="number" step="0.1" v-model.number="editRuleData.yellowAlertHours" />
        </div>
        <div class="form-group">
          <label>超过 deadline 多少小时算普通超时(ORANGE)</label>
          <input type="number" step="0.1" v-model.number="editRuleData.orangeAlertHours" />
        </div>
        <div class="form-group">
          <label>超过 deadline 多少小时算严重超时(RED，自动催办)</label>
          <input type="number" step="0.1" v-model.number="editRuleData.redAlertHours" />
        </div>
        <div class="form-group">
          <label>状态</label>
          <select v-model.number="editRuleData.isActive">
            <option :value="1">启用</option>
            <option :value="0">禁用</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveRule">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getUser } from '../utils/auth.js'
import http from '../utils/http.js'

const rules = ref([])
const showAddModal = ref(false)
const editRuleData = ref({
  id: null,
  workType: 'NEW_INSTALL',
  slaHours: 24,
  yellowAlertHours: 2,
  orangeAlertHours: 0,
  redAlertHours: 24,
  isActive: 1
})

const workTypeLabel = (t) => ({ NEW_INSTALL:'新装', FTTR:'FTTR', REPAIR:'修障', RELOCATE:'移机' }[t] || t || '-')

const fetchRules = async () => {
  try {
    const data = await http.get('/api/sla/config')
    const payload = (data && data.data && data.data.records) ? data.data.records : (Array.isArray(data.data) ? data.data : [])
    rules.value = payload.map(r => ({
      id: r.id,
      workType: r.workType,
      slaHours: r.slaHours ?? r.normalDuration,
      yellowAlertHours: r.yellowAlertHours ?? r.warningDuration,
      orangeAlertHours: r.orangeAlertHours ?? r.criticalDuration,
      redAlertHours: r.redAlertHours ?? r.severeDuration,
      isActive: r.isActive
    }))
  } catch (e) {
    console.error('获取规则失败', e)
    alert('获取规则失败：' + (e.message || e))
  }
}

const closeModal = () => {
  showAddModal.value = false
  editRuleData.value = { id: null, workType: 'NEW_INSTALL', slaHours: 24, yellowAlertHours: 2, orangeAlertHours: 0, redAlertHours: 24, isActive: 1 }
}

const editRule = (rule) => {
  editRuleData.value = { ...rule }
  showAddModal.value = true
}

const saveRule = async () => {
  const user = getUser() || {}
  try {
    const body = {
      role: user.role,
      workType: editRuleData.value.workType,
      slaHours: editRuleData.value.slaHours,
      yellowAlertHours: editRuleData.value.yellowAlertHours,
      orangeAlertHours: editRuleData.value.orangeAlertHours,
      redAlertHours: editRuleData.value.redAlertHours,
      isActive: editRuleData.value.isActive
    }
    const isEdit = !!editRuleData.value.id
    const data = isEdit
      ? await http.put(`/api/sla/config/${editRuleData.value.id}`, body)
      : await http.post('/api/sla/config', body)

    if (data && data.success) {
      alert(data.message || '保存成功')
      closeModal()
      fetchRules()
    } else {
      alert((data && data.message) || '保存失败')
    }
  } catch (e) {
    alert('保存失败：' + (e.message || e))
  }
}

const deleteRule = async (id) => {
  if (!confirm('确定要删除这条规则吗？')) return
  const user = getUser() || {}
  try {
    const data = await http.delete(`/api/sla/config/${id}`, { role: user.role })
    if (data && data.success) {
      alert(data.message || '删除成功')
      fetchRules()
    } else {
      alert((data && data.message) || '删除失败')
    }
  } catch (e) {
    alert('删除失败')
  }
}

onMounted(() => {
  fetchRules()
})
</script>

<style scoped>
.card-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.card-header h3 { margin:0; color:#00b8ff; }
.btn { padding: 6px 12px; background:#00b8ff22; color:#00b8ff; border:1px solid #00b8ff55; border-radius:4px; cursor:pointer; }
.btn:hover { background:#00b8ff44; }
.btn-primary { background:#00b8ff; color:#fff; }
.btn-primary:hover { background:#00a0e6; }
.btn-warning { background:#f7d038; color:#000; border-color:#f7d038; }
.btn-danger { background:#ff6b35; color:#fff; border-color:#ff6b35; }
.card { background:#0b1329; border:1px solid #00b8ff33; border-radius:8px; padding:16px 20px; color:#d0e8ff; margin-bottom:16px; }
.table { width:100%; border-collapse:collapse; background:#070c1b; }
.table th { padding:10px 12px; background:#0f2040; color:#00b8ff; text-align:left; font-size:13px; border-bottom:1px solid #00b8ff33; }
.table td { padding:10px 12px; color:#d0e8ff; font-size:13px; border-bottom:1px dashed #00b8ff22; }
.modal-overlay { position: fixed; inset:0; background: rgba(0,0,0,0.7); display:flex; align-items:center; justify-content:center; z-index:999; }
.modal-content { background:#0b1329; border:1px solid #00b8ff; border-radius:8px; padding:20px; min-width:420px; color:#d0e8ff; }
.modal-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }
.modal-header h3 { margin:0; color:#00b8ff; }
.modal-header button { background:none; border:none; color:#d0e8ff; font-size:24px; cursor:pointer; }
.form-group { margin-bottom:14px; }
.form-group label { display:block; margin-bottom:6px; font-size:13px; color:#a0c8e0; }
.form-group input, .form-group select { width:100%; padding:8px 12px; background:#070c1b; color:#d0e8ff; border:1px solid #00b8ff55; border-radius:4px; outline:none; box-sizing:border-box; }
.modal-footer { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; }
</style>