<template>
  <view class="container">
    <view class="form-group">
      <view class="form-item">
        <text class="label">产品</text>
        <text class="value">{{ productName }}</text>
      </view>
      <view class="form-item">
        <text class="label">出库数量</text>
        <input class="input" type="digit" v-model="form.quantity" placeholder="请输入出库数量" :disabled="isOrderCompleted" />
        <text class="unit">{{ unit }}</text>
      </view>
      
      <view class="form-item">
        <text class="label">发货厂家</text>
        <view v-if="hasPurchase" class="value" style="color: #999;">
          {{ getManufacturerName() }}
        </view>
        <picker v-else mode="selector" :range="manufacturers" range-key="name" @change="onManufacturerChange" :disabled="isOrderCompleted">
          <view class="picker-value" :class="{ placeholder: !form.manufacturer_id, disabled: isOrderCompleted }">
            {{ getManufacturerName() || '请选择发货厂家' }}
          </view>
        </picker>
      </view>
    </view>

    <view class="submit-btn-box">
      <view v-if="isOrderCompleted" class="status-alert">关联订单已完成，不可修改</view>
      <button v-else class="submit-btn" :loading="submitting" @click="submit">
          {{ actionId ? '保存修改' : '提交出库单' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
import { onLoad } from '@dcloudio/uni-app';

const orderId = ref('');
const productName = ref('');
const unit = ref('');
const productId = ref('');
const manufacturers = ref<any[]>([]);
const submitting = ref(false);
const hasPurchase = ref(false);
const actionId = ref('');
const isOrderCompleted = ref(false);

const form = ref({
  quantity: '',
  manufacturer_id: ''
});

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    if (options.actionId) {
        actionId.value = options.actionId;
    }
      
    if (options.orderId) {
      orderId.value = options.orderId;
      await fetchOrderInfo();
      await fetchManufacturers();
    }
    
    if (actionId.value) {
        await fetchExistingData();
    }
  } finally {
    uni.hideLoading();
  }
});


const fetchOrderInfo = async () => {
  const { data } = await supabase
    .from('contract_order')
    .select('quantity, is_completed, product:product_id(id, name, unit)')
    .eq('id', orderId.value)
    .single();
    
  if (data) {
    form.value.quantity = data.quantity; // Default to order quantity
    isOrderCompleted.value = data.is_completed;
    if (data.product) {
        productName.value = (data.product as any).name;
        unit.value = (data.product as any).unit;
        // productId.value = (data.product as any).id; // No need for productId in stock_out
    }
  }
};

const fetchManufacturers = async () => {
  const { data } = await supabase.from('manufacturer').select('id, name');
  if (data) manufacturers.value = data;
  
  // Auto-fill from latest Purchase Order
  const { data: purchaseData } = await supabase
    .from('contract_order_purchase')
    .select('payee_manufacturer_id')
    .eq('contract_order_id', orderId.value)
    .order('create_time', { ascending: false })
    .limit(1)
    .maybeSingle(); 
    
   if (purchaseData && purchaseData.payee_manufacturer_id && !actionId.value) {
       form.value.manufacturer_id = purchaseData.payee_manufacturer_id;
       hasPurchase.value = true;
   }
};

const fetchExistingData = async () => {
    const { data } = await supabase
        .from('contract_order_stock_out')
        .select('*')
        .eq('id', actionId.value)
        .single();
        
    if (data) {
        form.value.manufacturer_id = data.manufacturer_id;
        form.value.quantity = data.quantity;
    }
};

const getManufacturerName = () => manufacturers.value.find(m => m.id === form.value.manufacturer_id)?.name;

const onManufacturerChange = (e: any) => {
  form.value.manufacturer_id = manufacturers.value[e.detail.value].id;
};

const submit = async () => {
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });
  if (!form.value.manufacturer_id) return uni.showToast({ title: '请选择发货厂家', icon: 'none' });

  submitting.value = true;
  
  if (actionId.value) {
      const { error } = await supabase.from('contract_order_stock_out')
          .update({
              manufacturer_id: form.value.manufacturer_id,
              quantity: parseFloat(form.value.quantity)
          })
          .eq('id', actionId.value);
          
      submitting.value = false;
      if (error) {
          uni.showToast({ title: '保存失败: ' + ((error as any).data?.message || error.message || '未知错误'), icon: 'none' });
      } else {
          uni.showToast({ title: '保存成功', icon: 'success' });
          setTimeout(() => { uni.navigateBack(); }, 1500);
      }
  } else {
      const code = await generateCode('contract_order_stock_out', 'HTCK');
    
      const { error } = await supabase.from('contract_order_stock_out').insert({
        code: code,
        contract_order_id: orderId.value,
        // product_id is not in schema
        manufacturer_id: form.value.manufacturer_id,
        quantity: parseFloat(form.value.quantity)
      });
    
      submitting.value = false;
    
      if (error) {
        console.error('Create stock out error:', error);
        uni.showToast({ title: '创建失败: ' + ((error as any).data?.message || error.message || '未知错误'), icon: 'none' });
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
  .label { width: 80px; color: #333; font-weight: 500; }
  .value { flex: 1; color: #666; }
  .input { flex: 1; color: #333; }
  .unit { margin-left: 10px; color: #999; font-size: 14px; }
  picker { flex: 1; }
  .picker-value { color: #333; &.placeholder { color: #999; } }
}
.submit-btn-box {
  margin-top: 30px;
  .submit-btn {
    background: linear-gradient(135deg, #6739b6, #855bc9);
    color: #fff;
    border-radius: 25px;
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
