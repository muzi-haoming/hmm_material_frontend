<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">原密码</text>
        <input class="input" type="password" v-model="form.oldPassword" placeholder="请输入原密码" />
      </view>
      <view class="form-item">
        <text class="label required">新密码</text>
        <input class="input" type="password" v-model="form.newPassword" placeholder="请输入新密码" />
      </view>
      <view class="form-item">
        <text class="label required">确认新密码</text>
        <input class="input" type="password" v-model="form.confirmPassword" placeholder="请再次输入新密码" />
      </view>
    </view>

    <view class="footer">
      <button class="btn-save" @click="handleSave" :disabled="loading">
        {{ loading ? '提交中...' : '提交修改' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import md5 from 'js-md5';

const form = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const loading = ref(false);

const handleSave = async () => {
  if (!form.value.oldPassword) return uni.showToast({ title: '请输入原密码', icon: 'none' });
  if (!form.value.newPassword) return uni.showToast({ title: '请输入新密码', icon: 'none' });
  if (form.value.newPassword !== form.value.confirmPassword) return uni.showToast({ title: '两次相同密码不一致', icon: 'none' });

  loading.value = true;
  
  // Get current user info from storage
  const userInfo = uni.getStorageSync('userInfo');
  if (!userInfo || !userInfo.id) {
    loading.value = false;
    uni.showToast({ title: '用户未登录', icon: 'none' });
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/login' });
    }, 1500);
    return;
  }

  // Verify old password
  // @ts-ignore
  const oldHash = md5(form.value.oldPassword);
  
  // We should verify against DB to be safe, not just local storage (incase password changed elsewhere)
  const { data: user, error: fetchError } = await supabase
    .from('user')
    .select('password')
    .eq('id', userInfo.id)
    .single();

  if (fetchError || !user) {
    loading.value = false;
    return uni.showToast({ title: '验证失败，请重新登录', icon: 'none' });
  }

  if (user.password !== oldHash) {
    loading.value = false;
    return uni.showToast({ title: '原密码错误', icon: 'none' });
  }

  // Update password
  // @ts-ignore
  const newHash = md5(form.value.newPassword);
  
  const { error: updateError } = await supabase
    .from('user')
    .update({ password: newHash })
    .eq('id', userInfo.id);

  loading.value = false;

  if (updateError) {
    uni.showToast({ title: '修改失败: ' + updateError.message, icon: 'none' });
  } else {
    uni.showToast({ title: '修改成功，请重新登录', icon: 'success' });
    
    // Logout
    uni.removeStorageSync('userInfo');
    
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/login/login' });
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
