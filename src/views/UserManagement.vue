<template>
  <div>
    <div class="card">
      <div class="card-header">
        <h3>用户管理</h3>
        <button class="btn btn-primary" @click="showAddModal = true">添加用户</button>
      </div>

      <table class="table">
        <thead>
          <tr>
            <th>用户名</th>
            <th>真实姓名</th>
            <th>联系电话</th>
            <th>角色</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="user in users" :key="user.id">
            <td>{{ user.username }}</td>
            <td>{{ user.realName }}</td>
            <td>{{ user.phone }}</td>
            <td>{{ getRoleName(user.role) }}</td>

            <td>
              <button class="btn btn-primary" @click="editUser(user)">编辑</button>
              <button class="btn btn-danger" @click="deleteUser(user.id)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal-content">
        <div class="modal-header">
          <h3>{{ editUserData.id ? '编辑用户' : '添加用户' }}</h3>
          <button @click="closeModal">×</button>
        </div>
        <div class="form-group">
          <label>用户名</label>
          <input v-model="editUserData.username" type="text" :disabled="editUserData.id" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="editUserData.password" type="password" :placeholder="editUserData.id ? '不填则不修改密码' : ''" />
        </div>
        <div class="form-group">
          <label>真实姓名</label>
          <input v-model="editUserData.realName" type="text" />
        </div>
        <div class="form-group">
          <label>联系电话</label>
          <input v-model="editUserData.phone" type="text" />
        </div>
        <div class="form-group">
          <label>角色</label>
          <select v-model="editUserData.role">
            <option value="SUPER_ADMIN">超级管理员</option>
            <option value="ADMIN">管理员</option>
            <option value="MEMBER">一线人员</option>
          </select>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveUser">保存</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const users = ref([])
const showAddModal = ref(false)
const editUserData = ref({
  id: null,
  username: '',
  password: '',
  realName: '',
  phone: '',
  role: 'MEMBER'
})

const fetchUsers = async () => {
  try {
    const res = await fetch('http://localhost:8080/api/user')
    const result = await res.json()
    if (result.success) {
      users.value = result.data // 取出data内的用户数组
    } else {
      alert(result.errorMsg)
    }
  } catch (e) {
    console.error('获取用户失败', e)
  }
}

const closeModal = () => {
  showAddModal.value = false
  editUserData.value = {
    id: null,
    username: '',
    password: '',
    realName: '',
    phone: '',
    role: 'MEMBER',

  }
}

const editUser = (user) => {
  editUserData.value = { ...user, password: '' }
  showAddModal.value = true
}

const saveUser = async () => {
  try {
    const url = editUserData.value.id 
      ? `http://localhost:8080/api/user/${editUserData.value.id}`
      : 'http://localhost:8080/api/user'
    
    const method = editUserData.value.id ? 'PUT' : 'POST'
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editUserData.value)
    })
    
    const data = await response.json()
    if (data.success) {
      alert("操作成功")
      closeModal()
      fetchUsers()
    } else {
      alert(data.errorMsg)
    }
  } catch (e) {
    alert('保存失败')
  }
}

const deleteUser = async (id) => {
  if (!confirm('确定要删除这个用户吗？')) return
  
  try {
    const response = await fetch(`http://localhost:8080/api/user/${id}`, {
      method: 'DELETE'
    })
    const data = await response.json()
    if (data.success) {
      alert("操作成功")
      fetchUsers()
    } else {
      alert(data.errorMsg)
    }
  } catch (e) {
    alert('删除失败')
  }
}

const getRoleName = (role) => {
  const map = {
    'SUPER_ADMIN': '超级管理员',
    'ADMIN': '管理员',
    'MEMBER': '一线人员'
  }
  return map[role] || role
}

onMounted(() => {
  fetchUsers()
})
</script>