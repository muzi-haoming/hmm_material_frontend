<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">厂家</text>
        <picker @change="bindManufacturerChange" :value="manufacturerIndex" :range="manufacturers" range-key="name">
          <view class="input picker-view">
            {{ manufacturers[manufacturerIndex] ? manufacturers[manufacturerIndex].name : '请选择厂家' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">产品</text>
        <picker @change="bindProductChange" :value="productIndex" :range="products" range-key="name">
          <view class="input picker-view">
            {{ products[productIndex] ? products[productIndex].name : '请选择产品' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label required">库存数量</text>
        <input class="input" type="number" v-model="form.quantity" placeholder="请输入数量" />
        <view class="hint">注：通常库存由出入库自动增减，此处为手动盘点修正。</view>
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
  product_id: '',
  manufacturer_id: '',
  quantity: ''
});

const products = ref<Option[]>([]);
const productIndex = ref(-1);

const manufacturers = ref<Option[]>([]);
const manufacturerIndex = ref(-1);

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
  const { data: productData } = await supabase.from('product').select('id, name');
  if (productData) products.value = productData;

  const { data: mData } = await supabase.from('manufacturer').select('id, name');
  if (mData) manufacturers.value = mData;
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('stock')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.product_id = data.product_id;
    form.value.manufacturer_id = data.manufacturer_id;
    form.value.quantity = data.quantity;

    // Set Indices
    productIndex.value = products.value.findIndex(p => p.id === data.product_id);
    manufacturerIndex.value = manufacturers.value.findIndex(m => m.id === data.manufacturer_id);
  }
};

const bindProductChange = (e: any) => {
  productIndex.value = e.detail.value;
  form.value.product_id = products.value[productIndex.value].id;
};

const bindManufacturerChange = (e: any) => {
  manufacturerIndex.value = e.detail.value;
  form.value.manufacturer_id = manufacturers.value[manufacturerIndex.value].id;
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该库存记录吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('stock').delete().eq('id', form.value.id);
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
  if (!form.value.product_id) return uni.showToast({ title: '请选择产品', icon: 'none' });
  if (!form.value.manufacturer_id) return uni.showToast({ title: '请选择厂家', icon: 'none' });
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });

  loading.value = true;
  
  let error;
  const payload = {
    product_id: form.value.product_id,
    manufacturer_id: form.value.manufacturer_id,
    quantity: Number(form.value.quantity)
  };
  
  if (isEdit.value) {
    const { error: updateError } = await supabase.from('stock').update(payload).eq('id', form.value.id);
    error = updateError;
  } else {
    // Check if stock already exists for this product + manufacturer
    const { data: existing } = await supabase
      .from('stock')
      .select('id')
      .eq('product_id', form.value.product_id)
      .eq('manufacturer_id', form.value.manufacturer_id)
      .single();
      
    if (existing) {
       uni.showToast({ title: '该产品在该厂家已有库存，请修改', icon: 'none' });
       loading.value = false;
       return;
    }

    // @ts-ignore
    payload.id = uuidv4();
    const { error: insertError } = await supabase.from('stock').insert(payload);
    error = insertError;
  }

  loading.value = false;

  if (error) {
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
    align-items: center; 
  }
  .picker-view {
    color: #333; 
  }
  .hint {
    font-size: 12px;
    color: #999;
    margin-top: 5px;
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
