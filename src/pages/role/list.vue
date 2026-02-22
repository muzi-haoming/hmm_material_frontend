<template>
  <view class="container">
    <view class="search-bar">
      <input class="search-input" type="text" v-model="keyword" placeholder="搜索角色名称/编码" confirm-type="search" @confirm="loadData" />
      <button class="search-btn" @click="loadData">搜索</button>
    </view>
    
    <view class="list-container">
      <view class="list-item" v-for="(item, index) in list" :key="item.id" @click="goEdit(item.id)">
        <view class="item-header">
          <text class="item-title">{{ item.name }}</text>
          <text class="item-code">{{ item.code }}</text>
        </view>
        <view class="item-footer">
            <text class="time">创建于 {{ formatDate(item.create_time) }}</text>
            <view class="actions">
                <text class="iconfont icon-delete action-btn" @click.stop="handleDelete(item)"></text>
            </view>
        </view>
      </view>
      <view v-if="list.length === 0 && !loading" class="empty-tip">暂无数据</view>
    </view>
    
    <view class="fab-add" @click="goAdd">
      <text class="iconfont icon-add"></text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { supabase } from '@/utils/supabase';

const keyword = ref('');
const list = ref<any[]>([]);
const loading = ref(false);

onShow(async () => {
    uni.showLoading({ title: '加载中...', mask: true });
    try {
        await loadData();
    } finally {
        uni.hideLoading();
    }
});

const loadData = async () => {
    loading.value = true;
    let query = supabase.from('role').select('*').order('create_time', { ascending: false });
    
    if (keyword.value) {
        query = query.or(`name.ilike.%${keyword.value}%,code.ilike.%${keyword.value}%`);
    }
    
    const { data, error } = await query;
    loading.value = false;
    
    if (error) {
        uni.showToast({ title: '加载失败: ' + error.message, icon: 'none' });
    } else {
        list.value = data || [];
    }
};

const goAdd = () => {
    uni.navigateTo({ url: '/pages/role/edit' });
};

const goEdit = (id: string) => {
    uni.navigateTo({ url: `/pages/role/edit?id=${id}` });
};

const handleDelete = async (item: any) => {
    // Prevent deleting admin or system roles if necessary, though RLS/Triggers might handle it.
    // Ideally we check if it is used in profiles.
    
    uni.showModal({
        title: '提示',
        content: `确定删除角色 "${item.name}" 吗？`,
        success: async (res) => {
            if (res.confirm) {
                const { error } = await supabase.from('role').delete().eq('id', item.id);
                if (error) {
                    uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
                } else {
                    uni.showToast({ title: '删除成功', icon: 'success' });
                    loadData();
                }
            }
        }
    });
};

const formatDate = (str: string) => {
    if (!str) return '';
    return str.replace('T', ' ').substring(0, 16);
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 15px;
  padding-bottom: 80px;
}

.search-bar {
  display: flex;
  margin-bottom: 15px;
  
  .search-input {
    flex: 1;
    height: 40px;
    background-color: #fff;
    border-radius: 20px;
    padding: 0 15px;
    font-size: 14px;
    margin-right: 10px;
  }
  
  .search-btn {
    width: 60px;
    height: 40px;
    line-height: 40px;
    background-color: #6739b6;
    color: #fff;
    font-size: 14px;
    border-radius: 20px;
    padding: 0;
  }
}

.list-item {
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 12px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.02);
  
  &:active {
      background-color: #f9f9f9;
  }
  
  .item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      
      .item-title {
          font-size: 16px;
          font-weight: bold;
          color: #333;
      }
      
      .item-code {
          font-size: 12px;
          color: #666;
          background-color: #f0ebfa;
          padding: 2px 6px;
          border-radius: 4px;
      }
  }
  
  .item-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .time {
          font-size: 12px;
          color: #999;
      }
      
      .actions {
          .action-btn {
              font-size: 18px;
              color: #999;
              padding: 5px;
              
              &:active { color: #ff4d4f; }
          }
      }
  }
}

.empty-tip {
    text-align: center;
    color: #999;
    padding: 30px;
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
