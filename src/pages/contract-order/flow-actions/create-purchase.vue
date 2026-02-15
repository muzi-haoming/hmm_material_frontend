<template>
  <view class="container">
    <view class="form-group">
      <view class="form-item">
        <text class="label">产品</text>
        <text class="value">{{ productName }}</text>
      </view>
       <view class="form-item">
        <text class="label">数量</text>
        <input class="input" type="digit" v-model="form.quantity" placeholder="请输入采购数量" />
        <text class="unit">{{ unit }}</text>
      </view>
      <view class="form-item">
        <text class="label">金额</text>
        <input class="input" type="digit" v-model="form.amount" placeholder="请输入总金额" />
      </view>
      
      <view class="form-item">
        <text class="label">付款方</text>
        <picker mode="selector" :range="manufacturers" range-key="name" @change="onPayerChange">
          <view class="picker-value" :class="{ placeholder: !form.payer_manufacturer_id }">
            {{ getPayerName() || '请选择付款厂家' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label">收款方</text>
        <picker mode="selector" :range="manufacturers" range-key="name" @change="onPayeeChange">
          <view class="picker-value" :class="{ placeholder: !form.payee_manufacturer_id }">
            {{ getPayeeName() || '请选择收款厂家/供应商' }}
          </view>
        </picker>
      </view>
    </view>

    <view class="submit-btn-box">
      <button class="submit-btn" :loading="submitting" @click="submit">提交采购单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
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
  amount: '',
  payer_manufacturer_id: '',
  payee_manufacturer_id: ''
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
    form.value.quantity = data.quantity;
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

const getPayerName = () => manufacturers.value.find(m => m.id === form.value.payer_manufacturer_id)?.name;
const getPayeeName = () => manufacturers.value.find(m => m.id === form.value.payee_manufacturer_id)?.name;

const onPayerChange = (e: any) => {
  form.value.payer_manufacturer_id = manufacturers.value[e.detail.value].id;
};

const onPayeeChange = (e: any) => {
  form.value.payee_manufacturer_id = manufacturers.value[e.detail.value].id;
};

const submit = async () => {
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });
  if (!form.value.amount) return uni.showToast({ title: '请输入金额', icon: 'none' });
  if (!form.value.payer_manufacturer_id) return uni.showToast({ title: '请选择付款方', icon: 'none' });
  if (!form.value.payee_manufacturer_id) return uni.showToast({ title: '请选择收款方', icon: 'none' });

  submitting.value = true;
  
  // Need to get current user profile for purchasing 'purchaser'
  const { data: { user } } = await supabase.auth.getUser();
  // We need the profile id corresponding to this user. 
  // Assuming profile.id is same as user.id (which is schema definition: "id" uuid primary key references auth.users(id)).
  const profileId = user?.id;

  const code = `PUR${Date.now()}`;

  const { error } = await supabase.from('purchase').insert({
    code: code,
    order_id: orderId.value,
    product_id: productId.value,
    quantity: parseFloat(form.value.quantity),
    amount: parseFloat(form.value.amount),
    purchaser: profileId,
    payer_manufacturer_id: form.value.payer_manufacturer_id,
    payee_manufacturer_id: form.value.payee_manufacturer_id
  });

  submitting.value = false;

  if (error) {
    console.error('Create purchase error:', error);
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
