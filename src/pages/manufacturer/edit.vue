<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">厂家编号</text>
        <input class="input" type="text" v-model="form.code" disabled placeholder="自动生成" />
      </view>

      <view class="form-item">
        <text class="label required">厂家名称</text>
        <input class="input" type="text" v-model="form.name" placeholder="请输入厂家名称" />
      </view>

      <view class="form-item" style="display: flex; justify-content: space-between; align-items: center;">
        <text class="label" style="margin-bottom: 0;">是否开启库存管理</text>
        <switch :checked="form.is_manage_stock" @change="onStockManageChange" color="#6739b6" style="transform: scale(0.8);" />
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
import { generateCode } from '@/utils/codeGen';
import { onLoad } from '@dcloudio/uni-app';
import { getCurrentUser } from '@/utils/permission';


const form = ref({
  id: '',
  name: '',
  code: '',
  is_manage_stock: false
});

const loading = ref(false);
const isEdit = ref(false);

const onStockManageChange = (e: any) => {
  form.value.is_manage_stock = e.detail.value;
};

onLoad(async (options: any) => {
  const user = getCurrentUser();
  if (!user?.is_admin) {
    uni.showToast({ title: '无权访问', icon: 'none' });
    setTimeout(() => uni.navigateBack(), 1500);
    return;
  }

  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  } else {
    form.value.code = await generateCode('manufacturer', 'CJ');
  }
});

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('manufacturer')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (error) {
    uni.showToast({ title: '数据加载失败', icon: 'none' });
  } else if (data) {
    form.value.name = data.name;
    form.value.code = data.code;
    form.value.is_manage_stock = data.is_manage_stock;
  }
};



const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该厂家吗？删除后可能会影响关联数据。',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('manufacturer').delete().eq('id', form.value.id);
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
  if (!form.value.name) {
    uni.showToast({ title: '请输入厂家名称', icon: 'none' });
    return;
  }

  loading.value = true;
  
  let error;
  
  if (isEdit.value) {
    // 更新
    const { error: updateError } = await supabase
      .from('manufacturer')
      .update({
        name: form.value.name,
        code: form.value.code,
        is_manage_stock: form.value.is_manage_stock
      })
      .eq('id', form.value.id);
    error = updateError;
  } else {
    // 插入
    const { error: insertError } = await supabase
      .from('manufacturer')
      .insert({
        name: form.value.name,
        code: form.value.code,
        is_manage_stock: form.value.is_manage_stock
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
