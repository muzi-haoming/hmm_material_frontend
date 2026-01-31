<template>
  <view class="container">
    <!-- Header -->
    <view class="header-bg">
      <view class="title-bar">
        <text class="app-title">HK 综合管理系统</text>
      </view>
    </view>

    <!-- Main Card -->
    <view class="main-card">
      <!-- Tabs -->
      <view class="tabs">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 0 }"
          @click="currentTab = 0"
        >
          <!-- <text class="iconfont icon-file"></text> Removed broken icon -->
          <text>基础信息</text>
        </view>
        <view 
          class="tab-item" 
          :class="{ active: currentTab === 1 }"
          @click="currentTab = 1"
        >
          <!-- <text class="iconfont icon-chart"></text> Removed broken icon -->
          <text>业务数据</text>
        </view>
        
        <!-- Active Indicator -->
        <view class="indicator" :style="{ left: currentTab === 0 ? '25%' : '75%' }"></view>
      </view>

      <!-- Grid Content -->
      <view class="grid-content">
        <view 
          class="grid-item" 
          v-for="(item, index) in currentGridData" 
          :key="index"
          @click="handleGridClick(item)"
        >
          <view class="icon-circle" :style="{ backgroundColor: '#999' }"> <!-- Grey placeholder icons -->
            <text class="icon-text">{{ item.iconChar }}</text>
          </view>
          <text class="grid-label">{{ item.label }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

const currentTab = ref(0);

const baseData = [
  { label: '工地信息', iconChar: 'G' },
  { label: '厂家信息', iconChar: 'C' },
  { label: '厂家组', iconChar: 'C' },
  { label: '产品信息', iconChar: 'C' },
  { label: '其他费用项', iconChar: 'Q' },
];

const businessData = [
  { label: '合同信息', iconChar: 'H' },
  { label: '工地订单', iconChar: 'G' },
  { label: '采购单', iconChar: 'C' },
  { label: '对账单', iconChar: 'D' },
  { label: '库存信息', iconChar: 'K' },
  { label: '出库单', iconChar: 'C' },
  { label: '入库单', iconChar: 'R' },
];

const currentGridData = computed(() => currentTab.value === 0 ? baseData : businessData);

const handleGridClick = (item: { label: string, iconChar: string }) => {
  if (item.label === '工地信息') {
    uni.navigateTo({ url: '/pages/site/site-list' });
  } else if (item.label === '厂家信息') {
    uni.navigateTo({ url: '/pages/manufacturer/list' });
  } else if (item.label === '厂家组') {
    uni.navigateTo({ url: '/pages/manufacturer-group/list' });
  } else if (item.label === '产品信息') {
    uni.navigateTo({ url: '/pages/product/list' });
  } else if (item.label === '合同信息') {
    uni.navigateTo({ url: '/pages/contract/list' });
  } else if (item.label === '工地订单') {
    uni.navigateTo({ url: '/pages/order/list' });
  } else if (item.label === '采购单') {
    uni.navigateTo({ url: '/pages/purchase/list' });
  } else if (item.label === '入库单') {
    uni.navigateTo({ url: '/pages/stock-in/list' });
  } else if (item.label === '出库单') {
    uni.navigateTo({ url: '/pages/stock-out/list' });
  } else if (item.label === '库存信息') {
    uni.navigateTo({ url: '/pages/stock/list' });
  } else if (item.label === '对账单') {
    uni.navigateTo({ url: '/pages/statement/list' });
  } else if (item.label === '其他费用项') {
    uni.navigateTo({ url: '/pages/expense-item/list' });
  } else {
    uni.showToast({ title: '功能开发中...', icon: 'none' });
  }
};
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
  padding-top: 60px;
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

.main-card {
  position: absolute;
  top: 18vh;
  left: 15px;
  right: 15px;
  background: #fff;
  border-radius: 15px;
  padding: 20px 15px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  min-height: 60vh;
}

.tabs {
  display: flex;
  justify-content: space-around;
  padding-bottom: 20px;
  border-bottom: 1px solid #eee;
  position: relative;
  margin-bottom: 30px;
}

.tab-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-size: 16px;
  color: #666;
  font-weight: bold;
  
  &.active {
    color: #333;
  }
}

.indicator {
  position: absolute;
  bottom: 0;
  width: 20%;
  height: 3px;
  background-color: #6739b6; /* Purple indicator */
  transition: all 0.3s ease;
  transform: translateX(-50%);
}

.grid-content {
  display: flex;
  flex-wrap: wrap;
}

.grid-item {
  width: 25%; /* 4 items per row */
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 25px;
}

.icon-circle {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  background-color: #999;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
}

.icon-text {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.grid-label {
  font-size: 12px;
  color: #666;
  text-align: center;
}
</style>
