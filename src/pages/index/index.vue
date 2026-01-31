<template>
  <view class="container">
    <!-- Header -->
    <view class="header-bg">
      <view class="title-bar">
        <text class="app-title">HK 综合管理系统</text>
      </view>
    </view>

    <!-- Status Card -->
    <view class="status-card">
      <view class="status-item">
        <text class="count">0</text>
        <text class="label">待处理</text>
      </view>
      <view class="status-item">
        <text class="count">0</text>
        <text class="label">处理中</text>
      </view>
      <view class="status-item">
        <text class="count">0</text>
        <text class="label">已完成</text>
      </view>
    </view>
    
    <!-- Content Area (Empty for now) -->
    <view class="content">
      <!-- Placeholder content -->
    </view>
  </view>
</template>

<script setup lang="ts">
// Logic can be added here to fetch status counts
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.header-bg {
  height: 25vh;
  background: linear-gradient(135deg, #6739b6, #8a4fd3);
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  padding-top: 60px; /* Status bar height approximation */
  box-sizing: border-box;
}

.title-bar {
  text-align: center;
}

.app-title {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.status-card {
  position: absolute;
  top: 18vh;
  left: 20px;
  right: 20px;
  background: #fff;
  border-radius: 15px;
  padding: 25px 0;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.status-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  
  .count {
    font-size: 24px;
    font-weight: bold;
    color: #666;
    margin-bottom: 8px;
  }
  
  .label {
    font-size: 12px;
    color: #999;
  }
}
</style>
