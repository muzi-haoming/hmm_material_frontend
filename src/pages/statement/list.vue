<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-box">
        <text class="iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          placeholder="搜索对账单号" 
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
          <view class="item-header-row">
             <text class="item-name">{{ item.code }}</text>
             <text class="status-tag" :class="getStatusClass(item)">{{ getStatusText(item) }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">合同：</text>
            <text class="detail-value">{{ item.contract_name || '未知合同' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">期间：</text>
            <text class="detail-value">{{ formatDate(item.start_time) }} 至 {{ formatDate(item.end_time) }}</text>
          </view>
        </view>
        <view class="item-actions">
          <text class="iconfont icon-delete" @click.stop="handleDelete(item)" v-if="!item.is_confirmed"></text>
        </view>
      </view>
      
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text>暂无数据</text>
      </view>
    </view>

    <view class="fab-add" @click="goAdd">
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

interface Statement {
  id: string;
  code: string;
  contract_id: string;
  contract_name?: string;
  start_time: string;
  end_time: string;
  is_confirmed: boolean;
  is_completed: boolean;
}

const list = ref<Statement[]>([]);
const keyword = ref('');
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  let query = supabase
    .from('statement')
    .select('*, contract:contract_id(name)')
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.ilike('code', `%${keyword.value}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching statement:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } else {
    // 映射合同名称
    list.value = (data || []).map((item: any) => ({
      ...item,
      contract_name: item.contract?.name
    }));
  }
  loading.value = false;
};

const handleSearch = () => {
  fetchData();
};

const clearSearch = () => {
  keyword.value = '';
  fetchData();
};

const goAdd = () => {
  uni.navigateTo({ url: '/pages/statement/edit' });
};

const goEdit = (id: string) => {
  uni.navigateTo({ url: `/pages/statement/detail?id=${id}` });
};

const getStatusText = (item: any) => {
  if (item.is_completed) return '已完成';
  if (item.is_confirmed) return '已确认';
  return '待确认';
};

const getStatusClass = (item: any) => {
  if (item.is_completed) return 'status-completed';
  if (item.is_confirmed) return 'status-confirmed';
  return 'status-unconfirmed';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

const handleDelete = async (item: any) => {
  if (item.is_confirmed) {
      return uni.showToast({ title: '已确认的单据无法删除', icon: 'none' });
  }
  
  uni.showModal({
    title: '提示',
    content: '删除对账单将同时删除关联明细，确定吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中' });
        // 尝试删除父项，依赖级联或手动删除
        // 手动删除子项以防万一
        await supabase.from('statement_material_detail').delete().eq('statement_id', item.id);
        await supabase.from('statement_other_expenses_detail').delete().eq('statement_id', item.id);
        await supabase.from('statement_invoice_rela').delete().eq('statement_id', item.id);
        
        const { error } = await supabase.from('statement').delete().eq('id', item.id);
        
        uni.hideLoading();
        if (error) {
           uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
        } else {
           uni.showToast({ title: '已删除', icon: 'success' });
           fetchData();
        }
      }
    }
  });
};

onShow(() => {
  fetchData();
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
}

.item-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.detail-row {
  display: flex;
  font-size: 13px;
  margin-bottom: 4px;
  line-height: 1.4;
  
  .detail-label {
    color: #999;
    width: 48px;
    flex-shrink: 0;
  }
  
  .detail-value {
    color: #666;
    flex: 1;
    word-break: break-all;
  }
}

.item-sub {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.item-detail {
  font-size: 13px;
  color: #6739b6;
  font-weight: bold;
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

.item-header-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 5px;
}

.status-tag {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    
    &.status-unconfirmed { background: #fff7e6; color: #fa8c16; }
    &.status-confirmed { background: #e6f7ff; color: #1890ff; }
    &.status-completed { background: #f6ffed; color: #52c41a; }
}
</style>
