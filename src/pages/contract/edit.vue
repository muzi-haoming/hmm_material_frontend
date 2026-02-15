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
        <text class="label required">代理人</text>
        <picker v-if="isAdmin" @change="bindAgentChange" :value="agentIndex" :range="agents" range-key="name">
          <view class="input picker-view">
            {{ agents[agentIndex] ? agents[agentIndex].name : '请选择代理人' }}
          </view>
        </picker>
        <view v-else class="input disabled">
           {{ getAgentName(form.agent_id) }}
        </view>
      </view>
    </view>

    <view class="footer">
      <!-- 新增模式 -->
      <template v-if="!isEdit">
        <button class="btn-save" @click="handleSave(false)" :disabled="loading">保存</button>
        <button class="btn-primary" @click="handleSave(true)" :disabled="loading">保存并确认</button>
      </template>

      <!-- 编辑模式 -->
      <template v-else>
        <!-- 未确认 + 未封存 -->
        <template v-if="!form.is_confirmed && !form.is_archived">
          <button class="btn-delete" @click="handleDelete" :disabled="loading">删除</button>
          <button class="btn-save" @click="handleSave(false)" :disabled="loading">保存</button>
          <button class="btn-primary" @click="handleConfirm" :disabled="loading">确认</button>
        </template>

        <!-- 已确认 + 未封存 -->
        <template v-if="form.is_confirmed && !form.is_archived">
          <button class="btn-warning" @click="handleCancelConfirm" :disabled="loading">取消确认</button>
          <button v-if="isAdmin" class="btn-danger" @click="handleArchive" :disabled="loading">封存</button>
        </template>

        <!-- 已确认 + 已封存 -->
        <template v-if="form.is_confirmed && form.is_archived">
          <button v-if="isAdmin" class="btn-primary" @click="handleReactivate" :disabled="loading">重新启用</button>
        </template>
      </template>
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

const form = ref({
  id: '',
  name: '',
  code: '',
  site_id: '',
  manufacturer_group_id: '',
  is_confirmed: false,
  is_archived: false,
  agent_id: '' // 稍后设置为当前用户
});

const sites = ref<Option[]>([]);
const siteIndex = ref(-1);

const groups = ref<Option[]>([]);
const groupIndex = ref(-1);

const agents = ref<Option[]>([]);
const agentIndex = ref(-1);
const isAdmin = ref(false);
const currentUserId = ref('');

const loading = ref(false);
const isEdit = ref(false);

onLoad(async (options: any) => {
  await fetchOptions();
  await fetchCurrentUser();

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
  
  // 获取所有用户作为潜在经办人
  const { data: agentData } = await supabase.from('profile').select('id, name');
  if (agentData) agents.value = agentData;
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
    form.value.is_confirmed = data.is_confirmed;
    form.value.is_archived = data.is_archived;
    form.value.agent_id = data.agent_id;

    // 设置索引
    siteIndex.value = sites.value.findIndex(s => s.id === data.site_id);
    groupIndex.value = groups.value.findIndex(g => g.id === data.manufacturer_group_id);
    
    // 如果是编辑模式，确保 agentIndex 正确
    if (agents.value.length > 0) {
      agentIndex.value = agents.value.findIndex(a => a.id === data.agent_id);
    }
  }
};

const fetchCurrentUser = async () => {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profile')
      .select('id, name, role:role_id(code)')
      .eq('id', user.id)
      .single();
      
    if (profile) {
      currentUserId.value = profile.id;
      // @ts-ignore
      const roleCode = profile.role?.code;
      isAdmin.value = roleCode === 'admin';
      
      // 如果不是管理员且是新增模式，或者虽然是编辑模式但没有经办人，默认设为自己
      if (!isAdmin.value || !form.value.agent_id) {
        form.value.agent_id = profile.id;
      }
    }
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

const bindAgentChange = (e: any) => {
  agentIndex.value = e.detail.value;
  form.value.agent_id = agents.value[agentIndex.value].id;
};

const getAgentName = (id: string) => {
  if (!id) return '自动关联当前用户';
  const agent = agents.value.find(a => a.id === id);
  return agent ? agent.name : '未知用户';
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

const handleSave = async (autoConfirm = false) => {
  if (!form.value.name) return uni.showToast({ title: '请输入合同名称', icon: 'none' });
  if (!form.value.code) return uni.showToast({ title: '请输入合同编号', icon: 'none' });
  if (!form.value.site_id) return uni.showToast({ title: '请选择工地', icon: 'none' });
  if (!form.value.manufacturer_group_id) return uni.showToast({ title: '请选择厂家组', icon: 'none' });

  loading.value = true;
  
  let error;
  
  const payload = {
    name: form.value.name,
    code: form.value.code,
    site_id: form.value.site_id,
    manufacturer_group_id: form.value.manufacturer_group_id,
    agent_id: form.value.agent_id,
    // 保存时不修改确认/封存状态，除非是新增并确认
    ...(isEdit.value ? { update_time: new Date().toISOString() } : {
       is_confirmed: autoConfirm,
       is_archived: false
    })
  };

  if (isEdit.value) {
    // 编辑模式下的保存，只更新基础字段，不更改状态 logic handled by separate buttons
    const { error: updateError } = await supabase
      .from('contract')
      .update(payload)
      .eq('id', form.value.id)
      // 乐观锁：确保当前状态未锁定，或者只允许修改基础信息。
      // 这里假设编辑非状态字段不需要严格锁，只要记录存在。
      // 但如果要求未确认才能修改基础信息:
      .eq('is_confirmed', false); 
      
    error = updateError;
    if (error && error.code === 'PGRST116') { // No rows updated usually means condition failed
       error.message = '合同已确认或不存在，无法修改';
    }
  } else {
    // 插入
    const { error: insertError } = await supabase
      .from('contract')
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

const handleConfirm = async () => {
   loading.value = true;
   // 乐观锁：更新时确保当前通过 is_confirmed = false 判断
   const { error } = await supabase
     .from('contract')
     .update({ is_confirmed: true, update_time: new Date().toISOString() })
     .eq('id', form.value.id)
     .eq('is_confirmed', false);

   loading.value = false;
   if (error) {
      uni.showToast({ title: '确认失败: 可能是状态已变更', icon: 'none' });
   } else {
      form.value.is_confirmed = true;
      uni.showToast({ title: '已确认', icon: 'success' });
   }
};

const handleCancelConfirm = async () => {
   loading.value = true;
   // 乐观锁：更新时确保当前通过 is_confirmed = true 判断
   const { error } = await supabase
     .from('contract')
     .update({ is_confirmed: false, update_time: new Date().toISOString() })
     .eq('id', form.value.id)
     .eq('is_confirmed', true)
     .eq('is_archived', false); // 只有未封存的可以取消确认

   loading.value = false;
   if (error) {
      uni.showToast({ title: '取消失败: 可能是状态已变更', icon: 'none' });
   } else {
      form.value.is_confirmed = false;
      uni.showToast({ title: '已取消确认', icon: 'success' });
   }
};

const handleArchive = async () => {
   loading.value = true;
   const { error } = await supabase
     .from('contract')
     .update({ is_archived: true, update_time: new Date().toISOString() })
     .eq('id', form.value.id)
     .eq('is_confirmed', true)
     .eq('is_archived', false);

   loading.value = false;
   if (error) {
      uni.showToast({ title: '封存失败', icon: 'none' });
   } else {
      form.value.is_archived = true;
      uni.showToast({ title: '已封存', icon: 'success' });
   }
};

const handleReactivate = async () => {
   loading.value = true;
   const { error } = await supabase
     .from('contract')
     .update({ is_archived: false, update_time: new Date().toISOString() })
     .eq('id', form.value.id)
     .eq('is_archived', true);

   loading.value = false;
   if (error) {
      uni.showToast({ title: '启用失败', icon: 'none' });
   } else {
      form.value.is_archived = false;
      uni.showToast({ title: '已重新启用', icon: 'success' });
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
  
  .disabled {
    color: #999;
    background-color: #f5f5f5;
  }
}

.footer {
  margin-top: 30px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap; /* Allow wrapping if too many buttons */
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
}

.btn-delete {
  background-color: #f5f5f5;
  color: #ff4d4f;
}

.btn-save {
  background-color: #6739b6;
}

.btn-primary {
  background-color: #1890ff;
}

.btn-warning {
  background-color: #fa8c16;
}

.btn-danger {
  background-color: #ff4d4f;
}
</style>
