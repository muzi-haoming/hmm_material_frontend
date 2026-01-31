<template>
  <view class="container">
    <!-- Header -->
    <view class="header-bg">
      <view class="title-bar">
        <text class="app-title">HK 综合管理系统</text>
      </view>
    </view>

    <!-- User Card -->
    <view class="user-card">
      <view class="avatar">
        <text class="iconfont icon-person"></text> <!-- Placeholder -->
      </view>
      <view class="user-info">
        <text class="name">{{ userInfo.name || '未登录' }}</text>
        <text class="role">{{ userInfo.role_name || '普通用户' }}</text>
      </view>
    </view>

    <!-- Menu List -->
    <view class="menu-list">
      <view class="menu-item" v-if="isAdmin" @click="navigateTo('/pages/user/list')">
        <text class="menu-text">用户管理</text>
      </view>
      <view class="menu-item" v-if="isAdmin" @click="navigateTo('/pages/user-role/list')">
        <text class="menu-text">用户角色管理</text>
      </view>
      <view class="menu-item" @click="navigateTo('/pages/profile/password')">
        <text class="menu-text">重置密码</text>
      </view>
      <view class="menu-item highlight" @click="handleLogout">
        <text class="menu-text">退出登陆</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

const userInfo = ref<any>({});

const isAdmin = computed(() => {
  return userInfo.value.role_code === 'admin';
});

onShow(async () => {
    // 1. Try to get from storage first for immediate display
    const storedUser = uni.getStorageSync('userInfo');
    if (storedUser) {
        userInfo.value = storedUser;
    } else {
        // Redirect to login if no user info? Or just show guest state.
        // uni.reLaunch({ url: '/pages/login/login' });
    }

    // 2. Refresh from DB (incase role changed)
    if (storedUser && storedUser.id) {
        const { data } = await supabase
            .from('user')
            .select('*, user_role:role_id(code, name)')
            .eq('id', storedUser.id)
            .single();
        
        if (data) {
             const freshUser = {
                ...data,
                role_code: data.user_role?.code,
                role_name: data.user_role?.name
              };
              userInfo.value = freshUser;
              uni.setStorageSync('userInfo', freshUser);
        }
    }
});

const navigateTo = (url: string) => {
    uni.navigateTo({ url });
};

const handleLogout = async () => {
    uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: async (res) => {
            if (res.confirm) {
                // Clear any stored state
                // await supabase.auth.signOut(); 
                uni.reLaunch({ url: '/pages/login/login' });
            }
        }
    });
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.header-bg {
  height: 25vh;
  background: linear-gradient(135deg, #6739b6, #8a4fd3);
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  padding-top: 60px;
  box-sizing: border-box;
}

.title-bar {
  text-align: center;
}

.app-title {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

.user-card {
  position: absolute;
  top: 18vh;
  left: 15px;
  right: 15px;
  background: #fff;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.avatar {
  width: 60px;
  height: 60px;
  background-color: #999;
  border-radius: 50%;
  margin-right: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.user-info {
  display: flex;
  flex-direction: column;
}

.name {
  font-size: 20px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.role {
  font-size: 14px;
  color: #666;
}

.menu-list {
  position: absolute;
  top: 32vh; /* Adjust based on user card height */
  left: 15px;
  right: 15px;
  background: #fff;
  border-radius: 15px;
  padding: 10px 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
}

.menu-item {
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  
  &:last-child {
    border-bottom: none;
  }
  
  &.highlight .menu-text {
    color: #6739b6; /* Or make it standard black */
  }
}

.menu-text {
  font-size: 16px;
  color: #333;
}
</style>
