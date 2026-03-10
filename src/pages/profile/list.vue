<template>
  <view class="container">
    <view class="list-container">
      <view 
        class="list-item" 
        v-for="(item, index) in list" 
        :key="item.id"
        @click="goEdit(item.id)"
      >
        <view class="item-content">
          <text class="item-name">{{ item.name }} ({{ item.nickname }})</text>
          <view class="detail-row">
            <text class="detail-label">角色：</text>
            <text class="detail-value">{{ item.role_name || '未分配' }}</text>
          </view>
        </view>
        <view class="item-arrow">
          <text class="iconfont icon-right"></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

interface Profile {
  id: string;
  nickname: string;
  name: string;
  role_id: string;
  role_name?: string;
  avatar_url?: string;
}

const list = ref<Profile[]>([]);
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  // Refactored: Query from 'profile' table instead of 'user'
  const { data, error } = await supabase
    .from('profile')
    .select('*, role:role_id(name)')
    .order('full_name', { ascending: true });
  
  if (error) {
    uni.showToast({ title: '加载失败: ' + error.message, icon: 'none' });
    console.error('Fetch Profiles Error:', error);
  } else {
    list.value = (data || []).map((item: any) => ({
      ...item,
      name: item.full_name || item.nickname || '未设置姓名',
      role_name: item.role?.name
    }));
  }
  loading.value = false;
};

const goEdit = (id: string) => {
  // Refactored: Navigate to 'profile/edit'
  uni.navigateTo({ url: `/pages/profile/edit?id=${id}` });
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
    color: #6739b6;
    font-weight: bold;
    flex: 1;
    word-break: break-all;
  }
}

.item-detail {
  font-size: 13px;
  color: #666;
  font-weight: bold;
  color: #6739b6;
}

.item-arrow {
  color: #ccc;
}
</style>
