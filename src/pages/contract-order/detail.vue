<template>
  <view class="container" v-if="order">
    <!-- Header Status -->
    <view class="status-header" :class="getStatusClass(order.status)">
      <view class="status-text">{{ getStatusText(order.status) }}</view>
      <view class="order-code">NO. {{ order.code }}</view>
    </view>

    <!-- Basic Info -->
    <view class="card">
      <view class="card-title">基本信息</view>
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
       <view class="info-row" v-if="order.type">
        <text class="label">业务模式</text>
        <text class="value">{{ getTypeText(order.type) }}</text>
      </view>
    </view>

    <!-- Actions for Pending Order -->
    <view v-if="order.status === '0'" class="action-card">
      <view class="tip-text">请确认订单信息无误</view>
      <button class="primary-btn" @click="confirmOrder">确认订单</button>
    </view>

    <!-- Flow Selection (If Confirmed but Type not selected) -->
    <view v-if="order.status === '1' && !order.type" class="action-card">
      <view class="tip-text">请选择业务执行模式</view>
      <view class="btn-group">
        <button class="outline-btn" @click="selectFlow('direct')">直接发货</button>
        <button class="outline-btn" @click="selectFlow('proxy')">代理采购</button>
      </view>
    </view>

    <!-- Process Flow -->
    <view v-if="order.status !== '0' && order.type" class="flow-card">
      <view class="card-title">执行流程</view>
      
      <!-- Step 1: Purchase (Only for Proxy) -->
      <view class="flow-step" v-if="order.type === 'proxy'">
        <view class="step-header">
          <text class="step-title">1. 采购单</text>
          <text class="step-status success" v-if="purchase">已完成</text>
          <text class="step-status warning" v-else>未开始</text>
        </view>
        <view class="step-content" v-if="purchase">
          <text class="sub-text">单号: {{ purchase.code }}</text>
          <text class="sub-text">数量: {{ purchase.quantity }}</text>
        </view>
         <button v-if="!purchase && order.status === '1'" class="step-btn" @click="goCreatePurchase">创建采购单</button>
      </view>

      <!-- Step 2: Outbound -->
      <view class="flow-step">
        <view class="step-header">
          <text class="step-title">{{ order.type === 'proxy' ? '2' : '1' }}. 出库单</text>
          <text class="step-status success" v-if="stockOuts.length > 0">已出库</text>
          <text class="step-status warning" v-else>未开始</text>
        </view>
         <view class="step-content" v-for="item in stockOuts" :key="item.id">
          <text class="sub-text">单号: {{ item.code }}</text>
          <text class="sub-text">数量: {{ item.quantity }}</text>
        </view>
        <!-- Logic: Can create multiple stock outs? Usually one per order but schema allows many. 
             If direct, can create. If proxy, must have purchase first? Maybe not strictly enforced but logical. -->
        <button v-if="canCreateStockOut" class="step-btn" @click="goCreateStockOut">创建出库单</button>
      </view>

      <!-- Step 3: Inbound -->
      <view class="flow-step">
        <view class="step-header">
          <text class="step-title">{{ order.type === 'proxy' ? '3' : '2' }}. 入库单</text>
          <text class="step-status success" v-if="stockIns.length > 0">已入库</text>
          <text class="step-status warning" v-else>未开始</text>
        </view>
         <view class="step-content" v-for="item in stockIns" :key="item.id">
          <text class="sub-text">单号: {{ item.code }}</text>
          <text class="sub-text">数量: {{ item.quantity }}</text>
        </view>
        <button v-if="canCreateStockIn" class="step-btn" @click="goCreateStockIn">创建入库单</button>
      </view>
    </view>

    <!-- Final Audit -->
    <view v-if="order.status === '1' && canFinish" class="action-card">
      <view class="tip-text">所有流程已完成，请进行终审</view>
      <button class="primary-btn" @click="finishOrder">终审完成</button>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad, onShow } from '@dcloudio/uni-app';

const orderId = ref('');
const order = ref<any>(null);
const purchase = ref<any>(null);
const stockOuts = ref<any[]>([]);
const stockIns = ref<any[]>([]);

onLoad((options: any) => {
  if (options.id) {
    orderId.value = options.id;
  }
});

onShow(() => {
  if (orderId.value) {
    fetchOrderDetails();
    fetchRelatedDocs();
  }
});

const fetchOrderDetails = async () => {
  const { data, error } = await supabase
    .from('order')
    .select(`
      id, code, quantity, status, type, create_time,
      contract:contract_id (name, id),
      product:product_id (name, unit, id)
    `)
    .eq('id', orderId.value)
    .single();
    
  if (data) order.value = data;
};

const fetchRelatedDocs = async () => {
  // Fetch Purchase
  const { data: pData } = await supabase
    .from('purchase')
    .select('id, code, quantity')
    .eq('order_id', orderId.value)
    .maybeSingle(); // Use maybeSingle as it might not exist
  purchase.value = pData;

  // Fetch Stock Outs (contract_stock_out)
  const { data: outData } = await supabase
    .from('contract_stock_out')
    .select('id, code, quantity')
    .eq('order_id', orderId.value);
  stockOuts.value = outData || [];

  // Fetch Stock Ins (contract_stock_in)
  const { data: inData } = await supabase
    .from('contract_stock_in')
    .select('id, code, quantity')
    .eq('order_id', orderId.value);
  stockIns.value = inData || [];
};

const confirmOrder = async () => {
  const { error } = await supabase
    .from('order')
    .update({ status: '1' })
    .eq('id', orderId.value);
    
  if (!error) {
    uni.showToast({ title: '已确认', icon: 'success' });
    fetchOrderDetails();
  }
};

const selectFlow = async (type: string) => {
  const { error } = await supabase
    .from('order')
    .update({ type: type })
    .eq('id', orderId.value);
    
  if (!error) {
    uni.showToast({ title: '已选择模式', icon: 'success' });
    fetchOrderDetails();
  }
};

const finishOrder = async () => {
  const { error } = await supabase
    .from('order')
    .update({ status: '2' })
    .eq('id', orderId.value);
    
  if (!error) {
    uni.showToast({ title: '订单已完成', icon: 'success' });
    fetchOrderDetails();
  }
};

// Computed Logic
const canCreateStockOut = computed(() => {
  if (order.value?.status !== '1') return false;
  if (order.value?.type === 'proxy' && !purchase.value) return false; // Proxy needs purchase first
  // Assuming total stock out quantity < order quantity? 
  // For now just check if we can add more given the logic. 
  // Simplification: Allow adding if order not completed.
  return true;
});

const canCreateStockIn = computed(() => {
  if (order.value?.status !== '1') return false;
  // Needs at least one stock out? Not necessarily, but logically yes.
  if (stockOuts.value.length === 0) return false;
  return true;
});

const canFinish = computed(() => {
  // Simple check: Has Inbound?
  if (stockIns.value.length > 0) return true;
  return false;
});


// Navigation
const goCreatePurchase = () => {
  uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-purchase?orderId=${orderId.value}` });
};

const goCreateStockOut = () => {
  uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-outbound?orderId=${orderId.value}` });
};

const goCreateStockIn = () => {
  uni.navigateTo({ url: `/pages/contract-order/flow-actions/create-inbound?orderId=${orderId.value}` });
};

// Utils
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString();
};

const getStatusText = (status: string) => {
  const map: Record<string, string> = { '0': '待确认', '1': '执行中', '2': '已完成' };
  return map[status] || status;
};

const getStatusClass = (status: string) => {
  const map: Record<string, string> = { '0': 'pending', '1': 'processing', '2': 'completed' };
  return map[status] || '';
};

const getTypeText = (type: string) => {
  const map: Record<string, string> = { 'direct': '直接发货', 'proxy': '代理采购' };
  return map[type] || type;
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
  
  .card-title {
    font-size: 16px;
    font-weight: bold;
    color: #333;
    margin-bottom: 12px;
    border-left: 4px solid #6739b6;
    padding-left: 10px;
  }
  
  .info-row {
    display: flex;
    margin-bottom: 10px;
    font-size: 14px;
    
    .label { color: #999; width: 80px; }
    .value { color: #333; flex: 1; }
  }
}

.action-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 20px;
  text-align: center;
  margin-bottom: 15px;
  
  .tip-text {
    color: #666;
    margin-bottom: 15px;
    font-size: 14px;
  }
  
  .btn-group {
    display: flex;
    justify-content: center;
    gap: 15px;
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
      
      .step-title { font-weight: bold; color: #333; }
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
      
      .sub-text {
        display: block;
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
      }
    }
    
    .step-btn {
      font-size: 12px;
      background-color: #f0f0f0;
      color: #333;
      border-radius: 15px;
    }
  }
}
</style>
