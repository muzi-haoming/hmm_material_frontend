<template>
  <view class="container" v-if="order">
    <!-- Header Status -->
    <view class="status-header" :class="getStatusClass(order)">
      <view class="status-text">{{ getStatusText(order) }}</view>
      <view class="order-code">NO. {{ order.code }}</view>
    </view>

    <!-- Basic Info -->
    <view class="card">
      <view class="card-header">
        <view class="card-title">基本信息</view>
        <view class="card-actions">
           <!-- 编辑按钮: 未确认时显示 -->
           <text class="action-btn text-primary" v-if="order.is_confirmed === false && !order.is_completed && canEdit" @click="goEdit" style="margin-right: 15px;">编辑</text>

           <!-- 待确认: 显示确认按钮 -->
           <text class="action-btn text-primary" v-if="order.is_confirmed === false && !order.is_completed && canOperate" @click="confirmOrder">确认</text>
           
           <!-- 已确认: 显示取消确认和完成 -->
           <template v-if="order.is_confirmed && !order.is_completed && canOperate">
               <text class="action-btn text-warning" @click="unconfirmOrder">取消确认</text>
               <text class="action-btn text-success" v-if="canFinish" @click="finishOrder">完成</text>
           </template>

           <!-- 已完成: 显示取消完成 -->
           <text class="action-btn text-warning" v-if="order.is_completed && canOperate" @click="unfinishOrder">取消完成</text>
        </view>
      </view>
      <view class="info-row">
        <text class="label">合同</text>
        <text class="value">{{ order.contract?.name }}</text>
      </view>
      <view class="info-row">
        <text class="label">产品</text>
        <text class="value">{{ order.product?.name }}</text>
      </view>
      <view class="info-row">
        <text class="label">数量</text>
        <text class="value">{{ order.quantity }} {{ order.product?.unit }}</text>
      </view>
      <view class="info-row">
        <text class="label">下单时间</text>
        <text class="value">{{ formatDate(order.create_time) }}</text>
      </view>
    </view>

    <!-- Process Flow -->
    <view v-if="order.is_confirmed" class="flow-card">
      <view class="card-title" style="margin-bottom: 15px;">执行流程</view>
      
      <!-- Purchase Step (Only for Purchase Mode & Manufacturer) -->
      <template v-if="order.mode === 'purchase' && isManufacturerRelated">
        <view class="flow-step">
            <view class="step-header">
            <text class="step-title">1. 外协采购</text>
            <text class="step-status success" v-if="purchases.length > 0">{{ purchases.length }}笔</text>
            <text class="step-status warning" v-else>待采购</text>
            </view>
            <view class="step-content" v-for="item in purchases" :key="item.id">
              <view class="step-info">
                  <view class="detail-row">
                    <text class="detail-label">单号：</text>
                    <text class="detail-value">{{ item.code }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">供应商：</text>
                    <text class="detail-value">{{ item.payee_manufacturer?.name || '-' }}</text>
                  </view>
                  <view class="detail-row">
                    <text class="detail-label">数量：</text>
                    <text class="detail-value">{{ item.quantity }}</text>
                  </view>
              </view>
              <view class="step-action">
                  <text class="edit-btn" @click="handleEdit('purchase', item.id)">{{ order.is_completed ? '详情' : '编辑' }}</text>
                  <text class="delete-btn" v-if="!order.is_completed" @click="deleteItem('purchase', item.id)">删除</text>
              </view>
            </view>
        <button class="step-btn" v-if="canCreatePurchase && purchases.length === 0" @click="goCreatePurchase">创建采购单</button>
        </view>
      </template>

      <!-- Stock Out (Visible to Manufacturer or Admin) -->
      <view class="flow-step" v-if="isManufacturerRelated">
        <view class="step-header">
          <text class="step-title">{{ order.mode === 'purchase' ? '2. 厂家出库' : '1. 厂家出库' }}</text>
          <text class="step-status success" v-if="stockOuts.length > 0">{{ stockOuts.length }}笔</text>
          <text class="step-status warning" v-else>待出库</text>
        </view>
         <view class="step-content" v-for="item in stockOuts" :key="item.id">
          <view class="step-info">
            <view class="detail-row">
              <text class="detail-label">单号：</text>
              <text class="detail-value">{{ item.code }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">厂家：</text>
              <text class="detail-value">{{ item.manufacturer?.name || '-' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">数量：</text>
              <text class="detail-value">{{ item.quantity }}</text>
            </view>
          </view>
          <view class="step-action">
             <text class="edit-btn" @click="handleEdit('stock_out', item.id)">{{ order.is_completed ? '详情' : '编辑' }}</text>
             <text class="delete-btn" v-if="!order.is_completed" @click="deleteItem('stock_out', item.id)">删除</text>
          </view>
        </view>
        <button v-if="canCreateStockOut && stockOuts.length === 0" class="step-btn" @click="goCreateStockOut">创建出库单</button>
      </view>

      <!-- Stock In (Visible to All - Site User's main action) -->
      <view class="flow-step">
        <view class="step-header">
          <text class="step-title">{{ isManufacturerRelated ? (order.mode === 'purchase' ? '3. 工地入库' : '2. 工地入库') : '工地入库' }}</text>
          <text class="step-status success" v-if="stockIns.length > 0">{{ stockIns.length }}笔</text>
          <text class="step-status warning" v-else>待入库</text>
        </view>
         <view class="step-content" v-for="item in stockIns" :key="item.id">
          <view class="step-info">
            <view class="detail-row">
              <text class="detail-label">单号：</text>
              <text class="detail-value">{{ item.code }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">厂家：</text>
              <text class="detail-value">{{ item.manufacturer?.name || '-' }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">数量：</text>
              <text class="detail-value">{{ item.quantity }}</text>
            </view>
          </view>
          <view class="step-action">
              <text class="edit-btn" @click="handleEdit('stock_in', item.id)">{{ order.is_completed ? '详情' : '编辑' }}</text>
              <text class="delete-btn" v-if="!order.is_completed && canCreateStockIn" @click="deleteItem('stock_in', item.id)">删除</text>
          </view>
        </view>
        <button v-if="canCreateStockIn && stockIns.length === 0" class="step-btn" @click="goCreateStockIn">创建入库单</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { getCurrentUser, type UserInfo } from '@/utils/permission';

const orderId = ref('');
const order = ref<any>(null);
const stockOuts = ref<any[]>([]);
const stockIns = ref<any[]>([]);
const purchases = ref<any[]>([]);
const currentUser = ref<UserInfo | null>(null);

onLoad((options: any) => {
  if (options.id) {
    orderId.value = options.id;
  }
});

onShow(async () => {
  if (orderId.value) {
    uni.showLoading({ title: '加载中...', mask: true });
    try {
      await fetchCurrentUser();
      await fetchOrderDetails();
      await fetchRelatedDocs();
    } finally {
      uni.hideLoading();
    }
  }
});

const fetchCurrentUser = async () => {
    currentUser.value = await getCurrentUser();
  };

const fetchOrderDetails = async () => {
  const { data, error } = await supabase
    .from('contract_order')
    .select(`
      id, code, quantity, is_confirmed, is_completed, create_time, mode, 
      contract_id,
      contract:contract_id (name, id, site_id),
      product:product_id (name, unit, id)
    `)
    .eq('id', orderId.value)
    .single();
    
  if (data) order.value = data;
};

const fetchRelatedDocs = async () => {
  // Fetch Stock Outs
  const { data: outData } = await supabase
    .from('contract_order_stock_out')
    .select('id, code, quantity, create_time, manufacturer:manufacturer_id(name)')
    .eq('contract_order_id', orderId.value)
    .order('create_time', { ascending: false });
  stockOuts.value = outData || [];

  // Fetch Stock Ins
  const { data: inData } = await supabase
    .from('contract_order_stock_in')
    .select('id, code, quantity, create_time, manufacturer:manufacturer_id(name)')
    .eq('contract_order_id', orderId.value)
    .order('create_time', { ascending: false });
  stockIns.value = inData || [];

  // Fetch Purchases
  const { data: purchaseData, error } = await supabase
        .from('contract_order_purchase')
        .select('id, code, quantity, create_time, payee_manufacturer:payee_manufacturer_id(name)')
        .eq('contract_order_id', orderId.value)
        .order('create_time', { ascending: false });
   
   if (!error && purchaseData) {
       purchases.value = purchaseData;
   } else {
       purchases.value = [];
   }
};

const confirmOrder = async () => {
    uni.showLoading({ title: '确认中' });
    const { error } = await supabase
        .from('contract_order')
        .update({ is_confirmed: true })
        .eq('id', orderId.value);
    
    uni.hideLoading();
    if (!error) {
        uni.showToast({ title: '已确认', icon: 'success' });
        setTimeout(() => fetchOrderDetails(), 1500);
    } else {
        uni.showToast({ title: '确认失败: ' + error.message, icon: 'none' });
    }
};

const unconfirmOrder = () => {
    uni.showModal({
        title: '撤销确认',
        content: '确定要撤销确认状态吗？如果已有出入库单据，可能会失败。',
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '处理中' });
                const { error }: any = await supabase
                    .from('contract_order')
                    .update({ is_confirmed: false })
                    .eq('id', orderId.value);
                
                uni.hideLoading();
                if (!error) {
                    uni.showToast({ title: '已撤销', icon: 'success' });
                    setTimeout(() => fetchOrderDetails(), 1500);
                } else {
                    let msg = error.message; 
                    if (error.data?.message) msg = error.data.message;
                    uni.showToast({ title: '撤销失败: ' + msg, icon: 'none' });
                }
            }
        }
    });
};

const finishOrder = () => {
    uni.showModal({
        title: '完成订单',
        content: '确定要完成此订单吗？完成后将无法再创建单据。',
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '处理中' });
                const { error } = await supabase
                    .from('contract_order')
                    .update({ is_completed: true })
                    .eq('id', orderId.value);
                
                uni.hideLoading();
                if (!error) {
                    uni.showToast({ title: '订单已完成', icon: 'success' });
                    setTimeout(() => fetchOrderDetails(), 1500);
                } else {
                    uni.showToast({ title: '操作失败: ' + error.message, icon: 'none' });
                }
            }
        }
    });
};

const unfinishOrder = () => {
    uni.showModal({
        title: '取消完成',
        content: '确定要取消完成状态吗？',
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '处理中' });
                const { error } = await supabase
                    .from('contract_order')
                    .update({ is_completed: false })
                    .eq('id', orderId.value);
                
                uni.hideLoading();
                if (!error) {
                    uni.showToast({ title: '已取消完成', icon: 'success' });
                    setTimeout(() => fetchOrderDetails(), 1500);
                } else {
                    uni.showToast({ title: '操作失败: ' + error.message, icon: 'none' });
                }
            }
        }
    });
};

// Computed Logic
const isManufacturerRelated = computed(() => {
    return currentUser.value?.is_admin || (currentUser.value?.manufacturer_permissions && currentUser.value.manufacturer_permissions.length > 0);
});

// Can Operate: Admin or Site Agent
const canOperate = computed(() => {
    if (!order.value) return false;
    if (currentUser.value?.is_admin) return true;
    return currentUser.value?.site_permissions?.includes(order.value.contract?.site_id);
});

const canEdit = computed(() => {
    // Only allowing edits before confirmation
    if (order.value?.is_confirmed || order.value?.is_completed) return false;
    return canOperate.value;
});

// Navigation
const goEdit = () => {
    uni.navigateTo({ url: `/pages/contract-order/edit?id=${orderId.value}` });
};

const canCreatePurchase = computed(() => {
  if (!order.value?.is_confirmed || order.value?.is_completed) return false;
  return isManufacturerRelated.value;
});

const canCreateStockOut = computed(() => {
  if (!order.value?.is_confirmed || order.value?.is_completed) return false;
  return isManufacturerRelated.value;
});

const canCreateStockIn = computed(() => {
  if (!order.value?.is_confirmed || order.value?.is_completed) return false;
  return currentUser.value?.is_admin || (currentUser.value?.site_permissions && currentUser.value.site_permissions.length > 0);
});

// Logic: Can finish if confirmed and has Inbound?
// And must be operator (Site Agent/Admin)
const canFinish = computed(() => {
  if (!order.value?.is_confirmed || order.value?.is_completed) return false;
  // if (stockIns.value.length === 0) return false; // Optional constraint
  return canOperate.value;
});

// Navigation
const goCreateStockOut = () => {
  uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-outbound?orderId=${orderId.value}` });
};

const goCreateStockIn = () => {
  uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-inbound?orderId=${orderId.value}` });
};

const goCreatePurchase = () => {
    uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-purchase?orderId=${orderId.value}` });
};

// Utils
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
};

const getStatusText = (order: any) => {
  if (order.is_completed) return '已完成';
  if (order.is_confirmed) return '执行中';
  return '待确认';
};

const getStatusClass = (order: any) => {
  if (order.is_completed) return 'completed';
  if (order.is_confirmed) return 'processing';
  return 'pending';
};

const deleteItem = async (type: string, id: string) => {
    let tableName = '';
    let confirmContent = '';
    
    switch(type) {
        case 'purchase':
            tableName = 'contract_order_purchase';
            confirmContent = '确定要删除此采购单吗？';
            break;
        case 'stock_out':
            tableName = 'contract_order_stock_out';
            confirmContent = '确定要删除此出库单吗？';
            break;
        case 'stock_in':
            tableName = 'contract_order_stock_in';
            confirmContent = '确定要删除此入库单吗？';
            break;
    }
    
    if (!tableName) return;
    
    uni.showModal({
        title: '提示',
        content: confirmContent,
        success: async (res) => {
            if (res.confirm) {
                uni.showLoading({ title: '删除中' });
                const { error } = await supabase
                    .from(tableName)
                    .delete()
                    .eq('id', id);
                    
                uni.hideLoading();
                
                if (!error) {
                    uni.showToast({ title: '已删除', icon: 'success' });
                    fetchRelatedDocs(); // Refresh lists
                } else {
                    uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
                }
            }
        }
    });
};

const handleEdit = (type: string, id: string) => {
    // Navigate to respective edit pages (can be same as create pages but with actionId)
    switch(type) {
        case 'purchase':
            uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-purchase?orderId=${orderId.value}&actionId=${id}` });
            break;
        case 'stock_out':
            uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-outbound?orderId=${orderId.value}&actionId=${id}` });
            break;
        case 'stock_in':
            uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-inbound?orderId=${orderId.value}&actionId=${id}` });
            break;
    }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 15px;
  padding-bottom: 50px;
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
  }
  
  .action-btn {
      font-size: 14px;
      font-weight: 500;
  }
  
  .text-primary { color: #6739b6; }
  .text-warning { color: #fa8c16; }
  .text-success { color: #52c41a; }
  
  .info-row {
    display: flex;
    margin-bottom: 10px;
    font-size: 14px;
    
    .label { color: #999; width: 80px; }
    .value { color: #333; flex: 1; }
  }
}

.primary-btn {
  background-color: #6739b6;
  color: #fff;
  border-radius: 20px;
  font-size: 14px;
  padding: 0 30px;
}

.outline-btn {
  background-color: transparent;
  color: #6739b6;
  border: 1px solid #6739b6;
  border-radius: 20px;
  font-size: 14px;
  padding: 0 20px;
}

.flow-card {
  @extend .card;
  
  .flow-step {
    border-bottom: 1px solid #f5f5f5;
    padding-bottom: 15px;
    margin-bottom: 15px;
    
    &:last-child {
      border-bottom: none;
      margin-bottom: 0;
    }
    
    .step-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      
      .step-title { 
        font-size: 15px; 
        font-weight: 500; 
        color: #333; 
      }
      .step-status { 
        font-size: 12px; 
        &.success { color: #52c41a; }
        &.warning { color: #fa8c16; }
      }
    }
    
    .step-content {
      background-color: #f9f9f9;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .step-info {
          flex: 1;
      }
      
      .detail-row {
        display: flex;
        font-size: 13px;
        margin-bottom: 6px;
        line-height: 1.4;
        
        .detail-label {
          color: #999;
          width: 50px;
          flex-shrink: 0;
        }
        
        .detail-value {
          color: #666;
          flex: 1;
          word-break: break-all;
        }
      }
      
      .step-action {
          margin-left: 10px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
      }
      
      .delete-btn {
          font-size: 12px;
          color: #ff4d4f;
          padding: 4px 8px;
          cursor: pointer;
      }
      
      .edit-btn {
          font-size: 12px;
          color: #6739b6;
          padding: 4px 8px;
          cursor: pointer;
          margin-right: 0;
          margin-bottom: 8px;
          text-align: right;
      }
      
     .delete-btn:active, .edit-btn:active {
         opacity: 0.7;
     } 
    }
    
    .step-btn {
      width: 100%;
      margin-top: 10px;
      height: 36px;
      line-height: 36px;
      font-size: 14px;
      background-color: transparent;
      color: #6739b6;
      border: 1px dashed #6739b6;
      border-radius: 18px;
    
      &:active {
        background-color: #f3e8ff;
      }
    }
  }
}
</style>
