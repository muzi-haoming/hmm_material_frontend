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
          :disabled="isFixedContract"
        >
          <view class="picker-value" :class="{ placeholder: !form.contract_id, disabled: isFixedContract }">
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

      <view class="form-item">
        <text class="label">执行模式</text>
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

    <view class="submit-btn-box">
      <button class="submit-btn" :loading="submitting" @click="submit">提交订单</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
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
const submitting = ref(false);
const currentUser = ref<UserInfo | null>(null);

const isFixedContract = ref(false);

const selectedContract = computed(() => contracts.value.find(c => c.id === form.value.contract_id));
const selectedProduct = computed(() => products.value.find(p => p.id === form.value.product_id));

const getContractName = () => selectedContract.value?.name;
const getProductName = () => selectedProduct.value?.name;

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    currentUser.value = await getCurrentUser();
    
    if (options.contractId) {
       form.value.contract_id = options.contractId;
       isFixedContract.value = true;
    }
    
    await fetchContracts();
    await fetchProducts();
  } finally {
    uni.hideLoading();
  }
});

const fetchContracts = async () => {
  // Only fetching confirmed and incomplete contracts
  let query = supabase
    .from('contract')
    .select('id, name, code, is_confirmed, is_completed, site_id')
    .eq('is_confirmed', true)
    .eq('is_completed', false)
    .order('create_time', { ascending: false });

  const { data, error } = await query;
    
  if (data) {
    if (currentUser.value?.is_admin) {
        contracts.value = data;
    } else {
        // Only show contracts for sites the user manages
        const allowedSites = currentUser.value?.site_permissions || [];
        contracts.value = data.filter(c => allowedSites.includes(c.site_id));
    }
    
    // If fixed contract is set but not in list (e.g. maybe rules changed?), we should probably fetch it to validly display it
    if (isFixedContract.value && !contracts.value.find(c => c.id === form.value.contract_id)) {
        const { data: singleContract } = await supabase
            .from('contract')
            .select('id, name, code, is_confirmed, is_completed, site_id')
            .eq('id', form.value.contract_id)
            .single();
        if (singleContract) {
            contracts.value.push(singleContract);
        }
    }
  }
};

const fetchProducts = async () => {
  const { data, error } = await supabase
    .from('product')
    .select('id, name, code, unit')
    .order('name');
    
  if (data) products.value = data;
};

const onContractChange = (e: any) => {
  if (isFixedContract.value) return; 
  const index = e.detail.value;
  form.value.contract_id = contracts.value[index].id;
};

const onProductChange = (e: any) => {
  const index = e.detail.value;
  form.value.product_id = products.value[index].id;
};

const onModeChange = (e: any) => {
    form.value.mode = e.detail.value;
};

const submit = async () => {
  if (!form.value.contract_id) return uni.showToast({ title: '请选择合同', icon: 'none' });
  if (!form.value.product_id) return uni.showToast({ title: '请选择产品', icon: 'none' });
  if (!form.value.quantity || parseFloat(form.value.quantity) <= 0) return uni.showToast({ title: '请输入有效数量', icon: 'none' });

  submitting.value = true;
  
  // Generate code
  const code = await generateCode('contract_order', 'HTDD');

  const { error } = await supabase.from('contract_order').insert({
    code: code,
    contract_id: form.value.contract_id,
    product_id: form.value.product_id,
    quantity: parseFloat(form.value.quantity),
    mode: form.value.mode,
    is_confirmed: false,
    is_completed: false
  });

  submitting.value = false;

  if (error) {
    console.error('Create order error:', error);
    uni.showToast({ title: '创建失败: ' + error.message, icon: 'none' });
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
    
    &.disabled {
      color: #666;
      background-color: transparent;
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

.mode-group {
    flex: 1;
    display: flex;
    gap: 20px;
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
