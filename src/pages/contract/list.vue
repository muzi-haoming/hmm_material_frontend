<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-box">
        <text class="iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          placeholder="搜索合同名称或编号" 
          @confirm="handleSearch"
        />
        <text v-if="keyword" class="iconfont icon-close" @click="clearSearch"></text>
      </view>
    </view>

    <view class="list-container">
      <view 
        class="list-item" 
        v-for="(item, index) in list" 
        :key="item.id"
        @click="goEdit(item.id)"
      >
        <view class="item-content">
          <text class="item-name">{{ item.name }}</text>
          <text class="item-code">编号: {{ item.code }}</text>
          <text class="item-info">工地: {{ item.site_name }}</text>
          <text v-if="item.manufacturers && item.manufacturers.length > 0" class="item-info">
            厂家: {{ item.manufacturers.join('、') }}
          </text>
          <view class="item-meta">
            <text class="tag status" :class="getStatusClass(item)">{{ getStatusText(item) }}</text>
          </view>
        </view>
        <view class="item-actions">
          <text 
            class="iconfont icon-delete" 
            @click.stop="handleDelete(item)"
            v-if="currentUser?.is_admin || (item.creator === currentUser?.id && !item.is_confirmed)"
          ></text>
        </view>
      </view>
      
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text>暂无数据</text>
      </view>
    </view>

    <view 
      class="fab-add" 
      @click="goAdd"
      v-if="currentUser?.is_admin || (currentUser?.site_permissions && currentUser.site_permissions.length > 0)"
    >
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';
import { getBillStatus, BillStatusText } from '@/types';
import { getCurrentUser, canDo, hasPermission } from '@/utils/permission';

interface Contract {
  id: string;
  name: string;
  code: string;
  site_name: string;
  manufacturers: string[];
  is_confirmed: boolean;
  is_completed: boolean;
  creator: string;
}

const list = ref<Contract[]>([]);
const keyword = ref('');
const loading = ref(false);
const currentUser = ref<any>(null);

const fetchData = async () => {
  loading.value = true;
  currentUser.value = getCurrentUser();
  
  // 查询合同
  let query = supabase
    .from('contract')
    .select(`
      id, 
      name, 
      code, 
      is_confirmed, 
      is_completed,
      creator,
      site:site_id(name)
    `)
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.or(`name.ilike.%${keyword.value}%,code.ilike.%${keyword.value}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching contract:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
    loading.value = false;
    return;
  }

  // 查询关联的厂家
  if (data && data.length > 0) {
    const contractIds = data.map(c => c.id);
    const { data: relaData } = await supabase
      .from('contract_manufacturer_rela')
      .select('contract_id, manufacturer:manufacturer_id(name)')
      .in('contract_id', contractIds);

    // 组装数据
    list.value = data.map(contract => ({
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
      creator: contract.creator
    }));
  } else {
    list.value = [];
  }
  
  loading.value = false;
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

const goEdit = (id: string) => {
  uni.navigateTo({ url: `/pages/contract/detail?id=${id}` });
};

const handleDelete = async (item: Contract) => {
  if (!canDo('delete', item)) {
    uni.showToast({ title: '无权删除或状态不允许', icon: 'none' });
    return;
  }

  uni.showModal({
    title: '提示',
    content: '确定要删除该合同吗？',
    success: async (res) => {
      if (res.confirm) {
        // 先删除关联的厂家关系
        await supabase.from('contract_manufacturer_rela').delete().eq('contract_id', item.id);
        
        // 再删除合同
        const { error } = await supabase.from('contract').delete().eq('id', item.id);
        if (error) {
          uni.showToast({ title: '删除失败', icon: 'none' });
        } else {
          uni.showToast({ title: '已删除', icon: 'success' });
          fetchData();
        }
      }
    }
  });
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

.search-input-box {
  background-color: #f0f0f0;
  border-radius: 20px;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  
  .search-input {
    flex: 1;
    font-size: 14px;
    margin-left: 10px;
  }
}

.list-container {
  padding: 15px;
}

.list-item {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  
  &:active {
    background-color: #fafafa;
  }
}

.item-content {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.item-code {
  font-size: 13px;
  color: #999;
  margin-bottom: 3px;
}

.item-info {
  font-size: 13px;
  color: #666;
  margin-bottom: 3px;
}

.item-meta {
  display: flex;
  align-items: center;
  margin-top: 5px;
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

.item-actions {
  padding: 10px;
}

.icon-delete {
  color: #ff4d4f;
  font-size: 20px;
}

.empty-state {
  text-align: center;
  padding-top: 50px;
  color: #999;
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
