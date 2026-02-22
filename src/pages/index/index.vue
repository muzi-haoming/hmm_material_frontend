<template>
  <view class="container">
    <!-- 顶部 -->
    <view class="header-bg">
      <view class="title-bar">
        <text class="app-title">工作台</text>
      </view>
      <view class="user-info" v-if="userInfo">
        <text class="greeting">你好，{{ userInfo.name }}</text>
        <text class="role-badge">{{ userInfo.role_name }}</text>
      </view>
    </view>

    <!-- 状态卡片 (根据角色动态显示) -->
    <view class="status-card">
        <block v-if="isAgent || isAdmin">
            <view class="status-item" @click="navTo('/pages/statement/list?status=confirmed')">
                <text class="count">{{ stats.pendingConfirm || 0 }}</text>
                <text class="label">待确认</text>
            </view>
            <view class="status-item" @click="navTo('/pages/statement/list?status=completed')">
                <text class="count">{{ stats.pendingComplete || 0 }}</text>
                <text class="label">待完成</text>
            </view>
        </block>
        <block v-if="isManufacturer || isAdmin">
             <view class="status-item" @click="navTo('/pages/stock/dashboard')">
                <text class="count warning">{{ stats.stockAlert || 0 }}</text>
                <text class="label">库存预警</text>
             </view>
        </block>
        <!-- 通用 -->
        <view class="status-item" @click="navToTodo">
            <text class="count">{{ stats.todoCount || 0 }}</text>
            <text class="label">我的待办</text>
        </view>
    </view>

    <!-- 待办事项 -->
    <view class="section-title">最近待办</view>
    <view class="todo-list">
        <view class="todo-item" v-for="(item, index) in todoList" :key="index" @click="handleTodo(item)">
            <view class="todo-left">
                <text class="todo-title">{{ item.todo_title }}</text>
                <text class="todo-time">{{ formatDate(item.create_time) }}</text>
            </view>
            <view class="todo-right">
                <text class="todo-btn">处理</text>
            </view>
        </view>
        <view v-if="todoList.length === 0" class="empty-tip">
            <text>暂无待办事项</text>
        </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { getCurrentUser, refreshUserPermissions, type UserInfo } from '@/utils/permission';
import { supabase } from '@/utils/supabase';

const userInfo = ref<UserInfo | null>(null);
const stats = ref({
    pendingConfirm: 0,
    pendingComplete: 0,
    stockAlert: 0,
    todoCount: 0
});
const todoList = ref<any[]>([]);

const isAdmin = computed(() => userInfo.value?.is_admin || false);
const isAgent = computed(() => isAdmin.value || (userInfo.value?.site_permissions && userInfo.value?.site_permissions.length > 0));
const isManufacturer = computed(() => isAdmin.value || (userInfo.value?.manufacturer_permissions && userInfo.value?.manufacturer_permissions.length > 0));

onShow(async () => {
    uni.showLoading({ title: '加载中...', mask: true });
    try {
        await loadUser();
        await loadStats();
        await loadTodos();
    } finally {
        uni.hideLoading();
    }
});

const loadUser = async () => {
    // 尝试先读缓存
    let user = getCurrentUser();
    if (!user) {
        // 没缓存尝试刷新
        try {
            user = await refreshUserPermissions();
        } catch (e) {
            // 未登录，跳转登录
            uni.reLaunch({ url: '/pages/login/login' });
            return;
        }
    }
    userInfo.value = user;
    
    // 如果是 H5 Mock 模式可能没有 refreshUserPermissions 的有效返回，需防御
    if(!userInfo.value) {
         uni.reLaunch({ url: '/pages/login/login' });
    }
};

const loadStats = async () => {
    if (!userInfo.value) return;

    // TODO: 实现真实的统计查询
    // 暂时先查待办数量
    const { count, error } = await supabase
        .from('todo')
        .select('*', { count: 'exact', head: true })
        .eq('is_completed', false);
    
    if (!error) {
        stats.value.todoCount = count || 0;
    }
    
    // 模拟数据
    if (isAgent.value) {
        stats.value.pendingConfirm = 2; // Mock
    }
     if (isManufacturer.value) {
        stats.value.stockAlert = 1; // Mock
    }
};

const loadTodos = async () => {
    const { data, error } = await supabase
        .from('todo')
        .select('*')
        .eq('is_completed', false)
        .order('create_time', { ascending: false })
        .limit(5);
        
    if (!error && data) {
        todoList.value = data;
    }
};

const navTo = (url: string) => {
    uni.navigateTo({ url });
};

const navToTodo = () => {
    // 跳转到待办列表页（需后续实现）
    uni.showToast({ title: '查看所有待办', icon: 'none' });
};

const handleTodo = (item: any) => {
    if (item.todo_path) {
        uni.navigateTo({ url: item.todo_path });
    } else {
         uni.showToast({ title: '该待办无跳转链接', icon: 'none' });
    }
};

const formatDate = (str: string) => {
    if (!str) return '';
    return str.split('T')[0];
}

</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.header-bg {
  height: 220px;
  background: linear-gradient(135deg, #6739b6, #8a4fd3);
  padding: 60px 20px 20px;
  box-sizing: border-box;
  border-bottom-left-radius: 24px;
  border-bottom-right-radius: 24px;
  color: #fff;
  
  .title-bar {
      margin-bottom: 20px;
      .app-title {
          font-size: 20px;
          font-weight: 600;
      }
  }
  
  .user-info {
      .greeting {
          display: block;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 5px;
      }
      .role-badge {
          font-size: 12px;
          background: rgba(255,255,255,0.2);
          padding: 2px 8px;
          border-radius: 10px;
      }
  }
}

.status-card {
  margin: -60px 20px 20px;
  background: #fff;
  border-radius: 16px;
  padding: 20px 0;
  display: flex;
  justify-content: space-around;
  box-shadow: 0 4px 16px rgba(103, 57, 182, 0.1);
  position: relative;
  z-index: 10;
  
  .status-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      
      .count {
          font-size: 20px;
          font-weight: bold;
          color: #333;
          margin-bottom: 4px;
          &.warning {
              color: #ff6b6b;
          }
      }
      .label {
          font-size: 12px;
          color: #999;
      }
  }
}

.section-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    padding: 0 20px;
    margin-bottom: 12px;
    margin-top: 24px;
}

.todo-list {
    padding: 0 20px;
    
    .todo-item {
        background: #fff;
        padding: 16px;
        border-radius: 12px;
        margin-bottom: 12px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        box-shadow: 0 2px 6px rgba(0,0,0,0.02);
        
        .todo-left {
            display: flex;
            flex-direction: column;
            
            .todo-title {
                font-size: 14px;
                color: #333;
                margin-bottom: 4px;
                font-weight: 500;
            }
            .todo-time {
                font-size: 12px;
                color: #999;
            }
        }
        
        .todo-btn {
            font-size: 12px;
            color: #6739b6;
            background: rgba(103, 57, 182, 0.1);
            padding: 4px 12px;
            border-radius: 12px;
        }
    }
    
    .empty-tip {
        text-align: center;
        color: #999;
        font-size: 14px;
        padding: 20px;
    }
}
</style>
