<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">合同编号</text>
        <input class="input" type="text" v-model="form.code" placeholder="请输入合同编号" :disabled="!canEditBasicInfo" />
      </view>

      <view class="form-item">
        <text class="label required">合同名称</text>
        <input class="input" type="text" v-model="form.name" placeholder="请输入合同名称" :disabled="!canEditBasicInfo" />
      </view>

      <view class="form-item">
        <text class="label required">关联工地</text>
        <picker @change="bindSiteChange" :value="siteIndex" :range="sites" range-key="name" :disabled="!canEditBasicInfo">
          <view class="input picker-view" :class="{ disabled: !canEditBasicInfo }">
            {{ sites[siteIndex] ? sites[siteIndex].name : '请选择工地' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">关联厂家</text>
        <view class="manufacturer-list">
          <view v-if="selectedManufacturers.length === 0" class="empty-hint">
            未选择厂家
          </view>
          <view v-for="(mfr, index) in selectedManufacturers" :key="mfr.id" class="manufacturer-item">
            <text class="manufacturer-name">{{ mfr.name }}</text>
            <view v-if="isAdmin && canEditBasicInfo" class="remove-btn" @click="removeManufacturer(index)">
              <text>×</text>
            </view>
          </view>
        </view>
        <button v-if="isAdmin && canEditBasicInfo" class="btn-add-manufacturer" @click="showManufacturerPicker">
          + 添加厂家
        </button>
      </view>

      <view class="form-item">
        <text class="label required">代理人</text>
        <picker v-if="isAdmin && canEditBasicInfo" @change="bindAgentChange" :value="agentIndex" :range="agents" range-key="nickname">
          <view class="input picker-view">
            {{ agents[agentIndex] ? (agents[agentIndex].nickname || agents[agentIndex].full_name || '未设置昵称') : '请选择代理人' }}
          </view>
        </picker>
        <view v-else class="input disabled">
           {{ getAgentName(form.agent_id) }}
        </view>
      </view>

      <view v-if="isEdit" class="form-item">
        <text class="label">合同状态</text>
        <view class="status-badge" :class="'status-' + billStatus">
          {{ billStatusText }}
        </view>
      </view>
    </view>

    <view class="footer">
      <button v-if="isEdit" class="btn-delete" @click="handleDelete" :disabled="loading">删除</button>
      <button class="btn-primary" @click="handleSave" :disabled="loading">保存</button>
    </view>

    <!-- 厂家选择弹窗 -->
    <view v-if="showMfrPicker" class="modal-overlay" @click="closeMfrPicker">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择厂家</text>
          <view class="modal-close" @click="closeMfrPicker">
            <text>×</text>
          </view>
        </view>
        <scroll-view class="modal-body" scroll-y>
          <view v-for="mfr in availableManufacturers" :key="mfr.id" class="mfr-option" @click="addManufacturer(mfr)">
            <text>{{ mfr.name }}</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';
import type { PickerOption } from '@/types';
import { BillStatus, getBillStatus, BillStatusText } from '@/types';
import { getCurrentUser, type UserInfo } from '@/utils/permission';

interface Manufacturer {
  id: string;
  name: string;
}

const form = ref({
  id: '',
  name: '',
  code: '',
  site_id: '',
  agent_id: '',
  is_confirmed: false,
  is_completed: false
});

const sites = ref<PickerOption[]>([]);
const siteIndex = ref(-1);

const manufacturers = ref<Manufacturer[]>([]);
const selectedManufacturers = ref<Manufacturer[]>([]);
const showMfrPicker = ref(false);

const agents = ref<PickerOption[]>([]);
const agentIndex = ref(-1);
const isAdmin = ref(false);
const currentUserId = ref('');
const currentUser = ref<UserInfo | null>(null);

const loading = ref(false);
const isEdit = ref(false);

// 计算当前单据状态
const billStatus = computed(() => getBillStatus(form.value.is_confirmed, form.value.is_completed));
const billStatusText = computed(() => BillStatusText[billStatus.value]);

// 是否可以编辑基本信息 (仅未确认状态可编辑)
const canEditBasicInfo = computed(() => billStatus.value === BillStatus.UNCONFIRMED);

// 可选择的厂家列表 (排除已选择的)
const availableManufacturers = computed(() => {
  const selectedIds = new Set(selectedManufacturers.value.map(m => m.id));
  return manufacturers.value.filter(m => !selectedIds.has(m.id));
});

onLoad(async (options: any) => {
  await fetchCurrentUser(); // 先获取用户权限
  await fetchOptions();

  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const fetchOptions = async () => {
  // 获取工地
  // 根据权限过滤工地
  let siteQuery = supabase.from('site').select('id, name');
  if (!isAdmin.value && currentUser.value?.site_permissions) {
      // 只能选择有权限的工地
      // Supabase .in() filters
      if (currentUser.value.site_permissions.length > 0) {
        siteQuery = siteQuery.in('id', currentUser.value.site_permissions);
      } else {
        // 无任何工地权限
        sites.value = [];
        return; 
      }
  }
  const { data: siteData } = await siteQuery;
  if (siteData) sites.value = siteData;

  // 获取厂家
  const { data: mfrData } = await supabase.from('manufacturer').select('id, name');
  if (mfrData) manufacturers.value = mfrData;
  
  // 获取所有用户作为潜在代理人
  // 只有管理员需要获取所有代理人列表
  if (isAdmin.value) {
    const { data: agentData } = await supabase.from('profile').select('id, nickname, full_name');
    if (agentData) agents.value = agentData as any;
  }
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('contract')
    .select('*')
    .eq('id', id)
    .single();
    
  if (data) {
    form.value.name = data.name;
    form.value.code = data.code;
    form.value.site_id = data.site_id;
    form.value.agent_id = data.agent_id;
    form.value.is_confirmed = data.is_confirmed;
    form.value.is_completed = data.is_completed;

    // 设置索引
    // 注意: 如果当前用户没权限看这个工地, siteIndex可能是-1, 显示会有问题
    siteIndex.value = sites.value.findIndex(s => s.id === data.site_id);
    
    if (agents.value.length > 0) {
      agentIndex.value = agents.value.findIndex(a => a.id === data.agent_id);
    }

    // 加载关联的厂家
    await loadManufacturers(id);
  }
  
  uni.hideLoading();
};

const loadManufacturers = async (contractId: string) => {
  const { data } = await supabase
    .from('contract_manufacturer_rela')
    .select('manufacturer_id')
    .eq('contract_id', contractId);
    
  if (data) {
    const mfrIds = data.map(d => d.manufacturer_id);
    selectedManufacturers.value = manufacturers.value.filter(m => mfrIds.includes(m.id));
  }
};

const fetchCurrentUser = async () => {
    const user = await getCurrentUser();
    if(user){
        currentUser.value = user;
        currentUserId.value = user.id;
        isAdmin.value = user.is_admin;
        
        if (!isEdit.value || !form.value.agent_id) {
            form.value.agent_id = user.id;
        }
    }
};

const bindSiteChange = (e: any) => {
  siteIndex.value = e.detail.value;
  form.value.site_id = sites.value[siteIndex.value].id;
};

const bindAgentChange = (e: any) => {
  agentIndex.value = e.detail.value;
  form.value.agent_id = agents.value[agentIndex.value].id;
};

const getAgentName = (id: string) => {
  if (!id) return '自动关联当前用户';
  const agent = agents.value.find(a => a.id === id);
  return agent ? (agent.nickname || agent.full_name || '未知用户') : '未知用户';
};

const showManufacturerPicker = () => {
  showMfrPicker.value = true;
};

const closeMfrPicker = () => {
  showMfrPicker.value = false;
};

const addManufacturer = (mfr: Manufacturer) => {
  selectedManufacturers.value.push(mfr);
  closeMfrPicker();
};

const removeManufacturer = (index: number) => {
  selectedManufacturers.value.splice(index, 1);
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该合同吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        
        // 先删除关联的厂家关系
        await supabase.from('contract_manufacturer_rela').delete().eq('contract_id', form.value.id);
        
        // 再删除合同
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
  if (selectedManufacturers.value.length === 0) return uni.showToast({ title: '请至少选择一个厂家', icon: 'none' });

  loading.value = true;
  
  let error;
  let contractId = form.value.id;
  
  const payload = {
    name: form.value.name,
    code: form.value.code,
    site_id: form.value.site_id,
    agent_id: form.value.agent_id
  };

  if (isEdit.value) {
    // 编辑模式: 只有未确认状态才能修改基本信息
    const { error: updateError } = await supabase
      .from('contract')
      .update(payload)
      .eq('id', form.value.id)
      .eq('is_confirmed', false)
      .eq('is_completed', false);
      
    error = updateError;
    if (error && error.code === 'PGRST116') {
      error.message = '合同已确认或已完成,无法修改基本信息';
    }
  } else {
    // 新增模式
    const insertPayload = {
      ...payload,
      is_confirmed: false,
      is_completed: false
    };
    
    const { data, error: insertError } = await supabase
      .from('contract')
      .insert(insertPayload)
      .select()
      .single();
      
    error = insertError;
    if (data) {
      contractId = data.id;
    }
  }

  // 保存厂家关系
  if (!error && contractId) {
    // 删除旧的关系
    await supabase.from('contract_manufacturer_rela').delete().eq('contract_id', contractId);
    
    // 插入新的关系
    const relations = selectedManufacturers.value.map(m => ({
      contract_id: contractId,
      manufacturer_id: m.id
    }));
    
    const { error: relaError } = await supabase.from('contract_manufacturer_rela').insert(relations);
    if (relaError) error = relaError;
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

.manufacturer-list {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 10px;
  min-height: 50px;
}

.empty-hint {
  color: #999;
  font-size: 14px;
  text-align: center;
  padding: 10px 0;
}

.manufacturer-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background-color: #fff;
  border-radius: 4px;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.manufacturer-name {
  font-size: 14px;
  color: #333;
}

.remove-btn {
  width: 24px;
  height: 24px;
  background-color: #ff4d4f;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 20px;
  line-height: 1;
}

.btn-add-manufacturer {
  width: 100%;
  height: 40px;
  background-color: #fff;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  color: #6739b6;
  font-size: 14px;
  margin-top: 10px;
  
  &:active {
    opacity: 0.8;
  }
}

.status-badge {
  display: inline-block;
  padding: 6px 16px;
  border-radius: 4px;
  font-size: 14px;
  font-weight: 500;
  
  &.status-unconfirmed {
    background-color: #fff7e6;
    color: #fa8c16;
  }
  
  &.status-confirmed {
    background-color: #e6f7ff;
    color: #1890ff;
  }
  
  &.status-completed {
    background-color: #f6ffed;
    color: #52c41a;
  }
}

.footer {
  margin-top: 30px;
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
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

// 弹窗样式
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.modal-content {
  background-color: #fff;
  border-radius: 20px 20px 0 0;
  max-height: 60vh;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid #f0f0f0;
}

.modal-title {
  font-size: 16px;
  font-weight: 500;
  color: #333;
}

.modal-close {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #999;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 10px 20px;
}

.mfr-option {
  padding: 14px 16px;
  background-color: #f9f9f9;
  border-radius: 6px;
  margin-bottom: 8px;
  font-size: 15px;
  color: #333;
  
  &:active {
    background-color: #f0f0f0;
  }
}
</style>
