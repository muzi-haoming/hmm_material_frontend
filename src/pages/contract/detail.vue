<template>
  <view class="container">
    <!-- 头部状态 (Gradient Header) -->
    <view class="status-header" :class="statusClass">
      <view class="status-text">{{ statusText }}</view>
      <view class="order-code">NO. {{ contract?.code || '加载中...' }}</view>
    </view>

    <!-- 选项卡 -->
    <view class="tabs">
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 0 }" 
        @click="currentTab = 0"
      >
        订单记录
      </view>
      <view 
        class="tab-item" 
        :class="{ active: currentTab === 1 }" 
        @click="currentTab = 1"
      >
        基本信息
      </view>
    </view>

    <!-- 订单列表 (Tab 0) -->
    <view v-if="currentTab === 0" class="tab-content">
      <view v-if="orders.length === 0" class="empty-state">
        <text>暂无订单</text>
      </view>
      <view class="order-list" v-else>
        <view 
          class="order-item" 
          v-for="order in orders" 
          :key="order.id"
          @click="goOrderDetail(order.id)"
        >
          <view class="order-header">
            <text class="order-code">{{ order.code }}</text>
            <text class="order-status" :class="getOrderStatusClass(order)">
              {{ getOrderStatusText(order) }}
            </text>
          </view>
          <view class="order-body">
            <view class="detail-row">
              <text class="detail-label">产品：</text>
              <text class="detail-value">{{ order.product?.name }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">数量：</text>
              <text class="detail-value">{{ order.quantity }} {{ order.product?.unit }}</text>
            </view>
            <text class="order-time">{{ formatDate(order.create_time) }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 基本信息 (Tab 1) -->
    <view v-if="currentTab === 1" class="tab-content">
      <view class="card">
        <view class="card-header">
          <view class="card-title">基础合同信息</view>
          <view class="card-actions">
            <text class="action-btn text-primary" @click="goEdit" v-if="canEdit">编辑</text>
            <text class="action-btn text-success" @click="handleConfirm" v-if="canConfirm">确认</text>
            <template v-if="canManageConfirmed">
              <text class="action-btn text-warning" @click="handleUnconfirm">取消确认</text>
              <text class="action-btn text-danger" @click="handleComplete">完成</text>
            </template>
            <text class="action-btn text-warning" @click="handleUncomplete" v-if="canUncomplete">取消完成</text>
          </view>
        </view>

        <view class="info-row">
          <text class="label">名称</text>
          <text class="value">{{ contract?.name }}</text>
        </view>
        <view class="info-row">
          <text class="label">工地</text>
          <text class="value">{{ contract?.site?.name }}</text>
        </view>
        <view class="info-row">
          <text class="label">代理人</text>
          <text class="value">{{ agentName }}</text>
        </view>
        <view class="info-row">
          <text class="label">创建时间</text>
          <text class="value">{{ formatDate(contract?.create_time) }}</text>
        </view>
        <view class="info-row">
          <text class="label">关联厂家</text>
          <view class="value tags-container">
            <text v-for="m in manufacturers" :key="m.id" class="tag">{{ m.manufacturer?.name }}</text>
            <text v-if="manufacturers.length === 0" class="empty-text">无 (或无权查看)</text>
          </view>
        </view>
      </view>
    </view>

    <view class="fab-add" @click="goCreateOrder" v-if="canCreateOrder && currentTab === 0">
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { getBillStatus, BillStatusText } from '@/types';
import { getCurrentUser, canDo } from '@/utils/permission';

const contractId = ref('');
const contract = ref<any>(null);
const manufacturers = ref<any[]>([]);
const orders = ref<any[]>([]);
const currentTab = ref(0);
const currentUser = ref<any>(null);

onLoad((options: any) => {
  if (options.id) {
    contractId.value = options.id;
  }
});

onShow(() => {
  if (contractId.value) {
    loadData();
  }
});

const loadData = async () => {
  currentUser.value = getCurrentUser();
  uni.showLoading({ title: '加载中' });

  // 1. 获取合同详情
  const { data, error } = await supabase
    .from('contract')
    .select(`
      *,
      site:site_id(name),
      agent:agent_id(nickname, full_name)
    `)
    .eq('id', contractId.value)
    .single();

  if (error || !data) {
    uni.hideLoading();
    uni.showToast({ title: '加载失败', icon: 'none' });
    return;
  }

  contract.value = data;

  // 2. 获取关联厂家 (可能会为空，视权限而定)
  const { data: mfrData } = await supabase
    .from('contract_manufacturer_rela')
    .select('manufacturer:manufacturer_id(name, id)')
    .eq('contract_id', contractId.value);
    
  manufacturers.value = mfrData || [];

  // 3. 获取订单列表
  const { data: orderData } = await supabase
    .from('contract_order')
    .select(`
      id, code, create_time, is_confirmed, is_completed, quantity,
      product:product_id(name, unit)
    `)
    .eq('contract_id', contractId.value)
    .order('create_time', { ascending: false });
    
  orders.value = orderData || [];

  uni.hideLoading();
};

const statusClass = computed(() => {
  if (!contract.value) return '';
  if (contract.value.is_completed) return 'completed';
  if (contract.value.is_confirmed) return 'processing';
  return 'pending';
});

const statusText = computed(() => {
  if (!contract.value) return '';
  const s = getBillStatus(contract.value.is_confirmed, contract.value.is_completed);
  return BillStatusText[s];
});

const agentName = computed(() => {
  if (!contract.value?.agent) return '未知';
  return contract.value.agent.nickname || contract.value.agent.full_name || '未知';
});

const canEdit = computed(() => {
  if (!contract.value || contract.value.is_confirmed) return false;
  return !!currentUser.value?.is_admin;
});

const canConfirm = computed(() => {
    return canEdit.value;
});

// 是否可以进行 "已确认" 状态下的操作 (取消确认/归档)
const canManageConfirmed = computed(() => {
  if (!contract.value || !contract.value.is_confirmed || contract.value.is_completed) return false;
  return !!currentUser.value?.is_admin;
});

const canCreateOrder = computed(() => {
  if (!contract.value || !contract.value.is_confirmed || contract.value.is_completed) return false;
  
  if (currentUser.value?.is_admin) return true;
  
  const isOwnerOrAgent = contract.value.creator === currentUser.value?.id || contract.value.agent_id === currentUser.value?.id;
  const hasSitePerm = currentUser.value?.site_permissions?.includes(contract.value.site_id);
  
  return isOwnerOrAgent || hasSitePerm;
});

const canUncomplete = computed(() => {
  if (!contract.value || !contract.value.is_completed) return false;
  return !!currentUser.value?.is_admin;
});

const getOrderStatusText = (order: any) => {
    // 简单状态显示，具体逻辑需与 order 定义一致
    if (order.is_completed) return '已完成';
    if (order.is_confirmed) return '进行中';
    return '待确认';
};

const getOrderStatusClass = (order: any) => {
    if (order.is_completed) return 'text-green';
    if (order.is_confirmed) return 'text-blue';
    return 'text-orange';
};

const formatDate = (isoString: string) => {
  if (!isoString) return '';
  return isoString.split('T')[0];
};

const goEdit = () => {
  uni.navigateTo({ url: `/pages/contract/edit?id=${contractId.value}` });
};

const goCreateOrder = () => {
  uni.navigateTo({ url: `/pages/contract-order/create?contractId=${contractId.value}` });
};

const goOrderDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/contract-order/detail?id=${id}` });
};

const handleConfirm = async () => {
    uni.showLoading({ title: '确认中' });
    const { error }: any = await supabase
        .from('contract')
        .update({ is_confirmed: true })
        .eq('id', contractId.value);
        
    uni.hideLoading();
    
    if (error) {
        uni.showToast({ title: '确认失败: ' + (error.message || '未知错误'), icon: 'none' });
    } else {
        uni.showToast({ title: '已确认', icon: 'success' });
        setTimeout(() => loadData(), 1500);
    }
};

const handleComplete = () => {
    uni.showModal({
        title: '提示',
        content: '确定要归档吗？归档后将不能新建订单。',
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '归档中' });
                const { error }: any = await supabase
                    .from('contract')
                    .update({ is_completed: true })
                    .eq('id', contractId.value);
                    
                uni.hideLoading();
                
                if (error) {
                     // Handle Error similar to others
                    let msg = error.message || error.details || error.hint;
                    if (!msg && error.data) msg = error.data.message;
                    uni.showToast({ title: '归档失败: ' + (msg || '未知错误'), icon: 'none' });
                } else {
                    uni.showToast({ title: '已归档', icon: 'success' });
                    setTimeout(() => loadData(), 1500);
                }
            }
        }
    });
};

const handleUnconfirm = () => {
    uni.showModal({
        title: '提示',
        content: '确定要取消确认状态吗？\n注意：如果合同下已有订单，可能无法取消。',
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '处理中' });
                const { error }: any = await supabase
                    .from('contract')
                    .update({ is_confirmed: false })
                    .eq('id', contractId.value);
                    
                uni.hideLoading();
                
                if (error) {
                    console.error('Cancel Confirm Error:', error);
                    // Handle Supabase error object (PostgREST specific or wrapped)
                    let msg = error.message || error.details || error.hint;
                    // In some uni-app environment, error might be the response object with 'data'
                    if (!msg && error.data) {
                        msg = error.data.message || error.data.details || error.data.hint;
                    }
                    if (!msg && typeof error === 'string') {
                         msg = error;
                    }
                    if (!msg) {
                        msg = '未知错误 (请查看控制台)';
                    }
                    
                    // 如果由于关联订单导致，给出更清晰的提示
                    if (msg && msg.includes('contract_order')) {
                        return uni.showToast({ title: '操作失败: 存在关联订单，请先删除订单', icon: 'none', duration: 3000 });
                    }
                    uni.showToast({ title: '操作失败: ' + msg, icon: 'none' });
                } else {
                    uni.showToast({ title: '操作成功', icon: 'success' });
                    // 延迟刷新，让用户看到成功提示
                    setTimeout(() => {
                        loadData();
                    }, 1500);
                }
            }
        }
    });
};

const handleUncomplete = () => {
    uni.showModal({
        title: '提示',
        content: '确定要取消归档吗？取消后可以继续创建订单。',
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '处理中' });
                const { error }: any = await supabase
                    .from('contract')
                    .update({ is_completed: false })
                    .eq('id', contractId.value);
                    
                uni.hideLoading();
                
                if (error) {
                    console.error('Cancel Complete Error:', error);
                    let msg = error.message || error.details || error.hint;
                    if (!msg && error.data) {
                        msg = error.data.message || error.data.details || error.data.hint;
                    }
                    if (!msg) msg = '未知错误';
                    
                    uni.showToast({ title: '操作失败: ' + msg, icon: 'none' });
                } else {
                    uni.showToast({ title: '操作成功', icon: 'success' });
                    // 延迟刷新，让用户看到成功提示
                    setTimeout(() => {
                        loadData(); 
                    }, 1500);
                }
            }
        }
    });
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 15px;
  padding-bottom: 80px;
}

.status-header {
  padding: 20px;
  border-radius: 12px;
  color: #fff;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #ccc;
  
  &.pending { background: linear-gradient(135deg, #1890ff, #36cfc9); }
  &.processing { background: linear-gradient(135deg, #fa8c16, #ffd666); }
  &.completed { background: linear-gradient(135deg, #52c41a, #95de64); }
  
  .status-text { font-size: 20px; font-weight: bold; }
  .order-code { font-size: 14px; opacity: 0.9; }
}

.card {
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
  
  .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      border-bottom: 1px solid #f0f0f0;
      padding-bottom: 8px;
  }
  
  .card-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    border-left: 4px solid #6739b6;
    padding-left: 10px;
  }
  
  .card-actions {
      display: flex;
      gap: 15px;
      align-items: center;
  }
  
  .action-btn {
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      
      &:active {
        opacity: 0.7;
      }
  }
  
  .text-primary { color: #6739b6; }
  .text-warning { color: #fa8c16; }
  .text-success { color: #52c41a; }
  .text-danger { color: #ff4d4f; }
  
  .info-row {
    display: flex;
    margin-bottom: 10px;
    font-size: 14px;
    
    .label { color: #999; width: 80px; }
    .value { color: #333; flex: 1; }
    
    .tags-container {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }
  }
}

.tag {
  background: #f0f0f0;
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  color: #666;
}

.empty-text {
  color: #999;
  font-size: 13px;
}

// Extracted tabs CSS here
.tabs {
  display: flex;
  background: #fff;
  border-bottom: 1px solid #eee;
  margin-bottom: 15px; /* Added margin for separation */
  border-radius: 8px; /* Slightly rounded edges to blend nicely */
}

.tab-item {
  flex: 1;
  text-align: center;
  padding: 15px 0;
  font-size: 15px;
  color: #666;
  position: relative;
  
  &.active {
    color: #6739b6;
    font-weight: 500;
    
    &::after {
      content: '';
      position: absolute;
      bottom: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 40px;
      height: 3px;
      background-color: #6739b6;
      border-radius: 3px;
    }
  }
}

.tab-content {
  padding: 0;
}

.order-item {
  background: #f9f9f9;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 10px;
  
  .order-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  
  .order-code {
    font-weight: 500;
    color: #333;
  }
  
  .text-green { color: #52c41a; }
  .text-blue { color: #1890ff; }
  .text-orange { color: #fa8c16; }
  
  .order-body {
    font-size: 13px;
    color: #666;
    display: flex;
    flex-direction: column;
    gap: 4px;
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
  
  .order-time {
    color: #999;
    font-size: 12px;
    margin-top: 4px;
  }
}

.empty-state {
  text-align: center;
  padding: 40px 0;
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
