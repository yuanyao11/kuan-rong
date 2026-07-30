<template>
  <div class="layout-container" style="display:flex;height:100vh;margin:0;">
    <!-- 侧边栏组件 -->
    <Sidebar />
    <div style="flex:1;display:flex;flex-direction:column;">
      <!-- 顶部头部组件 -->
      <Header />
      <!-- 子页面内容区域 -->
      <div style="padding:20px;flex:1;overflow:auto;">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import Header from '../components/Header.vue'

</script>