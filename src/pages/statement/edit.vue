<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">对账单号</text>
        <input class="input" type="text" v-model="form.code" disabled placeholder="自动生成" />
      </view>
      
      <view class="form-item">
        <text class="label required">选择合同</text>
        <picker 
          mode="selector" 
          :range="contracts" 
          range-key="name" 
          @change="onContractChange"
          :disabled="isEdit"
        >
          <view class="input picker-view" :class="{ disabled: isEdit }">
            {{ getContractName() || '请选择合同' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">开始日期</text>
        <picker mode="date" :value="form.start_time" @change="bindStartDateChange">
          <view class="input picker-view">
            {{ form.start_time || '请选择开始日期' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">结束日期</text>
        <picker mode="date" :value="form.end_time" @change="bindEndDateChange">
          <view class="input picker-view">
            {{ form.end_time || '请选择结束日期' }}
          </view>
        </picker>
      </view>
    </view>

    <view class="footer">
      <button class="btn-delete" v-if="isEdit" @click="handleDelete" :disabled="submitting">删除</button>
      <button class="btn-save" @click="submit" :disabled="submitting">
        {{ submitting ? '保存中...' : '保存' }}
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

const form = ref({
  id: '',
  code: '',
  contract_id: '',
  start_time: '',
  end_time: ''
});

const contracts = ref<any[]>([]);
const isEdit = ref(false);
const submitting = ref(false);
const currentUser = ref<UserInfo | null>(null);

const selectedContract = computed(() => contracts.value.find(c => c.id === form.value.contract_id));
const getContractName = () => selectedContract.value?.name;

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    currentUser.value = await getCurrentUser();
    await fetchContracts();
    
    if (options.id) {
      isEdit.value = true;
      form.value.id = options.id;
      await loadData(options.id);
    } else {
      await initCode();
      // Default dates
      const now = new Date();
      form.value.end_time = now.toISOString().split('T')[0];
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);
      form.value.start_time = lastMonth.toISOString().split('T')[0];
    }
  } finally {
    uni.hideLoading();
  }
});

const initCode = async () => {
  form.value.code = await generateCode('statement', 'JSD');
};

const fetchContracts = async () => {
  const { data } = await supabase
    .from('contract')
    .select('id, name, site_id')
    .eq('is_confirmed', true)
    .eq('is_completed', false)
    .order('create_time', { ascending: false });
    
  if (data) {
     if (currentUser.value?.is_admin) {
         contracts.value = data;
     } else {
         const allowedSites = currentUser.value?.site_permissions || [];
         contracts.value = data.filter(c => allowedSites.includes(c.site_id));
     }
  }
};

const loadData = async (id: string) => {
  const { data } = await supabase.from('statement').select('*').eq('id', id).single();
  if (data) {
    form.value = {
        ...data,
        start_time: data.start_time.split('T')[0],
        end_time: data.end_time.split('T')[0]
    };
  }
};

const onContractChange = (e: any) => {
  const index = e.detail.value;
  form.value.contract_id = contracts.value[index].id;
};

const bindStartDateChange = (e: any) => {
  form.value.start_time = e.detail.value;
};

const bindEndDateChange = (e: any) => {
  form.value.end_time = e.detail.value;
};

const submit = async () => {
  if (!form.value.contract_id) return uni.showToast({ title: '请选择合同', icon: 'none' });
  if (!form.value.start_time) return uni.showToast({ title: '请选择开始日期', icon: 'none' });
  if (!form.value.end_time) return uni.showToast({ title: '请选择结束日期', icon: 'none' });
  
  submitting.value = true;
  
  const payload = {
    code: form.value.code,
    contract_id: form.value.contract_id,
    start_time: form.value.start_time,
    end_time: form.value.end_time
  };
  
  let targetId = form.value.id;
  let error;
  
  if (isEdit.value) {
     const { error: updateError } = await supabase.from('statement').update({
         start_time: form.value.start_time,
         end_time: form.value.end_time
     }).eq('id', targetId);
     error = updateError;
  } else {
     const { data, error: insertError } = await supabase.from('statement').insert(payload).select().single();
     if (data) targetId = data.id;
     error = insertError;
  }
  
  submitting.value = false;
  
  if (error) {
    uni.showToast({ title: '保存失败: ' + error.message, icon: 'none' });
  } else {
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
        // Redirect to detail page
        uni.redirectTo({ url: `/pages/statement/detail?id=${targetId}` });
    }, 1500);
  }
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该对账单吗？',
    success: async (res) => {
      if (res.confirm) {
        submitting.value = true;
        const { error } = await supabase.from('statement').delete().eq('id', form.value.id);
        submitting.value = false;
        
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
</script>

<style lang="scss">
.container {
  padding: 15px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.form-card {
  background: #fff;
  border-radius: 10px;
  padding: 15px;
}
.form-item {
  margin-bottom: 20px;
  .label { display: block; margin-bottom: 8px; font-size: 14px; color: #666; }
  .required::after { content: '*'; color: red; margin-left: 2px; }
  .input { background: #f9f9f9; height: 44px; line-height: 44px; padding: 0 10px; border-radius: 6px; font-size: 15px; }
  .picker-view { color: #333; &.disabled { color: #999; } }
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
  border: none;
  
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
  border: none;
  
  &:active {
    opacity: 0.9;
  }
}
</style>
