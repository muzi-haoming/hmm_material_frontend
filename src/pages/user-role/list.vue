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
          <text class="item-name">{{ item.name }}</text>
          <view class="detail-row">
            <text class="detail-label">编码：</text>
            <text class="detail-value">{{ item.code }}</text>
          </view>
        </view>
        <view class="item-actions">
          <text class="iconfont icon-delete" @click.stop="handleDelete(item.id)"></text>
        </view>
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

interface UserRole {
  id: string;
  code: string;
  name: string;
}

const list = ref<UserRole[]>([]);
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from('user_role')
    .select('id, code, name')
    .order('code', { ascending: true });
  
  if (error) {
    uni.showToast({ title: '加载失败', icon: 'none' });
  } else {
    list.value = data || [];
  }
  loading.value = false;
};

const goAdd = () => {
  uni.navigateTo({ url: '/pages/user-role/edit' });
};

const goEdit = (id: string) => {
  uni.navigateTo({ url: `/pages/user-role/edit?id=${id}` });
};

const handleDelete = async (id: string) => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该角色吗？',
    success: async (res) => {
      if (res.confirm) {
        const { error } = await supabase.from('user_role').delete().eq('id', id);
        if (error) {
          uni.showToast({ title: '删除失败，可能已被用户使用', icon: 'none' });
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
  padding: 15px;
  padding-bottom: 80px;
}

.list-container {
  /* padding: 15px; */ 
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
}

.icon-delete {
  color: #ff4d4f;
  font-size: 20px;
  padding: 10px;
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
