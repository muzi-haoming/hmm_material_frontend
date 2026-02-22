<template>
  <view class="container">
    <view class="card" v-if="order">
      <view class="card-title">订单信息</view>
      <view class="info-row">
        <text class="label">订单号</text>
        <text class="value">{{ order.code }}</text>
      </view>
      <view class="info-row">
        <text class="label">产品</text>
        <text class="value">{{ order.product?.name }}</text>
      </view>
      <view class="info-row">
        <text class="label">订单数量</text>
        <text class="value">{{ order.quantity }} {{ order.product?.unit }}</text>
      </view>
    </view>

    <view class="form-group">
      <view class="form-item">
        <text class="label">采购方</text>
         <picker 
          mode="selector" 
          :range="myManufacturers" 
          range-key="name" 
          @change="onPayerChange"
          :disabled="myManufacturers.length <= 1 || order?.is_completed"
        >
          <view class="picker-value" :class="{ placeholder: !form.payer_manufacturer_id, disabled: order?.is_completed }">
            {{ getPayerName() || '请选择采购方' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label">供应商</text>
        <picker 
          mode="selector" 
          :range="otherManufacturers" 
          range-key="name" 
          @change="onPayeeChange"
          :disabled="order?.is_completed"
        >
          <view class="picker-value" :class="{ placeholder: !form.payee_manufacturer_id, disabled: order?.is_completed }">
            {{ getPayeeName() || '请选择供应商' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label">采购数量</text>
        <input 
          class="input" 
          type="digit" 
          v-model="form.quantity" 
          placeholder="请输入数量" 
          :disabled="order?.is_completed"
        />
        <text class="unit" v-if="order?.product">{{ order.product.unit }}</text>
      </view>
    </view>

    <view class="submit-btn-box">
      <view v-if="order?.is_completed" class="status-alert">关联订单已完成，不可修改</view>
      <button v-else class="submit-btn" :loading="submitting" @click="submit">
          {{ actionId ? '保存修改' : '确认采购' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
import { onLoad } from '@dcloudio/uni-app';
import { getCurrentUser, type UserInfo } from '@/utils/permission';

const orderId = ref('');
const order = ref<any>(null);
const currentUser = ref<UserInfo | null>(null);
const submitting = ref(false);

const myManufacturers = ref<any[]>([]); // Manufacturers current user belongs to
const allManufacturers = ref<any[]>([]); // All manufacturers for selection

const actionId = ref('');
const form = ref({
  payer_manufacturer_id: '',
  payee_manufacturer_id: '',
  quantity: ''
});

const getPayerName = () => myManufacturers.value.find(m => m.id === form.value.payer_manufacturer_id)?.name;
const getPayeeName = () => allManufacturers.value.find(m => m.id === form.value.payee_manufacturer_id)?.name;

// Filter out payer from payee list (optional, can buy from self technically but weird)
const otherManufacturers = computed(() => {
    return allManufacturers.value.filter(m => m.id !== form.value.payer_manufacturer_id);
});

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    if (options.actionId) {
        actionId.value = options.actionId;
    }
    
    if (options.orderId) {
      orderId.value = options.orderId;
      await fetchOrderDetails();
      await fetchManufacturers(); 
    }
    
    if (actionId.value) {
        await fetchExistingData();
    }
  } finally {
    uni.hideLoading();
  }
});

const fetchOrderDetails = async () => {
  const { data, error } = await supabase
    .from('contract_order')
    .select(`
      id, code, quantity, is_completed,
      product:product_id (name, unit, id)
    `)
    .eq('id', orderId.value)
    .single();
    
  if (data) {
      order.value = data;
      form.value.quantity = data.quantity; // Default to order quantity
  }
};

const fetchManufacturers = async () => {
    currentUser.value = await getCurrentUser();
    
    // 1. Fetch all manufacturers
    const { data: allData } = await supabase
        .from('manufacturer')
        .select('id, name')
        .order('name');
    
    if (allData) {
        allManufacturers.value = allData;
    }

    // 2. Identify "My Manufacturers"
    if (currentUser.value?.is_admin) {
        // Admin acts as any manufacturer
        myManufacturers.value = allData || [];
    } else {
        const allowedIds = currentUser.value?.manufacturer_permissions || [];
        myManufacturers.value = (allData || []).filter(m => allowedIds.includes(m.id));
    }

    // Auto-select if only one AND not editing
    if (myManufacturers.value.length >= 1 && !actionId.value) {
        form.value.payer_manufacturer_id = myManufacturers.value[0].id;
    }
};

const fetchExistingData = async () => {
    const { data } = await supabase
        .from('contract_order_purchase')
        .select('*')
        .eq('id', actionId.value)
        .single();
        
    if (data) {
        form.value.payer_manufacturer_id = data.payer_manufacturer_id;
        form.value.payee_manufacturer_id = data.payee_manufacturer_id;
        form.value.quantity = data.quantity;
    }
};

const onPayerChange = (e: any) => {
  const index = e.detail.value;
  form.value.payer_manufacturer_id = myManufacturers.value[index].id;
};

const onPayeeChange = (e: any) => {
  const index = e.detail.value;
  form.value.payee_manufacturer_id = otherManufacturers.value[index].id;
};

const submit = async () => {
  if (!form.value.payer_manufacturer_id) return uni.showToast({ title: '请选择采购方', icon: 'none' });
  if (!form.value.payee_manufacturer_id) return uni.showToast({ title: '请选择供应商', icon: 'none' });
  if (!form.value.quantity || parseFloat(form.value.quantity) <= 0) return uni.showToast({ title: '请输入有效数量', icon: 'none' });

  submitting.value = true;
  
  if (actionId.value) {
      // Update existing record
      const { error } = await supabase.from('contract_order_purchase')
          .update({
              payer_manufacturer_id: form.value.payer_manufacturer_id,
              payee_manufacturer_id: form.value.payee_manufacturer_id,
              quantity: parseFloat(form.value.quantity)
          })
          .eq('id', actionId.value);
          
      submitting.value = false;
      if (error) {
          uni.showToast({ title: '保存失败: ' + error.message, icon: 'none' });
      } else {
          uni.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => { uni.navigateBack(); }, 1500);
      }
  } else {
      // Create Purchase Order Code
      const code = await generateCode('contract_order_purchase', 'HTCG');
    
      const { error } = await supabase.from('contract_order_purchase').insert({
        code: code,
        contract_order_id: orderId.value,
        product_id: order.value.product.id,
        payer_manufacturer_id: form.value.payer_manufacturer_id,
        payee_manufacturer_id: form.value.payee_manufacturer_id,
        quantity: parseFloat(form.value.quantity)
      });
    
      submitting.value = false;
    
      if (error) {
        console.error('Create purchase error:', error);
        uni.showToast({ title: '创建失败: ' + error.message, icon: 'none' });
      } else {
        uni.showToast({ title: '创建成功', icon: 'success' });
        setTimeout(() => {
          uni.navigateBack();
        }, 1500);
      }
  }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 15px;
}

.card {
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 20px;
  
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
    justify-content: space-between;
    margin-bottom: 8px;
    font-size: 14px;
    
    .label { color: #999; }
    .value { color: #333; font-weight: 500; }
  }
}

.form-group {
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.form-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
  
  .label {
    width: 80px;
    font-size: 15px;
    color: #333;
    font-weight: 500;
  }
  
  picker {
    flex: 1;
  }
  
  .picker-value {
    font-size: 15px;
    color: #333;
    
    &.placeholder {
      color: #999;
    }
  }
  
  .input {
    flex: 1;
    font-size: 15px;
    color: #333;
  }
  
  .unit {
    margin-left: 10px;
    font-size: 14px;
    color: #999;
  }
}

.submit-btn-box {
  margin-top: 30px;
  
  .submit-btn {
    background: linear-gradient(135deg, #6739b6, #855bc9);
    color: #fff;
    border-radius: 25px;
    font-size: 16px;
    height: 44px;
    line-height: 44px;
    border: none;
  }
}

.status-alert {
  background-color: #fffbe6;
  color: #d46b08;
  border: 1px solid #ffe58f;
  padding: 12px;
  text-align: center;
  border-radius: 8px;
  font-size: 14px;
}
</style>
