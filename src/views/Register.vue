<template>
  <div class="login-container">
    <div class="login-form">
      <h2>账号注册</h2>
      <div class="form-group">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="请输入用户名" />
      </div>
      <div class="form-group">
        <label>密码</label>
        <input v-model="password" type="password" placeholder="请输入密码" />
      </div>
      <div class="form-group">
        <label>确认密码</label>
        <input v-model="repPwd" type="password" placeholder="请再次输入密码" />
      </div>
      <div class="form-group">
        <label>手机号</label>
        <input v-model="phone" type="tel" placeholder="请输入手机号" />
      </div>
      <button class="btn btn-primary" @click="register">立即注册</button>
      <div style="margin-top:12px;text-align:center">
        <span style="color:#666">已有账号？</span>
        <span style="color:#007bff;cursor:pointer" @click="$router.push('/login')">去登录</span>
      </div>
      <div v-if="error" style="color: red; text-align: center; margin-top: 15px;">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import router from "@/router/index.js";

const username = ref('')
const password = ref('')
const repPwd = ref('')
const phone = ref('')
const error = ref('')

const register = async () => {
  error.value = ''
  // 1. 非空校验
  if (!username.value) {
    error.value = '请填写用户名'
    return
  }
  if (!password.value) {
    error.value = '请填写密码'
    return
  }
  if (!repPwd.value) {
    error.value = '请确认密码'
    return
  }
  if (!phone.value) {
    error.value = '请填写手机号'
    return
  }
  // 2. 两次密码一致校验
  if (password.value !== repPwd.value) {
    error.value = '两次输入密码不一致'
    return
  }
  // 3. 简单手机号格式校验
  const phoneReg = /^1[3-9]\d{9}$/
  if (!phoneReg.test(phone.value)) {
    error.value = '手机号格式不正确'
    return
  }

  try {
    const res = await fetch('http://localhost:8080/api/user/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value,
        password: password.value,
        phone: phone.value
      })
    })
    const data = await res.json()
    if (data.success) {
      error.value = '注册成功，即将跳转登录页'
      setTimeout(() => {
        router.push('/login')
      }, 1200)
    } else {
      error.value = data.errorMsg
    }
  } catch (err){
    error.value = '网络异常，注册失败'
  }
}
</script>

<style scoped>
.login-container {
  width: 100vw;
  height: 100vh;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}
.login-form {
  width: 420px;
  background: #fff;
  padding: 30px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.1);
}
h2 {
  text-align: center;
  margin-bottom: 24px;
  color: #333;
}
.form-group {
  margin-bottom: 16px;
}
.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 14px;
  color: #555;
}
.form-group input {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}
.btn-primary {
  width: 100%;
  padding: 11px;
  background: #007bff;
  color: #fff;
  border: none;
  border-radius: 4px;
  font-size: 15px;
  cursor: pointer;
}
</style>