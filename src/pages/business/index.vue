<template>
  <view class="container">
    <!-- 顶部 Tab 切换 (已移除零星采购) -->
    <!-- 搜索栏 -->
    <view class="search-bar">
      <view class="search-input-box">
        <text class="iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          placeholder="搜索合同名称/编号" 
          @confirm="handleSearch"
        />
        <text v-if="keyword" class="iconfont icon-close" @click="clearSearch"></text>
      </view>
    </view>

    <!-- 列表区域 -->
    <view class="list-container">
      <!-- 合同列表 -->
        <view 
          class="list-item" 
          v-for="(item, index) in contractList" 
          :key="item.id"
          @click="goContractDetail(item.id)"
        >
          <view class="item-content">
            <view class="item-header">
                <text class="item-name">{{ item.name }}</text>
                <text class="tag" :class="getStatusClass(item)">{{ getStatusText(item) }}</text>
            </view>
            <text class="item-code">编号: {{ item.code }}</text>
            <text class="item-info">工地: {{ item.site_name }}</text>
            <text v-if="item.manufacturers && item.manufacturers.length > 0" class="item-info">
              厂家: {{ item.manufacturers.join('、') }}
            </text>
            <text class="item-time">{{ formatDate(item.create_time) }}</text>
          </view>
        </view>
         <view v-if="contractList.length === 0 && !loading" class="empty-state">
            <text>暂无合同数据</text>
        </view>
    </view>
    
    <!-- 悬浮按钮 -->
    <view 
      class="fab-add" 
      @click="goAdd"
      v-if="canCreate"
    >
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';
import { getBillStatus, BillStatusText } from '@/types';
import { getCurrentUser } from '@/utils/permission';

interface Contract {
  id: string;
  name: string;
  code: string;
  site_name: string;
  manufacturers: string[];
  is_confirmed: boolean;
  is_completed: boolean;
  creator: string;
  create_time: string;
}

const keyword = ref('');
const loading = ref(false);
const contractList = ref<Contract[]>([]);
const currentUser = ref<any>(null);

const canCreate = computed(() => {
    // 简化的权限判断，实际应调用 permission.ts
    if (!currentUser.value) return false;
    if (currentUser.value.is_admin) return true;
    
    // 代理人可以建合同
    return currentUser.value.site_permissions && currentUser.value.site_permissions.length > 0;
});


const fetchData = async () => {
    loading.value = true;
    currentUser.value = getCurrentUser();
    await fetchContracts();
    loading.value = false;
};

const fetchContracts = async () => {
  let query = supabase
    .from('contract')
    .select(`
      id, name, code, is_confirmed, is_completed, creator, create_time,
      site:site_id(name)
    `)
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.or(`name.ilike.%${keyword.value}%,code.ilike.%${keyword.value}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching contract:', error);
    return;
  }

  if (data && data.length > 0) {
    const contractIds = data.map(c => c.id);
    const { data: relaData } = await supabase
      .from('contract_manufacturer_rela')
      .select('contract_id, manufacturer:manufacturer_id(name)')
      .in('contract_id', contractIds);

    contractList.value = data.map(contract => ({
      id: contract.id,
      name: contract.name,
      code: contract.code,
      // @ts-ignore
      site_name: contract.site?.name || '未知工地',
      manufacturers: relaData
        ?.filter(r => r.contract_id === contract.id)
        // @ts-ignore
        .map(r => r.manufacturer?.name) || [],
      is_confirmed: contract.is_confirmed,
      is_completed: contract.is_completed,
      creator: contract.creator,
      create_time: contract.create_time
    }));
  } else {
    contractList.value = [];
  }
};

const getStatusText = (item: Contract) => {
  const status = getBillStatus(item.is_confirmed, item.is_completed);
  return BillStatusText[status];
};

const getStatusClass = (item: Contract) => {
  if (item.is_completed) return 'completed';
  if (item.is_confirmed) return 'confirmed';
  return 'pending';
};

const handleSearch = () => {
  fetchData();
};

const clearSearch = () => {
  keyword.value = '';
  fetchData();
};

const goAdd = () => {
    uni.navigateTo({ url: '/pages/contract/edit' });
};

const goContractDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/contract/detail?id=${id}` });
};

const formatDate = (str: string) => {
    if (!str) return '';
    return str.split('T')[0];
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
  display: flex;
  flex-direction: column;
}

.tab-header {
    background: #fff;
    display: flex;
    justify-content: space-around;
    padding: 10px 0;
    position: sticky;
    top: 0;
    z-index: 100;
    
    .tab-item {
        position: relative;
        padding: 10px 0;
        font-size: 16px;
        color: #666;
        
        &.active {
            color: #6739b6;
            font-weight: bold;
        }
        
        .tab-line {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 3px;
            background-color: #6739b6;
            border-radius: 2px;
        }
    }
}

.search-bar {
  background-color: #fff;
  padding: 10px 15px;
}

.search-input-box {
  background-color: #f0f0f0;
  border-radius: 8px;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  
  .search-input {
    flex: 1;
    font-size: 14px;
    margin-left: 8px;
  }
}

.list-container {
  flex: 1;
  padding: 15px;
}

.list-item {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  
  &:active {
    background-color: #fafafa;
  }
  
  .item-content {
      display: flex;
      flex-direction: column;
  }
  
  .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .item-name {
          font-size: 16px;
          font-weight: 600;
          color: #333;
      }
  }
  
  .item-code, .item-info, .item-time {
      font-size: 13px;
      color: #666;
      margin-bottom: 4px;
      line-height: 1.4;
  }
  
  .item-time {
      color: #999;
      font-size: 12px;
      margin-top: 4px;
      text-align: right;
  }
}

.tag {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background-color: #eee;
  color: #666;
  
  &.confirmed { 
    background-color: #e6f7ff; 
    color: #1890ff; 
  }
  &.pending { 
    background-color: #fff7e6; 
    color: #fa8c16; 
  }
  &.completed { 
    background-color: #f6ffed; 
    color: #52c41a; 
  }
}

.empty-state {
  text-align: center;
  padding-top: 60px;
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
