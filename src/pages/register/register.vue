<template>
  <view class="container">
    <!-- Header Background -->
    <view class="header-bg">
      <view class="app-title">HK 综合管理系统</view>
    </view>

    <!-- Register Card -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">用户注册</text>
      </view>

      <view class="form-item">
        <text class="label">用户名</text>
        <input class="input" type="text" v-model="form.username" placeholder="请输入用户名" />
      </view>

      <view class="form-item">
        <text class="label">密码</text>
        <input class="input" type="password" v-model="form.password" placeholder="请输入密码" />
      </view>
      
      <view class="form-item">
        <text class="label">确认密码</text>
        <input class="input" type="password" v-model="form.confirmPassword" placeholder="请再次输入密码" />
      </view>

      <view class="form-item">
        <text class="label">姓名</text>
        <input class="input" type="text" v-model="form.name" placeholder="请输入真实姓名" />
      </view>

      <button class="btn-register" @click="handleRegister" :disabled="loading">
        {{ loading ? '注册中...' : '注册' }}
      </button>

      <view class="links">
        <text class="link-text" @click="goBack">已有账号？返回登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { supabase } from '@/utils/supabase';
import md5 from 'js-md5';
import { v4 as uuidv4 } from 'uuid';

const form = reactive({
  name: '',
  username: '',
  password: '',
  confirmPassword: ''
});
const loading = ref(false);

const handleRegister = async () => {
  if (!form.name || !form.username || !form.password) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' });
    return;
  }
  
  if (form.password !== form.confirmPassword) {
    uni.showToast({ title: '两次密码不一致', icon: 'none' });
    return;
  }

  loading.value = true;
  
  try {
    // 1. Get default role ID (code = 'user')
    const { data: roleData, error: roleError } = await supabase
      .from('user_role')
      .select('id')
      .eq('code', 'user')
      .maybeSingle();
      
    if (roleError) {
      console.error('Role query error:', roleError);
      throw new Error('查询角色失败: ' + roleError.message);
    }
    
    if (!roleData) {
       console.error('No role found. Check DB data and RLS policies.');
       throw new Error('未找到默认用户角色(user)。请检查数据库是否已插入数据，并且是否开启了 RLS 策略允许读取。');
    }

    // 2. Check if username exists
    const { data: userExist } = await supabase
      .from('user')
      .select('username')
      .eq('username', form.username)
      .maybeSingle();

    if (userExist) {
        uni.showToast({ title: '用户名已存在', icon: 'none' });
        loading.value = false;
        return;
    }

    // 3. Insert new user
    const newUser = {
        id: uuidv4(),
        name: form.name,
        username: form.username,
        // @ts-ignore
        password: md5(form.password),
        role_id: roleData.id,
        // create_time and update_time are set by default in DB if not provided, 
        // but if DB default is 'now()' and we submit from client, we can rely on DB.
        // However, standard PG driver might need proper ISO strings if we pass them.
        // Let's rely on DB defaults for timestamps.
    };

    const { error: insertError } = await supabase
      .from('user')
      .insert([newUser]);

    if (insertError) {
      throw insertError;
    }

    uni.showToast({ title: '注册成功', icon: 'success' });
    
    setTimeout(() => {
        uni.navigateBack();
    }, 1500);

  } catch (err: any) {
    console.error('Register error:', err);
    uni.showToast({ title: err.message || '注册失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const goBack = () => {
  uni.navigateBack();
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.header-bg {
  height: 25vh; /* Slightly shorter for register */
  background: linear-gradient(135deg, #6739b6, #8a4fd3);
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 30px;
}

.app-title {
  color: #fff;
  font-size: 22px;
  font-weight: bold;
  letter-spacing: 2px;
}

.card {
  position: absolute;
  top: 18vh;
  left: 20px;
  right: 20px;
  background: #fff;
  border-radius: 15px;
  padding: 30px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.card-header {
  margin-bottom: 25px;
  text-align: center;
}

.card-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
}

.form-item {
  display: flex;
  align-items: center;
  border-bottom: 1px solid #eee;
  padding: 12px 5px;
  margin-bottom: 15px;
  
  .label {
    width: 70px;
    font-size: 14px;
    color: #666;
  }

  .input {
    flex: 1;
    font-size: 14px;
    color: #333;
  }
}

.btn-register {
  background: linear-gradient(90deg, #6739b6, #8a4fd3);
  color: #fff;
  border-radius: 25px;
  font-size: 16px;
  margin-top: 30px;
  box-shadow: 0 4px 10px rgba(103, 57, 182, 0.3);
  
  &:active {
    opacity: 0.9;
  }
  
  &[disabled] {
    opacity: 0.7;
  }
}

.links {
  margin-top: 20px;
  text-align: center;
}

.link-text {
  color: #6739b6;
  font-size: 14px;
}
</style>
