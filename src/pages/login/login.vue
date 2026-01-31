<template>
  <view class="container">
    <!-- Header Background -->
    <view class="header-bg">
      <view class="app-title">HK 综合管理系统</view>
    </view>

    <!-- Login Card -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">{{ isBinding ? '绑定账号' : '用户登录' }}</text>
      </view>
      
      <view v-if="isBinding" class="bind-tip">
        <text>微信授权成功，请登录以绑定账号</text>
      </view>

      <view class="form-item">
        <text class="iconfont icon-user"></text>
        <input class="input" type="text" v-model="form.username" placeholder="请输入用户名" />
      </view>

      <view class="form-item">
        <text class="iconfont icon-lock"></text>
        <input class="input" type="password" v-model="form.password" placeholder="请输入密码" />
      </view>

      <button class="btn-login" @click="handleLogin" :disabled="loading">
        {{ loading ? '处理中...' : (isBinding ? '绑定并登录' : '登录') }}
      </button>
      
      <!-- WeChat Login Button -->
      <!-- Only show if not binding and platform supports it (or mocked) -->
      <button v-if="!isBinding" class="btn-wechat" @click="handleWechatLogin" :disabled="loading">
        <text class="iconfont icon-wechat"></text> 微信一键登录
      </button>

      <view class="links">
        <text class="link-text" @click="goToRegister">注册账号</text>
        <text class="link-text separator" v-if="isBinding" @click="cancelBind">取消绑定</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/utils/supabase';
import md5 from 'js-md5';
import { uuid } from '@/utils/uuid';

const form = reactive({
  username: '',
  password: ''
});
const loading = ref(false);
const isBinding = ref(false);
const tempOpenId = ref('');

const handleLogin = async () => {
  if (!form.username || !form.password) {
    uni.showToast({ title: '请输入用户名和密码', icon: 'none' });
    return;
  }

  loading.value = true;
  
  try {
    // @ts-ignore
    const hashedPassword = md5(form.password);
    
    // 1. Verify User Credentials
    const { data: user, error } = await supabase
      .from('user')
      .select('*, user_role:role_id(code, name)')
      .eq('username', form.username)
      .eq('password', hashedPassword)
      .maybeSingle();

    if (error || !user) {
      uni.showToast({ title: '用户名或密码错误', icon: 'none' });
      loading.value = false;
      return;
    }

    // 2. If Binding Mode, Update wx_openid
    if (isBinding.value && tempOpenId.value) {
       // Check if this openid is already bound to ANOTHER user (just in case)
       const { data: existingBound } = await supabase
         .from('user')
         .select('id')
         .eq('wx_openid', tempOpenId.value)
         .maybeSingle();
         
       if (existingBound && existingBound.id !== user.id) {
         loading.value = false;
         return uni.showToast({ title: '该微信号已绑定其他账号', icon: 'none' });
       }

       // Update User
       const { error: updateError } = await supabase
         .from('user')
         .update({ wx_openid: tempOpenId.value })
         .eq('id', user.id);
         
       if (updateError) {
         loading.value = false;
         return uni.showToast({ title: '绑定失败: ' + updateError.message, icon: 'none' });
       }
       
       uni.showToast({ title: '绑定成功', icon: 'success' });
    } else {
       uni.showToast({ title: '登录成功', icon: 'success' });
    }

    // 3. Save Session & Redirect
    const userInfo = {
      ...user,
      role_code: user.user_role?.code,
      role_name: user.user_role?.name
    };
    uni.setStorageSync('userInfo', userInfo);
    
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' });
    }, 1500);

  } catch (err) {
    uni.showToast({ title: '登录失败，请稍后重试', icon: 'none' });
    console.error('Login error:', err);
  } finally {
    loading.value = false;
  }
};

const handleWechatLogin = async () => {
  loading.value = true;

  // 1. Get Code from UniApp
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      console.log('WeChat Code:', loginRes.code);
      
      try {
        // 2. Call Supabase Edge Function to get OpenID via Direct Network Request (Bypassing SDK)
        let data;
        const functionUrl = `${supabaseUrl}/functions/v1/wechat-auth`;
        
        console.log('Requesting OpenID from:', functionUrl);

        try {
            const response = await new Promise((resolve, reject) => {
                uni.request({
                    url: functionUrl,
                    method: 'POST',
                    data: { code: loginRes.code },
                    header: {
                        'Authorization': `Bearer ${supabaseAnonKey}`,
                        'apikey': supabaseAnonKey,
                        'Content-Type': 'application/json'
                    },
                    success: (res) => {
                        console.log('Edge Function Response:', res);
                        resolve(res);
                    },
                    fail: (err) => {
                         console.error('Edge Function Network Error:', err);
                         reject(new Error('Network request failed: ' + (err.errMsg || JSON.stringify(err))));
                    }
                });
            }) as any;

            if (response.statusCode >= 200 && response.statusCode < 300) {
                data = response.data;
            } else {
                console.error('Edge Function Error Status:', response.statusCode, response.data);
                throw new Error(`Edge Function failed (${response.statusCode}): ` + JSON.stringify(response.data));
            }
        } catch (netError: any) {
             console.error('Auth Request Exception:', netError);
             throw netError;
        }

        if (!data || !data.openid) {
             throw new Error('Invalid response structure: ' + JSON.stringify(data));
        }

        const openid = data.openid;
        console.log('Got OpenID:', openid);
        
        // 3. Check if User exists by OpenID
        const { data: user, error: dbError } = await supabase
          .from('user')
          .select('*, user_role:role_id(code, name)')
          .eq('wx_openid', openid)
          .maybeSingle();

        if (user) {
          // A. User Found -> Login Directly
          uni.showToast({ title: '微信登录成功', icon: 'success' });
          const userInfo = {
             ...user,
             role_code: user.user_role?.code,
             role_name: user.user_role?.name
          };
          uni.setStorageSync('userInfo', userInfo);
          setTimeout(() => {
            uni.reLaunch({ url: '/pages/index/index' });
          }, 1500);
        } else {
          // B. User Not Found -> Auto Register
          console.log('User not found, auto registering...');
          
          try {
              // 1. Get default role (user)
              const { data: roleData, error: roleError } = await supabase
                .from('user_role')
                .select('id')
                .eq('code', 'user')
                .maybeSingle();
                
              if (roleError || !roleData) {
                  throw new Error('无法获取默认角色(user)，无法自动注册');
              }
              
              const defaultRoleId = roleData.id;
              
              // 2. Generate random credentials
              const randomSuffix = (new Date().getTime()).toString(36);
              const autoUsername = `wx_${randomSuffix}`; // e.g. wx_lz48x9
              const autoPasswordPlain = uuid().substring(0, 8); // Random 8 chars
              // @ts-ignore
              const autoPasswordHash = md5(autoPasswordPlain);
              
              const newUserObj = {
                  id: uuid(),
                  name: '微信用户',
                  username: autoUsername,
                  password: autoPasswordHash,
                  role_id: defaultRoleId,
                  wx_openid: openid
              };
              
              // 3. Insert User
              console.log('Inserting new user:', newUserObj);
              const { error: insertError } = await supabase
                .from('user')
                .insert([newUserObj]);
                
              if (insertError) {
                  console.error('Insert User Error Full Object:', insertError);
                  throw new Error('自动注册失败 (DB): ' + JSON.stringify(insertError));
              }
              
              // 4. Auto Login
              uni.showToast({ title: '注册成功，正在登录...', icon: 'success' });
              
              const userInfo = {
                  ...newUserObj,
                  role_code: 'user',
                  role_name: '普通用户' // Simple default, or fetch if needed
              };
              uni.setStorageSync('userInfo', userInfo);
              
              setTimeout(() => {
                uni.reLaunch({ url: '/pages/index/index' });
              }, 1500);

          } catch (regError: any) {
              console.error('Auto register failed:', regError);
              uni.showToast({ title: regError.message, icon: 'none' });
          }
        }

      } catch (err: any) {
        uni.showToast({ title: '服务异常: ' + err.message, icon: 'none' });
      } finally {
        loading.value = false;
      }
    },
    fail: (err) => {
      console.error('uni.login failed', err);
      // Mock flow for H5 Dev (Since uni.login fails on H5 without distinct config)
      // #ifdef H5
      console.warn('H5 Dev Mode: Mocking WeChat Login');
      mockWechatLogin();
      // #endif
      // #ifndef H5
      uni.showToast({ title: '无法唤起微信登录', icon: 'none' });
      loading.value = false;
      // #endif
    }
  });
};

// DEV ONLY: Mock function for H5 testing
const mockWechatLogin = async () => {
    // Simulate getting an ID
    const mockOpenId = 'mock_openid_' + Math.floor(Math.random() * 1000);
    console.log('Mocking OpenID:', mockOpenId);
    
    // Check DB
    const { data: user } = await supabase
          .from('user')
          .select('*, user_role:role_id(code, name)')
          .eq('wx_openid', mockOpenId)
          .maybeSingle();
          
    if (user) {
        uni.showToast({ title: '微信登录成功(Mock)', icon: 'success' });
        const userInfo = {
             ...user,
             role_code: user.user_role?.code,
             role_name: user.user_role?.name
        };
        uni.setStorageSync('userInfo', userInfo);
        setTimeout(() => {
            uni.reLaunch({ url: '/pages/index/index' });
        }, 1500);
    } else {
        tempOpenId.value = mockOpenId;
        isBinding.value = true;
        uni.showToast({ title: '请绑定账号(Mock)', icon: 'none' });
    }
    loading.value = false;
};

const cancelBind = () => {
  isBinding.value = false;
  tempOpenId.value = '';
};

const goToRegister = () => {
  uni.navigateTo({ url: '/pages/register/register' });
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.header-bg {
  height: 35vh;
  background: linear-gradient(135deg, #6739b6, #8a4fd3);
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  display: flex;
  justify-content: center;
  align-items: center;
  padding-bottom: 50px;
}

.app-title {
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  letter-spacing: 2px;
}

.card {
  position: absolute;
  top: 25vh;
  left: 20px;
  right: 20px;
  background: #fff;
  border-radius: 15px;
  padding: 30px 20px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}

.card-header {
  margin-bottom: 20px;
  text-align: center;
}

.card-title {
  font-size: 20px;
  font-weight: 600;
  color: #333;
}

.bind-tip {
  background-color: #f0f9eb;
  color: #67c23a;
  padding: 10px;
  border-radius: 4px;
  font-size: 13px;
  text-align: center;
  margin-bottom: 15px;
}

.form-item {
  display: flex;
  align-items: center;
  background: #f8f8f8;
  border-radius: 8px;
  padding: 12px 15px;
  margin-bottom: 20px;
  
  .iconfont {
    color: #999;
    margin-right: 10px;
    font-size: 18px;
  }

  .input {
    flex: 1;
    font-size: 14px;
    color: #333;
  }
}

.btn-login {
  background: linear-gradient(90deg, #6739b6, #8a4fd3);
  color: #fff;
  border-radius: 25px;
  font-size: 16px;
  margin-top: 10px;
  box-shadow: 0 4px 10px rgba(103, 57, 182, 0.3);
  width: 100%;
  height: 46px;
  line-height: 46px;
  
  &:active {
    opacity: 0.9;
  }
  
  &[disabled] {
    opacity: 0.7;
  }
}

.btn-wechat {
  background-color: #07c160;
  color: #fff;
  border-radius: 25px;
  font-size: 16px;
  margin-top: 15px;
  width: 100%;
  height: 46px;
  line-height: 46px;
  display: flex;
  justify-content: center;
  align-items: center;
  
  .iconfont {
    margin-right: 8px;
    font-size: 20px;
  }
  
  &:active {
    opacity: 0.9;
  }
}

.links {
  margin-top: 20px;
  text-align: center;
}

.link-text {
  color: #6739b6;
  font-size: 14px;
  
  &.separator {
    margin-left: 15px;
    color: #999;
    
    &::before {
      content: '|';
      margin-right: 15px;
      color: #eee;
    }
    
    &:active {
      color: #666;
    }
  }
}
</style>
