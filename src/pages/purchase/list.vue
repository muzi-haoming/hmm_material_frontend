<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-box">
        <text class="iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          placeholder="搜索采购单号" 
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
          <text class="item-name">{{ item.code }}</text>
          <view class="detail-row">
            <text class="detail-label">付款：</text>
            <text class="detail-value">{{ item.payer?.name || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">收款：</text>
            <text class="detail-value">{{ item.payee?.name || '-' }}</text>
          </view>
          <view class="detail-row">
            <text class="detail-label">数量：</text>
            <text class="detail-value">{{ item.quantity }}</text>
          </view>
            <text class="item-status" :class="getStatus(item).class">{{ getStatus(item).text }}</text>
        </view>
        <view class="item-actions">
          <text class="iconfont icon-delete" @click.stop="handleDelete(item.id)"></text>
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

interface Purchase {
  id: string;
  code: string;
  quantity: number;
  is_confirmed: boolean;
  is_completed: boolean;
  payer?: { name: string };
  payee?: { name: string };
}

const list = ref<Purchase[]>([]);
const keyword = ref('');
const loading = ref(false);

const getStatus = (item: Purchase) => {
  if (item.is_completed) return { text: '已完成', class: 'completed' };
  if (item.is_confirmed) return { text: '已确认', class: 'confirmed' };
  return { text: '待确认', class: 'pending' };
};

const fetchData = async () => {
  loading.value = true;
  let query = supabase
    .from('general_purchase')
    .select('id, code, quantity, is_confirmed, is_completed, payer:payer_manufacturer_id(name), payee:payee_manufacturer_id(name)')
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.ilike('code', `%${keyword.value}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching purchase:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } else {
    // Transform data to ensure types match
    list.value = (data || []).map((item: any) => ({
        id: item.id,
        code: item.code,
        quantity: item.quantity,
        is_confirmed: item.is_confirmed,
        is_completed: item.is_completed,
        payer: Array.isArray(item.payer) ? item.payer[0] : item.payer,
        payee: Array.isArray(item.payee) ? item.payee[0] : item.payee
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
  uni.navigateTo({ url: '/pages/purchase/edit' });
};

const goEdit = (id: string) => {
  uni.navigateTo({ url: `/pages/purchase/edit?id=${id}` });
};

const handleDelete = async (id: string) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该采购单吗？',
    success: async (res) => {
      if (res.confirm) {
        const { error } = await supabase.from('general_purchase').delete().eq('id', id);
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

.item-detail {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
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
.item-status {
    font-size: 12px;
    color: #fa8c16;
    margin-top: 4px;

    &.confirmed {
        color: #1890ff;
    }

    &.completed {
        color: #52c41a;
    }
}
</style>
