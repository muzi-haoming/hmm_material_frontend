<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">出库单号</text>
        <input class="input" type="text" v-model="form.code" placeholder="请输入出库单号" />
      </view>

      <view class="form-item">
        <text class="label required">关联订单</text>
        <picker @change="bindOrderChange" :value="orderIndex" :range="orders" range-key="code">
          <view class="input picker-view">
            {{ orders[orderIndex] ? orders[orderIndex].code : '请选择订单' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">领用厂家</text>
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
        <text class="label required">数量</text>
        <input class="input" type="number" v-model="form.quantity" placeholder="请输入数量" />
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


interface Option {
  id: string;
  name: string;
}
interface OrderOption {
  id: string;
  code: string;
}

const form = ref({
  id: '',
  code: '',
  order_id: '',
  manufacturer_id: '',
  product_id: '',
  quantity: ''
});

const orders = ref<OrderOption[]>([]);
const orderIndex = ref(-1);

const manufacturers = ref<Option[]>([]);
const manufacturerIndex = ref(-1);

const products = ref<Option[]>([]);
const productIndex = ref(-1);

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
  const { data: orderData } = await supabase.from('order').select('id, code');
  if (orderData) orders.value = orderData;

  const { data: mData } = await supabase.from('manufacturer').select('id, name');
  if (mData) manufacturers.value = mData;

  const { data: productData } = await supabase.from('product').select('id, name');
  if (productData) products.value = productData;
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('stock_out')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.code = data.code;
    form.value.order_id = data.order_id;
    form.value.manufacturer_id = data.manufacturer_id;
    form.value.product_id = data.product_id;
    form.value.quantity = data.quantity;

    // 设置索引
    orderIndex.value = orders.value.findIndex(o => o.id === data.order_id);
    manufacturerIndex.value = manufacturers.value.findIndex(m => m.id === data.manufacturer_id);
    productIndex.value = products.value.findIndex(p => p.id === data.product_id);
  }
};

const bindOrderChange = (e: any) => {
  orderIndex.value = e.detail.value;
  form.value.order_id = orders.value[orderIndex.value].id;
};

const bindManufacturerChange = (e: any) => {
  manufacturerIndex.value = e.detail.value;
  form.value.manufacturer_id = manufacturers.value[manufacturerIndex.value].id;
};

const bindProductChange = (e: any) => {
  productIndex.value = e.detail.value;
  form.value.product_id = products.value[productIndex.value].id;
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该出库单吗？库存可能需要手动调整。',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('stock_out').delete().eq('id', form.value.id);
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
  if (!form.value.code) return uni.showToast({ title: '请输入单号', icon: 'none' });
  if (!form.value.order_id) return uni.showToast({ title: '请选择订单', icon: 'none' });
  if (!form.value.manufacturer_id) return uni.showToast({ title: '请选择厂家', icon: 'none' });
  if (!form.value.product_id) return uni.showToast({ title: '请选择产品', icon: 'none' });
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });

  loading.value = true;
  
  let error;
  const payload = {
    code: form.value.code,
    order_id: form.value.order_id,
    manufacturer_id: form.value.manufacturer_id,
    product_id: form.value.product_id,
    quantity: Number(form.value.quantity),
    update_time: new Date().toISOString()
  };
  
  if (isEdit.value) {
    const { error: updateError } = await supabase.from('stock_out').update(payload).eq('id', form.value.id);
    error = updateError;
  } else {
    // @ts-ignore
    // payload.id = generated by db
    const { error: insertError } = await supabase.from('stock_out').insert(payload);
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
