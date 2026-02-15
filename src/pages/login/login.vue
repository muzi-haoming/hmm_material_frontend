<template>
  <view class="container">
    <!-- 背景装饰圆 -->
    <view class="circle-bg top-left"></view>
    <view class="circle-bg bottom-right"></view>

    <view class="content">
      <!-- 头部 Logo/标题 -->
      <view class="header">
        <text class="logo-text">HK</text>
        <text class="app-name">恒堃科技</text>
        <text class="welcome-text">欢迎使用</text>
      </view>

      <!-- 登录卡片 -->
      <view class="login-card">


        <view class="card-body">


             <button class="btn-primary" hover-class="btn-hover" @click="handleWechatLogin" :disabled="loading">
                <text class="iconfont icon-wechat"></text>
                <text class="btn-text">微信一键登录</text>
             </button>


        </view>
      </view>

      <!-- 底部版权 -->
      <view class="footer-area">
        <text class="copyright">High-Efficiency Knowledge Management</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { loginWithWechatCode } from '@/utils/auth';
// #ifdef H5
import { mockWechatLogin } from '@/utils/dev';
// #endif

const loading = ref(false);


const handleWechatLogin = async () => {
  loading.value = true;
  uni.showLoading({ title: '登录中...', mask: true });

  // 1. 从 UniApp 获取 Code
  uni.login({
    provider: 'weixin',
    success: async (loginRes) => {
      console.log('WeChat Code:', loginRes.code);
      
      try {
        // 2. 使用封装的 Auth 工具登录
        const data = await loginWithWechatCode(loginRes.code);

        // 3. 获取用户资料
        const userId = data.user.id;
        const { data: profile, error: profileError } = await supabase
            .from('profile')
            .select('*, user_role:role_id(code, name)')
            .eq('id', userId)
            .single();
            
        if (profileError || !profile) {
            throw new Error('Failed to fetch user profile');
        }

        // 4. 保存并重定向
        uni.showToast({ title: '登录成功', icon: 'success' });
        
        const userInfo = {
            ...profile,
            role_code: profile.user_role?.code,
            role_name: profile.user_role?.name
        };
        uni.setStorageSync('userInfo', userInfo);
        
        setTimeout(() => {
            uni.reLaunch({ url: '/pages/index/index' });
        }, 1500);

      } catch (err: any) {
        console.error('Login process failed:', err);
        uni.showToast({ title: '登录失败: ' + (err.message || '未知错误'), icon: 'none' });
        // 仅在失败时重置状态
        loading.value = false;
        uni.hideLoading();
      }
      // 注意：成功时不重置 loading，防止跳转期间用户重复点击
    },
    fail: (err) => {
      console.error('uni.login failed', err);
      // #ifdef H5
      console.warn('H5 开发模式：模拟微信登录');
      mockWechatLogin(
        (userInfo) => {
            // 登录成功回调
            uni.setStorageSync('userInfo', userInfo);
            setTimeout(() => {
                uni.reLaunch({ url: '/pages/index/index' });
            }, 1500);
        },
        (openId) => {
            console.warn('Mock: Need binding (UI removed)', openId);
        }
      );
      // #endif
      // #ifndef H5
      uni.showToast({ title: '无法唤起微信登录', icon: 'none' });
      loading.value = false;
      uni.hideLoading();
      // #endif
    }
  });
};


</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f2f3f8;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
}

/* 背景装饰 */
.circle-bg {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.6;
    
    &.top-left {
        width: 300px;
        height: 300px;
        background: #dbc6ff;
        top: -50px;
        left: -50px;
    }
    
    &.bottom-right {
        width: 250px;
        height: 250px;
        background: #c3ebff;
        bottom: -50px;
        right: -50px;
    }
}

.content {
    position: relative;
    z-index: 10;
    width: 100%;
    padding: 0 40px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.header {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin-bottom: 40px;
    
    .logo-text {
        font-size: 40px;
        font-weight: 900;
        color: #6739b6;
        letter-spacing: -2px;
        margin-bottom: 5px;
    }
    
    .app-name {
        font-size: 20px;
        font-weight: bold;
        color: #333;
        letter-spacing: 2px;
        margin-bottom: 5px;
    }
    
    .welcome-text {
        font-size: 14px;
        color: #999;
        letter-spacing: 4px;
        text-transform: uppercase;
    }
}

.login-card {
    width: 100%;
    background: #ffffff;
    border-radius: 24px;
    padding: 30px;
    box-shadow: 0 10px 40px rgba(103, 57, 182, 0.08); /* faint purple shadow */
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    align-items: center;
}



.card-body {
    width: 100%;
}

.btn-primary {
    background: linear-gradient(135deg, #6739b6 0%, #8a4fd3 100%);
    color: #fff;
    border-radius: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 6px 15px rgba(103, 57, 182, 0.3);
    margin-bottom: 15px;
    border: none;
    
    &[disabled] {
        opacity: 0.7;
        background: #ccc;
        box-shadow: none;
    }
    
    .iconfont {
        font-size: 22px;
        margin-right: 8px;
    }
    
    .btn-text {
        font-size: 16px;
        font-weight: 500;
    }
}

.btn-hover {
    transform: translateY(1px);
    box-shadow: 0 4px 10px rgba(103, 57, 182, 0.2);
}





.footer-area {
    margin-top: 60px;
    
    .copyright {
        font-size: 12px;
        color: #ccc;
    }
}
</style>
