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
  agent_id: '' // 稍后设置为当前用户
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
  
  // 设置默认经办人为当前用户（简单实现）
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    // 需要找到与 auth.user 匹配的 public.user id（或者如果用户表未与 auth 同步，则仅作模拟）
    // 目前假设我们需要一个来自 public.user 表的有效 ID。
    // 在实际应用中，我们会获取映射的用户。
    // 让我们搜索一个用户，或者如果这是一个真实流程则创建一个。
    // 简化：如果无法映射，我们将仅选取 public.user 中的第一个用户作为默认经办人。
    const { data: users } = await supabase.from('user').select('id').limit(1);
    if (users && users.length > 0) {
      form.value.agent_id = users[0].id; // 临时：指定第一个用户为经办人
    }
  }

  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const fetchOptions = async () => {
  // 获取工地
  const { data: siteData } = await supabase.from('site').select('id, name');
  if (siteData) sites.value = siteData;

  // 获取厂家组
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

    // 设置索引
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
     // 安全检查：如果没有分配经办人
     const { data: users } = await supabase.from('user').select('id').limit(1);
     if (users && users.length > 0) form.value.agent_id = users[0].id;
     else return uni.showToast({ title: '系统未配置用户，无法分配负责人', icon: 'none' });
  }

  loading.value = true;
  
  let error;
  
  if (isEdit.value) {
    // 更新
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
    // 插入
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
    align-items: center; // 用于 picker view 内部文字对齐
  }
  
  .picker-view {
    color: #333; // 默认颜色
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
