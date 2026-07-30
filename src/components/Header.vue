<template>
  <div class="header">
    <!-- 左侧系统标题 + 导航菜单 -->
    <div class="nav-left">
      <div class="system-name">宽融业务工单管理系统</div>
      <ul class="nav-menu">
        <li v-if="canSeeDashboard">
          <router-link to="/dashboard" :class="{active: route.path === '/dashboard'}">数据大屏</router-link>
        </li>
        <li>
          <router-link to="/orders" :class="{active: route.path === '/orders' || route.path === '/order/create'}">工单管理</router-link>
        </li>
        <li v-if="canSeeSla">
          <router-link to="/sla" :class="{active: route.path === '/sla'}">SLA规则</router-link>
        </li>
        <li v-if="canSeeTemplate">
          <router-link to="/template" :class="{active: route.path === '/template'}">催办模板</router-link>
        </li>
        <li v-if="canSeeUser">
          <router-link to="/user" :class="{active: route.path === '/user'}">用户管理</router-link>
        </li>
      </ul>
    </div>
    <!-- 右侧用户下拉 -->
    <div class="user-dropdown" @click.stop="showMenu = !showMenu">
      <span class="username">{{ user.username }}</span>
      <span class="role-tag">{{ roleLabel }}</span>
      <!-- 下拉菜单 -->
      <div v-if="showMenu" class="dropdown-box">
        <div class="dropdown-item" @click="openProfileModal">个人中心</div>
        <div class="dropdown-item" @click="logout">退出登录</div>
      </div>
    </div>

    <!-- 个人中心弹窗 -->
    <div v-if="modalVisible" class="modal-mask" @click.self="modalVisible = false">
      <div class="modal-box">
        <h3>个人信息设置</h3>
        <div class="form-item">
          <label>用户名</label>
          <input v-model="form.username" placeholder="请输入用户名" />
        </div>
        <div class="form-item">
          <label>原密码</label>
          <input v-model="form.oldPwd" type="password" placeholder="请输入原密码" />
        </div>
        <div class="form-item">
          <label>新密码</label>
          <input v-model="form.newPwd" type="password" placeholder="请输入新密码" />
        </div>
        <div class="form-item">
          <label>确认新密码</label>
          <input v-model="form.confirmPwd" type="password" placeholder="再次输入新密码" />
        </div>
        <div class="btn-group">
          <button class="cancel-btn" @click="modalVisible = false">取消</button>
          <button class="save-btn" @click="saveUserInfo">保存修改</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getUser, setUser, clearAuth, getToken } from '../utils/auth.js'
import http from '../utils/http.js'

const route = useRoute()
const router = useRouter()
const user = ref({ username: '', role: '' })
const title = ref('宽融业务工单管理系统')
const showMenu = ref(false)
const modalVisible = ref(false)
const form = ref({ username: '', oldPwd: '', newPwd: '', confirmPwd: '' })

const roleLabel = computed(() => {
  const r = user.value.role
  if (r === 'SUPER_ADMIN') return '超级管理员'
  if (r === 'ADMIN') return '管理员'
  if (r === 'MEMBER') return '一线人员'
  return ''
})

const canSeeDashboard = computed(() => ['SUPER_ADMIN', 'ADMIN'].includes(user.value.role))
const canSeeSla = computed(() => ['SUPER_ADMIN', 'ADMIN'].includes(user.value.role))
const canSeeTemplate = computed(() => user.value.role === 'SUPER_ADMIN')
const canSeeUser = computed(() => user.value.role === 'SUPER_ADMIN')

onMounted(() => {
  const u = getUser()
  if (u) {
    user.value = u
    form.value.username = u.username || ''
  }
  updateTitle()
})

// 监听登录态变化（比如在其它页面更新 user 信息后，Header 能跟着变）
watch(
  () => getUser(),
  (nu) => {
    if (nu) {
      user.value = nu
      form.value.username = nu.username || form.value.username
    }
  },
  { deep: true }
)

watch(() => route.path, () => {
  updateTitle()
  showMenu.value = false
})

const updateTitle = () => {
  const titles = {
    '/dashboard': '数据大屏',
    '/orders': '工单管理',
    '/order/create': '新建工单',
    '/sla': 'SLA规则配置',
    '/template': '催办模板管理',
    '/user': '用户管理'
  }
  title.value = titles[route.path] || '宽融业务工单管理系统'
}

const openProfileModal = () => {
  showMenu.value = false
  modalVisible.value = true
  form.value.username = user.value.username
  form.value.oldPwd = ''
  form.value.newPwd = ''
  form.value.confirmPwd = ''
}

const saveUserInfo = async () => {
  if (!form.value.username.trim()) {
    alert('用户名不能为空')
    return
  }
  let needUpdatePwd = false
  if (form.value.oldPwd || form.value.newPwd || form.value.confirmPwd) {
    needUpdatePwd = true
    if (!form.value.oldPwd.trim()) { alert('请输入原密码'); return }
    if (!form.value.newPwd.trim()) { alert('请输入新密码'); return }
    if (form.value.newPwd !== form.value.confirmPwd) { alert('两次新密码输入不一致'); return }
  }

  const loginUser = getUser() || {}
  try {
    const nameResult = await http.put('/api/user/updateName', {
      id: loginUser.id,
      username: form.value.username.trim()
    })
    if (nameResult.success === false) throw new Error(nameResult.errorMsg || nameResult.msg || '用户名修改失败')

    if (needUpdatePwd) {
      const pwdResult = await http.put('/api/user/updatePwd', {
        id: loginUser.id,
        oldPassword: form.value.oldPwd.trim(),
        password: form.value.newPwd.trim()
      })
      if (pwdResult.success === false) throw new Error(pwdResult.errorMsg || pwdResult.msg || '密码修改失败')
    }

    const newUserInfo = { ...loginUser, username: form.value.username.trim() }
    setUser(newUserInfo)
    user.value = newUserInfo
    modalVisible.value = false
    alert('个人信息保存成功！')
  } catch (err) {
    console.error('保存个人信息异常：', err)
    alert(`操作失败：${err.message}`)
  }
}

const logout = async () => {
  showMenu.value = false
  try {
    if (getToken()) {
      // 不阻塞：即使后端失败也本地清登录态
      await http.post('/api/user/logout', {}).catch(() => {})
    }
  } finally {
    clearAuth()
    router.replace('/login')
  }
}
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  background: #001529;
  color: #fff;
  padding: 0 24px;
  position: relative;
  z-index: 99;
}
.nav-left {
  display: flex;
  align-items: center;
  gap: 40px;
}
.system-name {
  font-size: 18px;
  font-weight: bold;
}
.nav-menu {
  display: flex;
  gap: 32px;
  list-style: none;
  margin: 0;
  padding: 0;
}
.nav-menu li a {
  color: rgba(255,255,255,0.7);
  text-decoration: none;
  font-size: 14px;
}
.nav-menu li a.active {
  color: #fff;
  border-bottom: 2px solid #00b8ff;
  padding-bottom: 16px;
}
.user-dropdown {
  cursor: pointer;
  position: relative;
  padding: 0 10px;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.username { font-size: 14px; }
.role-tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
  background: #00b8ff22;
  color: #00b8ff;
}
.dropdown-box {
  position: absolute;
  top: 60px;
  right: 0;
  width: 140px;
  background: #fff;
  color: #333;
  border-radius: 4px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
  overflow: hidden;
}
.dropdown-item {
  padding: 12px 16px;
  font-size: 14px;
}
.dropdown-item:hover {
  background: #f5f5f5;
}
.modal-mask {
  position: fixed;
  top: 0; left: 0;
  width: 100vw; height: 100vh;
  background: rgba(0,0,0,0.5);
  display: flex; align-items: center; justify-content: center;
  z-index: 999;
}
.modal-box {
  width: 420px;
  background: #fff;
  border-radius: 8px;
  padding: 24px;
  color: #333;
}
.modal-box h3 { text-align: center; margin-top: 0; margin-bottom: 20px; }
.form-item { margin-bottom: 16px; }
.form-item label { display: block; margin-bottom: 6px; font-size: 14px; }
.form-item input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 12px;
  border: 1px solid #dcdcdc;
  border-radius: 4px;
}
.btn-group { display: flex; justify-content: flex-end; gap: 12px; margin-top: 24px; }
.cancel-btn { padding: 8px 20px; border: 1px solid #dcdcdc; background: #fff; border-radius: 4px; cursor: pointer; }
.save-btn { padding: 8px 20px; background: #00b8ff; color: #fff; border: none; border-radius: 4px; cursor: pointer; }
</style>
