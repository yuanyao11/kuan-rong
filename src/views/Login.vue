<template>
  <div class="login-container">
    <div class="login-form">
      <h2>宽融业务工单管理系统</h2>
      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="请输入用户名" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码" />
      </div>
      <button class="btn btn-primary" @click="login">登录</button>
      <div style="margin-top:12px;text-align:center">
        <span style="color:#666">没有账号？</span>
        <span style="color:#007bff;cursor:pointer" @click="$router.push('/register')">立即注册</span>
      </div>
      <div v-if="error" style="color: red; text-align: center; margin-top: 15px;">{{ error }}</div>
      <div v-if="success" style="color:#28a745;text-align:center;margin-top:15px;">{{ success }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import router from '@/router/index.js'
import { setToken, setUser, clearAuth } from '@/utils/auth.js'
import http from '@/utils/http.js'

const username = ref('')
const password = ref('')
const error = ref('')
const success = ref('')

const login = async () => {
  error.value = ''
  success.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  try {
    clearAuth()
    const data = await http.post('/api/user/login', {
      username: username.value.trim(),
      password: password.value
    })

    if (data.success) {
      const payload = data.data || {}
      const token = payload.token
      const user = payload.user || {}
      if (!token) {
        error.value = '登录响应异常：未返回 token'
        return
      }
      setToken(token)
      setUser(user)
      success.value = '登录成功，正在跳转...'
      const role = user.role || ''
      const target = role === 'MEMBER' ? '/orders' : '/dashboard'
      setTimeout(() => {
        router.push(target)
      }, 600)
    } else {
      error.value = data.errorMsg || data.message || '登录失败'
    }
  } catch (e) {
    error.value = '登录失败，请稍后重试（' + (e.message || e) + '）'
  }
}
</script>
