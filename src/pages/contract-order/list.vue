<template>
  <view class="container">
    <view class="header-section">
      <view class="search-bar">
        <view class="search-input-box">
          <text class="iconfont icon-search"></text>
          <input 
            class="search-input" 
            type="text" 
            v-model="keyword" 
            placeholder="搜索合同/订单编号" 
            @confirm="handleSearch"
          />
          <text v-if="keyword" class="iconfont icon-close" @click="clearSearch"></text>
        </view>
      </view>
      
      <view class="tabs">
        <view 
          class="tab-item" 
          :class="{ active: currentTab === index }" 
          v-for="(tab, index) in tabs" 
          :key="index"
          @click="switchTab(index)"
        >
          <text>{{ tab.name }}</text>
          <view class="active-line" v-if="currentTab === index"></view>
        </view>
      </view>
    </view>

    <view class="list-container">
      <view 
        class="list-item" 
        v-for="(item, index) in list" 
        :key="item.id"
        @click="goDetail(item.id)"
      >
        <view class="item-header">
          <text class="order-code">{{ item.code }}</text>
          <text class="status-tag" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</text>
        </view>
        
        <view class="item-content">
          <view class="row">
            <text class="label">合同:</text>
            <text class="value">{{ item.contract?.name || '-' }}</text>
          </view>
          <view class="row">
            <text class="label">产品:</text>
            <text class="value">{{ item.product?.name || '-' }}</text>
          </view>
          <view class="row">
            <text class="label">数量:</text>
            <text class="value">{{ item.quantity }} {{ item.product?.unit }}</text>
          </view>
           <view class="row" v-if="item.type">
            <text class="label">类型:</text>
            <text class="value">{{ item.type }}</text>
          </view>
        </view>
        
        <view class="item-footer">
          <text class="time">{{ formatDate(item.create_time) }}</text>
        </view>
      </view>
      
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text>暂无数据</text>
      </view>
       <view v-if="loading" class="loading-state">
        <text>加载中...</text>
      </view>
    </view>

    <view class="fab-add" @click="goCreate">
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

interface ContractOrder {
  id: string;
  code: string;
  contract_id: string;
  product_id: string;
  quantity: number;
  status: string; // 0:待确认, 1:已确认/执行中, 2:完成
  type: string;
  create_time: string;
  contract?: { name: string };
  product?: { name: string; unit: string };
}

const tabs = [
  { name: '全部', value: 'all' },
  { name: '待确认', value: '0' },
  { name: '执行中', value: '1' },
  { name: '已完成', value: '2' }
];

const currentTab = ref(0);
const keyword = ref('');
const list = ref<ContractOrder[]>([]);
const loading = ref(false);

const switchTab = (index: number) => {
  currentTab.value = index;
  fetchData();
};

const fetchData = async () => {
  loading.value = true;
  let query = supabase
    .from('order') // Note: 'order' is a reserved word in SQL sometimes, supabase handles it but good to be careful. In code it's string.
    .select(`
      id, code, quantity, status, type, create_time,
      contract:contract_id (name),
      product:product_id (name, unit)
    `)
    .order('create_time', { ascending: false });

  // Filter by status if not 'all'
  const tabValue = tabs[currentTab.value].value;
  if (tabValue !== 'all') {
    // For "Processing" (value '1'), we might want to include multiple statuses if logic requires
    // But for now assuming '1' is the main processing status. 
    // If '1' means 'Confirmed', and there are other statuses, we should adjust.
    // Based on design: 0=Pending, 1=Confirmed/Processing, 2=Completed.
    query = query.eq('status', tabValue);
  }

  if (keyword.value) {
    // Search in order code or contract name
    // Supabase simplified search. Complex OR queries across relations are harder.
    // Let's stick to order code for now.
    query = query.ilike('code', `%${keyword.value}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching contract orders:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } else {
    list.value = (data as any[]) || [];
  }
  loading.value = false;
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    '0': '待确认',
    '1': '执行中',
    '2': '已完成',
    '3': '已取消' // Optional
  };
  return map[status] || '未知';
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    '0': 'pending',
    '1': 'processing',
    '2': 'completed',
    '3': 'cancelled'
  };
  return map[status] || '';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
};

const handleSearch = () => {
  fetchData();
};

const clearSearch = () => {
  keyword.value = '';
  fetchData();
};

const goCreate = () => {
  uni.navigateTo({ url: '/pages/contract-order/create' });
};

const goDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/contract-order/detail?id=${id}` });
};

onShow(async () => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    await fetchData();
  } finally {
    uni.hideLoading();
  }
});
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 80px;
}

.header-section {
  background-color: #fff;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.search-bar {
  padding: 10px 15px;
}

.search-input-box {
  background-color: #f5f7fa;
  border-radius: 20px;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  
  .iconfont {
    color: #999;
    font-size: 16px;
  }
  
  .search-input {
    flex: 1;
    font-size: 14px;
    margin-left: 10px;
    color: #333;
  }
}

.tabs {
  display: flex;
  justify-content: space-around;
  border-bottom: 1px solid #eee;
  
  .tab-item {
    position: relative;
    padding: 12px 0;
    font-size: 14px;
    color: #666;
    
    &.active {
      color: #6739b6;
      font-weight: bold;
    }
    
    .active-line {
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 3px;
      background-color: #6739b6;
      border-radius: 3px;
    }
  }
}

.list-container {
  padding: 15px;
}

.list-item {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  
  &:active {
    background-color: #fafafa;
  }
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f5f5f5;
  
  .order-code {
    font-size: 16px;
    font-weight: bold;
    color: #333;
  }
  
  .status-tag {
    font-size: 12px;
    padding: 4px 8px;
    border-radius: 4px;
    
    &.pending { background-color: #e6f7ff; color: #1890ff; }
    &.processing { background-color: #fff7e6; color: #fa8c16; }
    &.completed { background-color: #f6ffed; color: #52c41a; }
    &.cancelled { background-color: #fff1f0; color: #f5222d; }
  }
}

.item-content {
  margin-bottom: 10px;
  
  .row {
    display: flex;
    margin-bottom: 6px;
    font-size: 14px;
    
    .label {
      color: #999;
      width: 50px;
    }
    
    .value {
      color: #333;
      flex: 1;
    }
  }
}

.item-footer {
  text-align: right;
  
  .time {
    font-size: 12px;
    color: #ccc;
  }
}

.empty-state {
  text-align: center;
  padding-top: 60px;
  color: #999;
  font-size: 14px;
}

.loading-state {
    text-align: center;
    padding-top: 20px;
    color: #999;
    font-size: 14px;
}

.fab-add {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #6739b6;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(103, 57, 182, 0.4);
  
  .plus {
    color: #fff;
    font-size: 30px;
    font-weight: 300;
    margin-top: -4px;
  }
  
  &:active {
    transform: scale(0.95);
  }
}
</style>
