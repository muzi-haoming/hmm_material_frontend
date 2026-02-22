<template>
  <view class="container">
    <!-- Search Bar -->
    <view class="search-bar">
      <view class="search-box">
        <text class="iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          placeholder="搜索发票号码/抬头" 
          @confirm="onSearch"
        />
        <text class="iconfont icon-clear" v-if="keyword" @click="clearSearch"></text>
      </view>
    </view>

    <!-- Invoice List -->
    <view class="list-container">
      <view class="list-item" v-for="item in list" :key="item.id" @click="goDetail(item.id)">
        <view class="item-header">
          <text class="item-title">{{ item.invoice_title }}</text>
          <text class="item-amount">¥{{ item.amount }}</text>
        </view>
        <view class="item-body">
          <view class="info-row">
            <text class="label">发票号:</text>
            <text class="value">{{ item.invoice_no }}</text>
          </view>
          <view class="info-row">
            <text class="label">税号:</text>
            <text class="value">{{ item.tax_no }}</text>
          </view>
          <view class="info-row">
            <text class="label">开票日期:</text>
            <text class="value">{{ formatDate(item.issued_time) }}</text>
          </view>
        </view>
      </view>
      
      <!-- Empty State -->
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text>暂无数据</text>
      </view>
    </view>

    <!-- FAB Add -->
    <view class="fab-add" @click="goAdd">
      <text class="iconfont icon-add">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

const list = ref<any[]>([]);
const keyword = ref('');
const loading = ref(false);

onShow(async () => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    await fetchList();
  } finally {
    uni.hideLoading();
  }
});

const fetchList = async () => {
  loading.value = true;
  let query = supabase
    .from('invoice')
    .select('id, invoice_no, invoice_title, tax_no, amount, issued_time, create_time')
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.or(`invoice_no.ilike.%${keyword.value}%,invoice_title.ilike.%${keyword.value}%`);
  }

  const { data, error } = await query;
  if (data) {
    list.value = data;
  }
  loading.value = false;
};

const onSearch = () => {
  fetchList();
};

const clearSearch = () => {
  keyword.value = '';
  fetchList();
};

const goAdd = () => {
  uni.navigateTo({ url: '/pages/invoice/edit' });
};

const goDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/invoice/edit?id=${id}` });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 80px;
}

.search-bar {
  background-color: #fff;
  padding: 10px 15px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-box {
  background-color: #f5f5f5;
  border-radius: 20px;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  
  .icon-search {
    font-size: 16px;
    color: #999;
    margin-right: 8px;
  }
  
  .search-input {
    flex: 1;
    font-size: 14px;
    color: #333;
  }
  
  .icon-clear {
    font-size: 16px;
    color: #999;
    padding: 4px;
  }
}

.list-container {
  padding: 15px;
}

.list-item {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  
  &:active {
    background-color: #fafafa;
  }
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px dashed #eee;
}

.item-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  flex: 1;
  margin-right: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-amount {
  font-size: 16px;
  font-weight: bold;
  color: #ff4d4f;
}

.item-body {
  .info-row {
    display: flex;
    margin-bottom: 6px;
    font-size: 13px;
    
    &:last-child {
      margin-bottom: 0;
    }
    
    .label {
      color: #999;
      width: 70px;
    }
    
    .value {
      color: #666;
      flex: 1;
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px 0;
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
