<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">角色编码</text>
        <input class="input" type="text" v-model="form.code" placeholder="如: admin, user" />
      </view>
      <view class="form-item">
        <text class="label required">角色名称</text>
        <input class="input" type="text" v-model="form.name" placeholder="如: 管理员, 普通用户" />
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

const form = ref({
  id: '',
  code: '',
  name: ''
});

const loading = ref(false);
const isEdit = ref(false);

onLoad(async (options: any) => {
  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('user_role')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.code = data.code;
    form.value.name = data.name;
  }
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该角色吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('user_role').delete().eq('id', form.value.id);
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
  if (!form.value.code) return uni.showToast({ title: '请输入编码', icon: 'none' });
  if (!form.value.name) return uni.showToast({ title: '请输入名称', icon: 'none' });

  loading.value = true;
  
  let error;
  const payload = {
    code: form.value.code,
    name: form.value.name
  };
  
  if (isEdit.value) {
    const { error: updateError } = await supabase.from('user_role').update(payload).eq('id', form.value.id);
    error = updateError;
  } else {
    // @ts-ignore
    payload.id = uuidv4();
    const { error: insertError } = await supabase.from('user_role').insert(payload);
    error = insertError;
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
