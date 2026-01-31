<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">订单编号</text>
        <input class="input" type="text" v-model="form.code" placeholder="请输入订单编号" />
      </view>

      <view class="form-item">
        <text class="label required">关联合同</text>
        <picker @change="bindContractChange" :value="contractIndex" :range="contracts" range-key="name">
          <view class="input picker-view">
            {{ contracts[contractIndex] ? contracts[contractIndex].name : '请选择合同' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">关产品</text>
        <picker @change="bindProductChange" :value="productIndex" :range="products" range-key="name">
          <view class="input picker-view">
            {{ products[productIndex] ? products[productIndex].name : '请选择产品' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label required">数量</text>
        <input class="input" type="number" v-model="form.quantity" placeholder="请输入数量" />
      </view>

      <view class="form-item">
        <text class="label required">状态</text>
        <picker @change="bindStatusChange" :value="statusIndex" :range="statusOptions" range-key="label">
          <view class="input picker-view">
            {{ statusOptions[statusIndex] ? statusOptions[statusIndex].label : '请选择状态' }}
          </view>
        </picker>
      </view>
    </view>

    <view class="footer">
      <button class="btn-delete" v-if="isEdit" @click="handleDelete" :disabled="loading">删除</button>
      <button class="btn-save" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';
import { v4 as uuidv4 } from 'uuid';

interface Option {
  id: string;
  name: string;
}

const form = ref({
  id: '',
  code: '',
  contract_id: '',
  product_id: '',
  quantity: '',
  status: '0'
});

const contracts = ref<Option[]>([]);
const contractIndex = ref(-1);

const products = ref<Option[]>([]);
const productIndex = ref(-1);

const statusOptions = [
  { label: '已创建', value: '0' },
  { label: '已发货', value: '1' },
  { label: '已完成', value: '2' },
  { label: '已取消', value: '3' }
];
const statusIndex = ref(0);

const loading = ref(false);
const isEdit = ref(false);

onLoad(async (options: any) => {
  await fetchOptions();
  
  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const fetchOptions = async () => {
  // Fetch Contracts
  const { data: contractData } = await supabase.from('contract').select('id, name');
  if (contractData) contracts.value = contractData;

  // Fetch Products
  const { data: productData } = await supabase.from('product').select('id, name');
  if (productData) products.value = productData;
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('order')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.code = data.code;
    form.value.contract_id = data.contract_id;
    form.value.product_id = data.product_id;
    form.value.quantity = data.quantity;
    form.value.status = data.status;

    // Set Indices
    contractIndex.value = contracts.value.findIndex(c => c.id === data.contract_id);
    productIndex.value = products.value.findIndex(p => p.id === data.product_id);
    statusIndex.value = statusOptions.findIndex(o => o.value === data.status);
  }
};

const bindContractChange = (e: any) => {
  contractIndex.value = e.detail.value;
  form.value.contract_id = contracts.value[contractIndex.value].id;
};

const bindProductChange = (e: any) => {
  productIndex.value = e.detail.value;
  form.value.product_id = products.value[productIndex.value].id;
};

const bindStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  form.value.status = statusOptions[statusIndex.value].value;
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该订单吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('order').delete().eq('id', form.value.id);
        loading.value = false;
        
        if (error) {
          uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
        } else {
          uni.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      }
    }
  });
};

const handleSave = async () => {
  if (!form.value.code) return uni.showToast({ title: '请输入订单编号', icon: 'none' });
  if (!form.value.contract_id) return uni.showToast({ title: '请选择合同', icon: 'none' });
  if (!form.value.product_id) return uni.showToast({ title: '请选择产品', icon: 'none' });
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });

  loading.value = true;
  
  let error;
  const payload = {
    code: form.value.code,
    contract_id: form.value.contract_id,
    product_id: form.value.product_id,
    quantity: Number(form.value.quantity),
    status: form.value.status,
    update_time: new Date().toISOString()
  };
  
  if (isEdit.value) {
    // Update
    const { error: updateError } = await supabase
      .from('order')
      .update(payload)
      .eq('id', form.value.id);
    error = updateError;
  } else {
    // Insert
    // @ts-ignore
    payload.id = uuidv4();
    const { error: insertError } = await supabase
      .from('order')
      .insert(payload);
    error = insertError;
  }

  loading.value = false;

  if (error) {
    console.error('Save error:', error);
    uni.showToast({ title: '保存失败: ' + error.message, icon: 'none' });
  } else {
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack();
    }, 1500);
  }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 15px;
}

.form-card {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
}

.form-item {
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  .label {
    display: block;
    font-size: 14px;
    color: #333;
    margin-bottom: 8px;
    
    &.required::after {
      content: '*';
      color: #ff4d4f;
      margin-left: 4px;
    }
  }
  
  .input {
    width: 100%;
    height: 44px;
    background-color: #f9f9f9;
    border-radius: 6px;
    padding: 0 12px;
    font-size: 15px;
    box-sizing: border-box;
    display: flex;
    align-items: center; // For text inside picker view
  }
  
  .picker-view {
    color: #333; // Default
  }
}

.footer {
  margin-top: 30px;
  display: flex;
  gap: 15px;
}

.btn-delete {
  flex: 1;
  background-color: #f5f5f5;
  color: #ff4d4f;
  border-radius: 25px;
  height: 46px;
  line-height: 46px;
  font-size: 16px;
  
  &:active {
    background-color: #eee;
  }
}

.btn-save {
  flex: 2;
  background-color: #6739b6;
  color: #fff;
  border-radius: 25px;
  height: 46px;
  line-height: 46px;
  font-size: 16px;
  
  &:active {
    opacity: 0.9;
  }
}
</style>
