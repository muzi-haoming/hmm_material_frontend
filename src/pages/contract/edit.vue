<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">合同编号</text>
        <input class="input" type="text" v-model="form.code" placeholder="请输入合同编号" />
      </view>

      <view class="form-item">
        <text class="label required">合同名称</text>
        <input class="input" type="text" v-model="form.name" placeholder="请输入合同名称" />
      </view>

      <view class="form-item">
        <text class="label required">关联工地</text>
        <picker @change="bindSiteChange" :value="siteIndex" :range="sites" range-key="name">
          <view class="input picker-view">
            {{ sites[siteIndex] ? sites[siteIndex].name : '请选择工地' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">关联厂家组</text>
        <picker @change="bindGroupChange" :value="groupIndex" :range="groups" range-key="name">
          <view class="input picker-view">
            {{ groups[groupIndex] ? groups[groupIndex].name : '请选择厂家组' }}
          </view>
        </picker>
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
  name: '',
  code: '',
  site_id: '',
  manufacturer_group_id: '',
  status: '0',
  agent_id: '' // Will set to current user later
});

const sites = ref<Option[]>([]);
const siteIndex = ref(-1);

const groups = ref<Option[]>([]);
const groupIndex = ref(-1);

const statusOptions = [
  { label: '待签订', value: '0' },
  { label: '已签订', value: '1' },
  { label: '已完成', value: '2' },
  { label: '已终止', value: '3' }
];
const statusIndex = ref(0);

const loading = ref(false);
const isEdit = ref(false);

onLoad(async (options: any) => {
  await fetchOptions();
  
  // Set default agent to current user (simple implementation)
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // Need to find matching public.user id for auth.user (or just mock for now if user table not synced with auth)
    // For now assuming we need a valid ID from public.user table.
    // In real app, we would fetch the mapped user.
    // Let's search for a user or create one if this was a real flow.
    // Simplification: We will just pick the first user from public.user as default agent if we can't map.
    const { data: users } = await supabase.from('user').select('id').limit(1);
    if (users && users.length > 0) {
      form.value.agent_id = users[0].id; // Temporary: assign first user as agent
    }
  }

  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const fetchOptions = async () => {
  // Fetch Sites
  const { data: siteData } = await supabase.from('site').select('id, name');
  if (siteData) sites.value = siteData;

  // Fetch Groups
  const { data: groupData } = await supabase.from('manufacturer_group').select('id, name');
  if (groupData) groups.value = groupData;
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('contract')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.name = data.name;
    form.value.code = data.code;
    form.value.site_id = data.site_id;
    form.value.manufacturer_group_id = data.manufacturer_group_id;
    form.value.status = data.status;
    form.value.agent_id = data.agent_id;

    // Set Indices
    siteIndex.value = sites.value.findIndex(s => s.id === data.site_id);
    groupIndex.value = groups.value.findIndex(g => g.id === data.manufacturer_group_id);
    statusIndex.value = statusOptions.findIndex(o => o.value === data.status);
  }
};

const bindSiteChange = (e: any) => {
  siteIndex.value = e.detail.value;
  form.value.site_id = sites.value[siteIndex.value].id;
};

const bindGroupChange = (e: any) => {
  groupIndex.value = e.detail.value;
  form.value.manufacturer_group_id = groups.value[groupIndex.value].id;
};

const bindStatusChange = (e: any) => {
  statusIndex.value = e.detail.value;
  form.value.status = statusOptions[statusIndex.value].value;
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该合同吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('contract').delete().eq('id', form.value.id);
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
  if (!form.value.name) return uni.showToast({ title: '请输入合同名称', icon: 'none' });
  if (!form.value.code) return uni.showToast({ title: '请输入合同编号', icon: 'none' });
  if (!form.value.site_id) return uni.showToast({ title: '请选择工地', icon: 'none' });
  if (!form.value.manufacturer_group_id) return uni.showToast({ title: '请选择厂家组', icon: 'none' });
  
  if (!form.value.agent_id) {
     // Safety check if no agent assigned
     const { data: users } = await supabase.from('user').select('id').limit(1);
     if (users && users.length > 0) form.value.agent_id = users[0].id;
     else return uni.showToast({ title: '系统未配置用户，无法分配负责人', icon: 'none' });
  }

  loading.value = true;
  
  let error;
  
  if (isEdit.value) {
    // Update
    const { error: updateError } = await supabase
      .from('contract')
      .update({
        name: form.value.name,
        code: form.value.code,
        site_id: form.value.site_id,
        manufacturer_group_id: form.value.manufacturer_group_id,
        status: form.value.status,
        agent_id: form.value.agent_id,
        update_time: new Date().toISOString()
      })
      .eq('id', form.value.id);
    error = updateError;
  } else {
    // Insert
    const { error: insertError } = await supabase
      .from('contract')
      .insert({
        id: uuidv4(),
        name: form.value.name,
        code: form.value.code,
        site_id: form.value.site_id,
        manufacturer_group_id: form.value.manufacturer_group_id,
        status: form.value.status,
        agent_id: form.value.agent_id
      });
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
