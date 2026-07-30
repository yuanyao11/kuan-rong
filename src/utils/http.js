// 统一请求封装：自动带 Authorization 头、自动处理 401（登录态失效）。
// 使用方式： await http.get('/api/user/me')  或  await http.post('/api/user/login', body)
import { getToken, clearAuth } from './auth.js'
import router from '../router/index.js'

const BASE = 'http://localhost:8080'

async function request(method, url, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) {
    headers['Authorization'] = token
  }

  const init = {
    method,
    headers,
    credentials: 'include'
  }
  if (body !== undefined && body !== null) {
    init.body = JSON.stringify(body)
  }

  try {
    const res = await fetch(BASE + url, init)
    // 401 处理：自动跳登录页
    if (res.status === 401) {
      clearAuth()
      router.push('/login')
      throw new Error('登录态已失效，请重新登录')
    }
    const data = await res.json()
    return data
  } catch (e) {
    // 连接失败
    if (e && /Failed to fetch|NetworkError/i.test(e.message)) {
      // 后端服务未启动
    }
    throw e
  }
}

export const http = {
  get: (url) => request('GET', url),
  post: (url, body) => request('POST', url, body),
  put: (url, body) => request('PUT', url, body),
  // 允许在 DELETE 请求里带 JSON body（部分后端会用到 role 等参数）
  delete: (url, body) => request('DELETE', url, body)
}

export default http
