<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">厂家组编号</text>
        <input class="input" type="text" v-model="form.code" placeholder="请输入厂家组编号" />
      </view>

      <view class="form-item">
        <text class="label required">厂家组名称</text>
        <input class="input" type="text" v-model="form.name" placeholder="请输入厂家组名称" />
      </view>
    </view>

    <!-- Detail Section -->
    <view class="detail-section">
      <view class="section-title">包含厂家</view>
      <view class="detail-list">
        <view 
          class="detail-item" 
          v-for="(item, index) in selectedManufacturers" 
          :key="item.id"
        >
          <text>{{ item.name }}</text>
          <view class="remove-btn" @click="removeManufacturer(item.id)">
            <text class="iconfont icon-close"></text>
          </view>
        </view>
        <view class="add-btn" @click="openModal">
          <text class="plus">+</text> 添加厂家
        </view>
      </view>
    </view>

    <view class="footer">
      <button class="btn-delete" v-if="isEdit" @click="handleDelete" :disabled="loading">删除</button>
      <button class="btn-save" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存' }}
      </button>
    </view>

    <!-- Selection Modal -->
    <view class="modal-mask" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">选择厂家</text>
          <text class="close-icon" @click="closeModal">×</text>
        </view>
        <scroll-view scroll-y class="modal-body">
          <view 
            class="check-item" 
            v-for="item in allManufacturers" 
            :key="item.id"
            @click="toggleSelection(item.id)"
          >
            <text class="item-text">{{ item.name }} ({{ item.code }})</text>
            <view class="checkbox" :class="{ checked: tempSelectedIds.includes(item.id) }">
              <text v-if="tempSelectedIds.includes(item.id)" class="checkmark">✓</text>
            </view>
          </view>
        </scroll-view>
        <view class="modal-footer">
          <button class="btn-confirm" @click="confirmSelection">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';


interface Manufacturer {
  id: string;
  name: string;
  code: string;
}

const form = ref({
  id: '',
  name: '',
  code: ''
});

const allManufacturers = ref<Manufacturer[]>([]);
const selectedManufacturerIds = ref<string[]>([]);
const tempSelectedIds = ref<string[]>([]); // 用于模态框交互
const showModal = ref(false);

const loading = ref(false);
const isEdit = ref(false);

const selectedManufacturers = computed(() => {
  return allManufacturers.value.filter(m => selectedManufacturerIds.value.includes(m.id));
});

onLoad(async (options: any) => {
  await fetchAllManufacturers();
  
  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const fetchAllManufacturers = async () => {
  const { data, error } = await supabase
    .from('manufacturer')
    .select('*')
    .order('name');
  
  if (data) {
    allManufacturers.value = data;
  }
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  
  // 加载厂家组信息
  const { data: groupData, error: groupError } = await supabase
    .from('manufacturer_group')
    .select('*')
    .eq('id', id)
    .single();
    
  if (groupData) {
    form.value.name = groupData.name;
    form.value.code = groupData.code;
  }

  // 加载明细
  const { data: detailData, error: detailError } = await supabase
    .from('manufacturer_group_detail')
    .select('manufacturer_id')
    .eq('manufacturer_group_id', id);

  if (detailData) {
    selectedManufacturerIds.value = detailData.map(d => d.manufacturer_id);
  }

  uni.hideLoading();
};

const openModal = () => {
  tempSelectedIds.value = [...selectedManufacturerIds.value];
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const toggleSelection = (id: string) => {
  const index = tempSelectedIds.value.indexOf(id);
  if (index > -1) {
    tempSelectedIds.value.splice(index, 1);
  } else {
    tempSelectedIds.value.push(id);
  }
};

const confirmSelection = () => {
  selectedManufacturerIds.value = [...tempSelectedIds.value];
  closeModal();
};

const removeManufacturer = (id: string) => {
  const index = selectedManufacturerIds.value.indexOf(id);
  if (index > -1) {
    selectedManufacturerIds.value.splice(index, 1);
  }
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该厂家组及其所有关联吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        // 1. 删除明细（RLS 可能需要显式删除或级联，这里为了安全起见显式删除）
        await supabase.from('manufacturer_group_detail').delete().eq('manufacturer_group_id', form.value.id);
        
        // 2. 删除厂家组
        const { error } = await supabase.from('manufacturer_group').delete().eq('id', form.value.id);
        
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
  if (!form.value.name) return uni.showToast({ title: '请输入名称', icon: 'none' });
  if (!form.value.code) return uni.showToast({ title: '请输入编号', icon: 'none' });

  loading.value = true;
  
  let groupId = form.value.id;
  let error;
  
  if (isEdit.value) {
    // 更新厂家组
    const { error: updateError } = await supabase
      .from('manufacturer_group')
      .update({
        name: form.value.name,
        code: form.value.code,
        update_time: new Date().toISOString()
      })
      .eq('id', groupId);
    error = updateError;
  } else {
    // 插入厂家组
    const { data: newGroup, error: insertError } = await supabase
      .from('manufacturer_group')
      .insert({
        name: form.value.name,
        code: form.value.code
      })
      .select()
      .single();
    
    if (newGroup) {
      groupId = newGroup.id;
    }
    error = insertError;
  }

  if (!error && groupId) {
    // 同步明细：删除所有旧的，插入所有新的
    // 1. 删除现有明细
    if (isEdit.value) {
      await supabase
        .from('manufacturer_group_detail')
        .delete()
        .eq('manufacturer_group_id', groupId);
    }
    
    // 2. 插入新明细
    if (selectedManufacturerIds.value.length > 0) {
      const detailsToInsert = selectedManufacturerIds.value.map(mid => ({
        manufacturer_group_id: groupId,
        manufacturer_id: mid
      }));
      
      const { error: detailError } = await supabase
        .from('manufacturer_group_detail')
        .insert(detailsToInsert);
        
      if (detailError) {
        console.error('Detail save error:', detailError);
        error = detailError;
      }
    }
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
  margin-bottom: 15px;
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
  }
}

.section-title {
  font-size: 14px;
  color: #666;
  margin-bottom: 10px;
  margin-left: 5px;
}

.detail-list {
  background-color: #fff;
  border-radius: 10px;
  padding: 10px;
  margin-bottom: 20px;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-bottom: 1px solid #f5f5f5;
  color: #333;
  
  .remove-btn {
    width: 24px;
    height: 24px;
    background-color: #ffe5e5;
    border-radius: 50%;
    display: flex;
    justify-content: center;
    align-items: center;
    
    .icon-close {
      color: #ff4d4f;
      font-size: 14px;
    }
    
    &:active {
      background-color: #ffcccc;
    }
  }
}

.add-btn {
  padding: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6739b6;
  font-size: 14px;
  
  .plus {
    font-size: 20px;
    margin-right: 5px;
    margin-top: -2px;
  }
  
  &:active {
    opacity: 0.7;
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
}

/* Modal Styles */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  width: 80%;
  max-height: 70vh;
  background-color: #fff;
  border-radius: 15px;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 15px;
  border-bottom: 1px solid #eee;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .modal-title {
    font-weight: bold;
    font-size: 16px;
  }
  
  .close-icon {
    font-size: 24px;
    color: #999;
    line-height: 1;
  }
}

.modal-body {
  flex: 1;
  padding: 10px;
  max-height: 400px; // 备用高度
}

.check-item {
  padding: 12px;
  border-bottom: 1px solid #f9f9f9;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .checkbox {
    width: 20px;
    height: 20px;
    border: 2px solid #ddd;
    border-radius: 4px;
    display: flex;
    justify-content: center;
    align-items: center;
    
    &.checked {
      background-color: #6739b6;
      border-color: #6739b6;
    }
    
    .checkmark {
      color: #fff;
      font-size: 14px;
      line-height: 1;
    }
  }
}

.modal-footer {
  padding: 15px;
  border-top: 1px solid #eee;
  
  .btn-confirm {
    background-color: #6739b6;
    color: #fff;
    border-radius: 20px;
    height: 40px;
    line-height: 40px;
    font-size: 14px;
  }
}
</style>
