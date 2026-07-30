<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h3>催办模板管理</h3>
        <button class="btn btn-primary" @click="showAddModal = true">添加模板</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>模板名称</th>
            <th>模板内容</th>
            <th>模板类型</th>
            <th>状态</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="template in templates" :key="template.id">
            <td>{{ template.templateName }}</td>
            <td>{{ template.templateContent }}</td>
            <td>{{ (template.templateType || '').toLowerCase().includes('sms') ? '短信' : '语音' }}</td>
            <td>{{ template.isActive === 1 ? '启用' : '禁用' }}</td>
            <td>
              <button class="btn btn-primary" @click="editTemplate(template)">编辑</button>
              <button class="btn btn-danger" @click="deleteTemplate(template.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editTemplateData.id ? '编辑模板' : '添加模板' }}</h3>
          <button @click="closeModal">×</button>
        </div>
        <div class="form-group">
          <label>模板名称</label>
          <input v-model="editTemplateData.templateName" type="text" />
        </div>
        <div class="form-group">
          <label>模板内容</label>
          <textarea v-model="editTemplateData.templateContent" rows="4"></textarea>
        </div>
        <div class="form-group">
          <label>模板类型</label>
          <select v-model="editTemplateData.templateType">
            <option value="sms">短信</option>
            <option value="voice">语音</option>
          </select>
        </div>
        <div class="form-group">
          <label>状态</label>
          <select v-model.number="editTemplateData.isActive">
            <option :value="1">启用</option>
            <option :value="0">禁用</option>
          </select>
        </div>
        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveTemplate">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const templates = ref([])
const showAddModal = ref(false)
const editTemplateData = ref({
  id: null,
  templateName: '',
  templateContent: '',
  templateType: 'sms',
  isActive: 1
})

const fetchTemplates = async () => {
  try {
    const response = await fetch('http://localhost:8080/api/remind/templates')
    const result = await response.json()
    templates.value = Array.isArray(result.data) ? result.data : (Array.isArray(result) ? result : [])
  } catch (e) {
    console.error('获取模板失败', e)
  }
}

const closeModal = () => {
  showAddModal.value = false
  editTemplateData.value = {
    id: null,
    templateName: '',
    templateContent: '',
    templateType: 'sms',
    isActive: 1
  }
}

const editTemplate = (template) => {
  editTemplateData.value = { ...template }
  showAddModal.value = true
}

const saveTemplate = async () => {
  try {
    const url = editTemplateData.value.id 
      ? `http://localhost:8080/api/remind/templates/${editTemplateData.value.id}`
      : 'http://localhost:8080/api/remind/templates'
    
    const method = editTemplateData.value.id ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editTemplateData.value)
    })
    
    const data = await response.json()
    if (data.success) {
      alert(data.message)
      closeModal()
      fetchTemplates()
    } else {
      alert(data.message)
    }
  } catch (e) {
    alert('保存失败')
  }
}

const deleteTemplate = async (id) => {
  if (!confirm('确定要删除这个模板吗？')) return
  
  try {
    const response = await fetch(`http://localhost:8080/api/remind/templates/${id}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      alert(data.message)
      fetchTemplates()
    } else {
      alert(data.message)
    }
  } catch (e) {
    alert('删除失败')
  }
}

onMounted(() => {
  fetchTemplates()
})
</script>