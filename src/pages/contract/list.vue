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
          <view class="item-meta">
            <text class="tag status" :class="getStatusClass(item.status)">{{ getStatusText(item.status) }}</text>
          </view>
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

interface Contract {
  id: string;
  name: string;
  code: string;
  status: string;
}

const list = ref<Contract[]>([]);
const keyword = ref('');
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  let query = supabase
    .from('contract')
    .select('id, name, code, status')
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.or(`name.ilike.%${keyword.value}%,code.ilike.%${keyword.value}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching contract:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } else {
    list.value = data || [];
  }
  loading.value = false;
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    '1': '已签订',
    '0': '待签订',
    '3': '已终止',
    '2': '已完成'
  };
  return map[status] || status;
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = {
    '1': 'signed',
    '0': 'pending',
    '3': 'terminated',
    '2': 'completed'
  };
  return map[status] || '';
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
  uni.navigateTo({ url: `/pages/contract/edit?id=${id}` });
};

const handleDelete = async (id: string) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该合同吗？',
    success: async (res) => {
      if (res.confirm) {
        const { error } = await supabase.from('contract').delete().eq('id', id);
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

.item-code {
  font-size: 13px;
  color: #999;
  margin-bottom: 5px;
}

.item-meta {
  display: flex;
  align-items: center;
}

.tag {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 4px;
  background-color: #eee;
  color: #666;
  
  &.signed { background-color: #e6f7ff; color: #1890ff; }
  &.pending { background-color: #fff7e6; color: #fa8c16; }
  &.terminated { background-color: #fff1f0; color: #f5222d; }
  &.completed { background-color: #f6ffed; color: #52c41a; }
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
