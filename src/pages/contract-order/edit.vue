<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">合同</text>
        <view class="input disabled">{{ getContractName() }}</view>
      </view>
      
      <view class="form-item">
        <text class="label required">产品</text>
        <picker 
          mode="selector" 
          :range="products" 
          range-key="name" 
          @change="onProductChange"
        >
          <view class="input picker-value" :class="{ placeholder: !form.product_id }">
            {{ getProductName() || '请选择产品' }}
          </view>
        </picker>
      </view>
      
      <view class="form-item">
        <text class="label required">数量</text>
        <div class="input-group">
            <input 
            class="input" 
            type="digit" 
            v-model="form.quantity" 
            placeholder="请输入数量" 
            />
            <text class="unit" v-if="selectedProduct">{{ selectedProduct.unit }}</text>
        </div>
      </view>

      <view class="form-item">
        <text class="label required">执行模式</text>
        <radio-group @change="onModeChange" class="mode-group">
            <label class="radio-label">
                <radio value="self_produced" :checked="form.mode === 'self_produced'" color="#6739b6" style="transform:scale(0.8)" />
                <text>自产自销</text>
            </label>
            <label class="radio-label">
                <radio value="purchase" :checked="form.mode === 'purchase'" color="#6739b6" style="transform:scale(0.8)" />
                <text>外协采购</text>
            </label>
        </radio-group>
      </view>
    </view>

    <view class="footer">
      <button class="btn-delete" @click="handleDelete" :disabled="loading">删除</button>
      <button class="btn-primary" @click="handleSave" :disabled="loading">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';
import { getCurrentUser, type UserInfo } from '@/utils/permission';

const form = ref({
  contract_id: '',
  product_id: '',
  quantity: '',
  mode: 'self_produced'
});

const contracts = ref<any[]>([]);
const products = ref<any[]>([]);
const loading = ref(false);
const orderId = ref('');
const currentUser = ref<UserInfo | null>(null);

const selectedContract = computed(() => contracts.value.find(c => c.id === form.value.contract_id));
const selectedProduct = computed(() => products.value.find(p => p.id === form.value.product_id));

const getContractName = () => selectedContract.value?.name || '加载中...';
const getProductName = () => selectedProduct.value?.name;

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    currentUser.value = await getCurrentUser();
    await fetchProducts();
    
    if (options.id) {
      orderId.value = options.id;
      await fetchOrderDetails();
    }
  } finally {
    uni.hideLoading();
  }
});

const fetchOrderDetails = async () => {
    const { data } = await supabase
        .from('contract_order')
        .select('*')
        .eq('id', orderId.value)
        .single();
        
    if (data) {
        form.value.contract_id = data.contract_id;
        form.value.product_id = data.product_id;
        form.value.quantity = data.quantity;
        form.value.mode = data.mode || 'self_produced';
        
        // Fetch specific contract info just for display
        const { data: cData } = await supabase
            .from('contract')
            .select('id, name')
            .eq('id', data.contract_id)
            .single();
        if (cData) contracts.value = [cData];
    }
};

const fetchProducts = async () => {
  const { data } = await supabase
    .from('product')
    .select('id, name, code, unit')
    .order('name');
    
  if (data) products.value = data;
};

const onProductChange = (e: any) => {
  const index = e.detail.value;
  form.value.product_id = products.value[index].id;
};

const onModeChange = (e: any) => {
    form.value.mode = e.detail.value;
};

const handleDelete = async () => {
    uni.showModal({
        title: '提示',
        content: '确定要删除此订单吗？',
        success: async (res) => {
            if (res.confirm) {
                loading.value = true;
                const { error } = await supabase
                    .from('contract_order')
                    .delete()
                    .eq('id', orderId.value);
                loading.value = false;
                    
                if (!error) {
                    uni.showToast({ title: '已删除', icon: 'success' });
                    setTimeout(() => {
                        uni.navigateBack({ delta: 2 }); // Back to contract detail likely
                    }, 1500);
                } else {
                     uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
                }
            }
        }
    });
};

const handleSave = async () => {
  if (!form.value.product_id) return uni.showToast({ title: '请选择产品', icon: 'none' });
  if (!form.value.quantity || parseFloat(form.value.quantity) <= 0) return uni.showToast({ title: '请输入有效数量', icon: 'none' });

  loading.value = true;

  const { error } = await supabase.from('contract_order')
    .update({
        product_id: form.value.product_id,
        quantity: parseFloat(form.value.quantity),
        mode: form.value.mode,
        modify_time: new Date().toISOString()
    })
    .eq('id', orderId.value);

  loading.value = false;

  if (error) {
    console.error('Update order error:', error);
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
    color: #333;
    
    &.disabled {
        color: #999;
    }
    
    &.picker-value {
        color: #333;
        &.placeholder {
            color: #808080; 
        }
    }
  }

  .input-group {
      position: relative;
      .input {
          padding-right: 40px;
      }
      .unit {
          position: absolute;
          right: 12px;
          top: 12px;
          font-size: 14px;
          color: #999;
      }
  }
}

.mode-group {
    display: flex;
    gap: 20px;
    height: 44px;
    align-items: center;
}

.radio-label {
    display: flex;
    align-items: center;
    font-size: 14px;
    color: #333;
    
    text {
        margin-left: 4px;
    }
}

.footer {
  margin-top: 30px;
  display: flex;
  gap: 15px;
}

button {
  flex: 1;
  border-radius: 25px;
  height: 46px;
  line-height: 46px;
  font-size: 16px;
  color: #fff;
  border: none;
  
  &:active {
    opacity: 0.9;
  }
  
  &[disabled] {
    opacity: 0.6;
    background-color: #ccc !important;
  }
  
  &::after { border: none; }
}

.btn-delete {
  background-color: #f5f5f5;
  color: #ff4d4f;
}

.btn-primary {
  background-color: #6739b6; // Keeping purple as app theme
}
</style>
