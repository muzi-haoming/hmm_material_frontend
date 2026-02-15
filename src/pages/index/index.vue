<template>
  <view class="container">
    <!-- 顶部 -->
    <view class="header-bg">
      <view class="title-bar">
        <text class="app-title">恒堃科技</text>
      </view>
    </view>

    <!-- 状态卡片 -->
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
    
    <!-- 内容区域（暂时为空） -->
    <view class="content">
      <!-- 占位内容 -->
    </view>
  </view>
</template>

<script setup lang="ts">
// 此处可以添加获取状态计数的逻辑
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
  padding-top: 60px; /* 状态栏高度近似值 */
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
