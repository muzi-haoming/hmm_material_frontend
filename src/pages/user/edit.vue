<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label">用户名</text>
        <input class="input disabled" type="text" v-model="form.username" disabled />
      </view>
      <view class="form-item">
        <text class="label">姓名</text>
        <input class="input disabled" type="text" v-model="form.name" disabled />
      </view>
      
      <view class="form-item">
        <text class="label required">分配角色</text>
        <picker @change="bindRoleChange" :value="roleIndex" :range="roles" range-key="name">
          <view class="input picker-view">
            {{ roles[roleIndex] ? roles[roleIndex].name : '请选择角色' }}
          </view>
        </picker>
      </view>
    </view>

    <view class="footer">
      <button class="btn-save" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存修改' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';

interface RoleOption {
  id: string;
  name: string;
}

const form = ref({
  id: '',
  username: '',
  name: '',
  role_id: ''
});

const roles = ref<RoleOption[]>([]);
const roleIndex = ref(-1);

const loading = ref(false);

onLoad(async (options: any) => {
  await fetchRoles();
  
  if (options.id) {
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const fetchRoles = async () => {
  const { data } = await supabase.from('user_role').select('id, name');
  if (data) roles.value = data;
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('user')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.username = data.username;
    form.value.name = data.name;
    form.value.role_id = data.role_id;

    roleIndex.value = roles.value.findIndex(r => r.id === data.role_id);
  }
};

const bindRoleChange = (e: any) => {
  roleIndex.value = e.detail.value;
  form.value.role_id = roles.value[roleIndex.value].id;
};

const handleSave = async () => {
  if (!form.value.role_id) return uni.showToast({ title: '请选择角色', icon: 'none' });

  loading.value = true;
  
  const { error } = await supabase
    .from('user')
    .update({ role_id: form.value.role_id })
    .eq('id', form.value.id);

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
    
    &.disabled {
      color: #999;
      background-color: #f0f0f0;
    }
  }
  
  .picker-view {
    color: #333;
  }
}

.footer {
  margin-top: 30px;
}

.btn-save {
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
