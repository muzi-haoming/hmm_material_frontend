<template>
  <view class="container">
    <view class="form-group">
      <view class="form-item">
        <text class="label">合同</text>
        <picker 
          mode="selector" 
          :range="contracts" 
          range-key="name" 
          @change="onContractChange"
        >
          <view class="picker-value" :class="{ placeholder: !form.contract_id }">
            {{ getContractName() || '请选择合同' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label">产品</text>
        <picker 
          mode="selector" 
          :range="products" 
          range-key="name" 
          @change="onProductChange"
        >
          <view class="picker-value" :class="{ placeholder: !form.product_id }">
            {{ getProductName() || '请选择产品' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label">数量</text>
        <input 
          class="input" 
          type="digit" 
          v-model="form.quantity" 
          placeholder="请输入数量" 
        />
        <text class="unit" v-if="selectedProduct">{{ selectedProduct.unit }}</text>
      </view>
    </view>

    <view class="submit-btn-box">
      <button class="submit-btn" :loading="submitting" @click="submit">提交订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';

const form = ref({
  contract_id: '',
  product_id: '',
  quantity: ''
});

const contracts = ref<any[]>([]);
const products = ref<any[]>([]);
const submitting = ref(false);

const selectedContract = computed(() => contracts.value.find(c => c.id === form.value.contract_id));
const selectedProduct = computed(() => products.value.find(p => p.id === form.value.product_id));

const getContractName = () => selectedContract.value?.name;
const getProductName = () => selectedProduct.value?.name;

onLoad(() => {
  fetchContracts();
  fetchProducts();
});

const fetchContracts = async () => {
  const { data, error } = await supabase
    .from('contract')
    .select('id, name, code, status')
    //.eq('status', '1') // Assuming '1' is active contract? Schema says char(1). Let's list all for now or check business logic.
    .order('create_time', { ascending: false });
    
  if (data) contracts.value = data;
};

const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('product')
    .select('id, name, code, unit')
    .order('name');
    
  if (data) products.value = data;
};

const onContractChange = (e: any) => {
  const index = e.detail.value;
  form.value.contract_id = contracts.value[index].id;
};

const onProductChange = (e: any) => {
  const index = e.detail.value;
  form.value.product_id = products.value[index].id;
};

const submit = async () => {
  if (!form.value.contract_id) return uni.showToast({ title: '请选择合同', icon: 'none' });
  if (!form.value.product_id) return uni.showToast({ title: '请选择产品', icon: 'none' });
  if (!form.value.quantity || parseFloat(form.value.quantity) <= 0) return uni.showToast({ title: '请输入有效数量', icon: 'none' });

  submitting.value = true;
  
  // Generate a simple code if DB doesn't auto-generate or require it.
  // Schema says 'code' is not null. Current tables use uuid, but 'code' is text.
  // Usually backend or trigger handles it, or frontend generates.
  // Let's generate a simple timestamp-based code for now.
  const code = `ORD${Date.now()}`;

  const { error } = await supabase.from('order').insert({
    code: code,
    contract_id: form.value.contract_id,
    product_id: form.value.product_id,
    quantity: parseFloat(form.value.quantity),
    status: '0', // 待确认
    // type is null initially
  });

  submitting.value = false;

  if (error) {
    console.error('Create order error:', error);
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
    
    &::after {
      border: none;
    }
    
    &:active {
      opacity: 0.9;
    }
  }
}
</style>
