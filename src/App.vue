<template>
  <!-- 未登录：只渲染登录页路由 -->
  <div v-if="!isLoggedIn" class="login-container">
    <router-view />
  </div>
  <!-- 已登录：只渲染路由出口，Layout交给路由守卫控制，这里不写Layout -->
  <router-view v-else />
</template>

<script setup>
import { ref } from 'vue'
const isLoggedIn = ref(true)
</script>