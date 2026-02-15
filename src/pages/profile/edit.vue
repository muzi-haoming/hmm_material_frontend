<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label">姓名</text>
        <input class="input disabled" type="text" v-model="form.name" disabled placeholder="未设置" />
      </view>
      <view class="form-item">
        <text class="label">昵称</text>
        <input class="input disabled" type="text" v-model="form.nickname" disabled placeholder="未设置" />
      </view>
      <view class="form-item">
        <text class="label">手机</text>
        <input class="input disabled" type="text" v-model="form.phone" disabled placeholder="未设置" />
      </view>
      <view class="form-item">
        <text class="label">邮箱</text>
        <input class="input disabled" type="text" v-model="form.email" disabled placeholder="未设置" />
      </view>
      
      <view class="form-item">
        <text class="label required">用户角色</text>
        <picker @change="bindRoleChange" :value="roleIndex" :range="roles" range-key="name">
          <view class="input picker-view">
            {{ roles[roleIndex] ? roles[roleIndex].name : '请选择角色' }}
            <text class="iconfont icon-down"></text>
          </view>
        </picker>
      </view>
    </view>

    <view class="footer">
      <button class="btn-delete" @click="handleDelete" :disabled="loading">删除</button>
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

interface RoleOption {
  id: string;
  name: string;
}

const form = ref({
  id: '',
  name: '',
  nickname: '',
  phone: '',
  email: '',
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
    .from('profile')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.name = data.name;
    form.value.nickname = data.nickname || '';
    form.value.phone = data.phone || '';
    form.value.email = data.email || '';
    
    form.value.role_id = data.role_id;
    
    if (form.value.role_id) {
        roleIndex.value = roles.value.findIndex(r => r.id === data.role_id);
    }
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
    .from('profile')
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

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该用户吗？(仅删除档案)',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('profile').delete().eq('id', form.value.id);
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
    justify-content: space-between;
  }
  
  .icon-down {
      color: #ccc;
      font-size: 12px;
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
  border: none;
  
  &:active {
    background-color: #eee;
  }
  
  &[disabled] {
      opacity: 0.6;
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
  
  &[disabled] {
      opacity: 0.6;
      background-color: #ccc;
  }
}
</style>
