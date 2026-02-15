<template>
  <view class="container">
    <view class="form-group">
      <view class="form-item">
        <text class="label">产品</text>
        <text class="value">{{ productName }}</text>
      </view>
       <view class="form-item">
        <text class="label">出库数量</text>
        <input class="input" type="digit" v-model="form.quantity" placeholder="请输入出库数量" />
        <text class="unit">{{ unit }}</text>
      </view>
      
      <view class="form-item">
        <text class="label">发货厂家</text>
        <picker mode="selector" :range="manufacturers" range-key="name" @change="onManufacturerChange">
          <view class="picker-value" :class="{ placeholder: !form.manufacturer_id }">
            {{ getManufacturerName() || '请选择发货厂家' }}
          </view>
        </picker>
      </view>
    </view>

    <view class="submit-btn-box">
      <button class="submit-btn" :loading="submitting" @click="submit">提交出库单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';

const orderId = ref('');
const productName = ref('');
const unit = ref('');
const productId = ref('');
const manufacturers = ref<any[]>([]);
const submitting = ref(false);

const form = ref({
  quantity: '',
  manufacturer_id: ''
});

onLoad(async (options: any) => {
  if (options.orderId) {
    orderId.value = options.orderId;
    await fetchOrderInfo();
    fetchManufacturers();
  }
});

const fetchOrderInfo = async () => {
  const { data } = await supabase
    .from('order')
    .select('quantity, product:product_id(id, name, unit)')
    .eq('id', orderId.value)
    .single();
    
  if (data) {
    form.value.quantity = data.quantity; // Default to order quantity
    if (data.product) {
        productName.value = (data.product as any).name;
        unit.value = (data.product as any).unit;
        productId.value = (data.product as any).id;
    }
  }
};

const fetchManufacturers = async () => {
  const { data } = await supabase.from('manufacturer').select('id, name');
  if (data) manufacturers.value = data;
};

const getManufacturerName = () => manufacturers.value.find(m => m.id === form.value.manufacturer_id)?.name;

const onManufacturerChange = (e: any) => {
  form.value.manufacturer_id = manufacturers.value[e.detail.value].id;
};

const submit = async () => {
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });
  if (!form.value.manufacturer_id) return uni.showToast({ title: '请选择发货厂家', icon: 'none' });

  submitting.value = true;
  const code = `OUT${Date.now()}`;

  const { error } = await supabase.from('contract_stock_out').insert({
    code: code,
    order_id: orderId.value,
    product_id: productId.value,
    manufacturer_id: form.value.manufacturer_id,
    quantity: parseFloat(form.value.quantity)
  });

  submitting.value = false;

  if (error) {
    console.error('Create stock out error:', error);
    uni.showToast({ title: '创建失败', icon: 'none' });
  } else {
    uni.showToast({ title: '创建成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
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
</style>
