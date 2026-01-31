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
          <text class="item-name">{{ item.name }} ({{ item.username }})</text>
          <text class="item-detail">角色: {{ item.role_name || '未分配' }}</text>
        </view>
        <view class="item-arrow">
          <text class="iconfont icon-right">></text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

interface User {
  id: string;
  username: string;
  name: string;
  role_id: string;
  role_name?: string;
}

const list = ref<User[]>([]);
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from('user')
    .select('*, user_role:role_id(name)')
    .order('create_time', { ascending: false });
  
  if (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } else {
    list.value = (data || []).map((item: any) => ({
      ...item,
      role_name: item.user_role?.name
    }));
  }
  loading.value = false;
};

const goEdit = (id: string) => {
  uni.navigateTo({ url: `/pages/user/edit?id=${id}` });
};

onShow(() => {
  fetchData();
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
