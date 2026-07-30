import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Dashboard from '../views/Dashboard.vue'
import OrderList from '../views/OrderList.vue'
import OrderDetail from '../views/OrderDetail.vue'
import CreateOrder from '../views/CreateOrder.vue'
import Layout from '../views/Layout.vue'
import SlaRule from '../views/SlaRule.vue'
import RemindTemplate from '../views/RemindTemplate.vue'
import UserManagement from '../views/UserManagement.vue'
import Register from "../views/Register.vue"

import { getToken, getUser, setUser, clearAuth } from '../utils/auth.js'
import http from '../utils/http.js'

const routes = [
  { path: '/login', component: Login, meta: { public: true } },
  { path: '/register', component: Register, meta: { public: true } },
  {
    path: '/',
    component: Layout,
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      { path: '/dashboard', component: Dashboard, meta: { requiresAuth: true } },
      { path: '/orders', component: OrderList, meta: { requiresAuth: true } },
      { path: '/order/:id', component: OrderDetail, meta: { requiresAuth: true } },
      { path: '/order/create', component: CreateOrder, meta: { requiresAuth: true } },
      { path: '/sla', component: SlaRule, meta: { requiresAuth: true } },
      { path: '/template', component: RemindTemplate, meta: { requiresAuth: true } },
      { path: '/user', component: UserManagement, meta: { requiresAuth: true } }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

/**
 * 全局路由守卫：
 *   1) 未登录访问受保护页 -> 跳登录
 *   2) 已登录但 user 信息在刷新后丢失 -> 调 /api/user/me 补一份
 *   3) 已登录去 /login /register -> 自动跳到首页
 */
router.beforeEach(async (to, from, next) => {
  const token = getToken()
  if (to.meta.public) {
    if (token && (to.path === '/login' || to.path === '/register')) {
      // 已登录的用户去登录页 -> 进首页
      return next('/dashboard')
    }
    return next()
  }

  if (!token) {
    clearAuth()
    return next('/login')
  }

  // 有 token 但 user 信息丢失（刷新页面） -> 调后端补 user
  if (!getUser()) {
    try {
      const res = await http.get('/api/user/me')
      if (res.success && res.data) {
        setUser(res.data)
        return next()
      } else {
        clearAuth()
        return next('/login')
      }
    } catch (e) {
      clearAuth()
      return next('/login')
    }
  }

  next()
})

export default router
