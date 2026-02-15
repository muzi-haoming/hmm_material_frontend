<template>
  <view class="container">
    <!-- 顶部 -->
    <view class="header-bg">
      <view class="title-bar">
        <text class="app-title">恒堃科技</text>
      </view>
    </view>

    <!-- 用户卡片 -->
    <view class="user-card" @click="handleEditProfile">
      <view class="avatar">
        <image v-if="profile.avatar_url" :src="profile.avatar_url" mode="aspectFill" class="avatar-img" />
        <text v-else class="iconfont icon-person"></text>
      </view>
      <view class="user-info">
        <text class="name">{{ profile.nickname || '未设置昵称' }}</text>
        <text class="hint" v-if="isProfileIncomplete">点击完善信息</text>
        <text class="role tag">{{ profile.user_role?.name || '未设置角色' }}</text>
      </view>
      <text class="iconfont icon-right arrow"></text>
    </view>

    <!-- 菜单列表 -->
    <view class="menu-list">
      <view class="menu-item" v-if="isAdmin" @click="navigateTo('/pages/profile/list')">
        <text class="iconfont icon-team menu-icon"></text>
        <text class="menu-text">用户管理</text>
        <text class="iconfont icon-right arrow"></text>
      </view>
      <view class="menu-item" v-if="isAdmin" @click="navigateTo('/pages/user-role/list')">
        <text class="iconfont icon-safetycertificate menu-icon"></text>
        <text class="menu-text">用户角色管理</text>
        <text class="iconfont icon-right arrow"></text>
      </view>
      
      <!-- 同步微信信息 -->
      <!-- 已移除同步微信信息按钮，功能集成到编辑资料中 -->

      <view class="menu-item highlight" @click="handleLogout">
        <text class="iconfont icon-logout menu-icon"></text>
        <text class="menu-text">退出登陆</text>
      </view>
    </view>

    <!-- 编辑资料弹窗 -->
    <view class="modal-mask" v-if="showEditModal" @click="closeEditModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">完善个人资料</view>
        
        <view class="modal-body">
          <!-- 头像设置 -->
          <view class="avatar-edit-wrapper">
             <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
               <image v-if="editForm.avatarUrl" class="avatar-img" :src="editForm.avatarUrl" mode="aspectFill"></image>
               <view v-else class="avatar-placeholder"><text class="iconfont icon-person"></text></view>
               <view class="avatar-edit-icon"><text class="iconfont icon-camera"></text></view>
             </button>
             <text class="avatar-tip">点击修改头像</text>
          </view>

          <!-- 微信昵称 -->
          <view class="form-item">
            <text class="label">昵称</text>
            <input class="input" type="nickname" v-model="editForm.nickname" placeholder="请输入昵称" @blur="onNicknameBlur" />
          </view>

          <!-- 真实姓名 -->
          <view class="form-item">
            <text class="label">真实姓名</text>
            <input class="input" type="text" v-model="editForm.name" placeholder="请输入真实姓名" />
          </view>

          <!-- 邮箱 -->
          <view class="form-item">
            <text class="label">邮箱</text>
            <input class="input" type="text" v-model="editForm.email" placeholder="请输入邮箱" />
          </view>

          <!-- 手机号 -->
          <view class="form-item">
            <text class="label">手机号</text>
            <input class="input" type="number" v-model="editForm.phone" placeholder="请输入手机号" />
          </view>
        </view>

        <view class="modal-footer">
          <button class="btn-cancel" @click="closeEditModal">取消</button>
          <button class="btn-confirm" @click="saveProfile" :disabled="loading">保存</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue';
import { supabase, supabaseUrl } from '@/utils/supabase';
import { uploadAvatar } from '@/utils/upload';
import { onShow } from '@dcloudio/uni-app';

// 状态
const profileInfo = ref<any>(uni.getStorageSync('profileInfo') || {}); // 优先从缓存读取，避免闪烁
const profile = ref<any>({});  // Profile Table Info
const loading = ref(false);

// 编辑弹窗状态
const showEditModal = ref(false);
const editForm = reactive({
  name: '',
  email: '',
  phone: '',
  nickname: '',
  avatarUrl: ''
});

const isAdmin = computed(() => {
  return profileInfo.value.role_code === 'admin';
});

const isProfileIncomplete = computed(() => {
  if (!profileInfo || !profile) return false;
  // 检查手机号或邮箱是否为空
  const missingContact = !profile.value.phone || !profile.value.email;
  // 检查真实姓名是否为空或默认值
  const incompleteName = !profile.value.name;
  
  return missingContact || incompleteName;
});

onShow(async () => {
    await fetchUserData();
});

const fetchUserData = async () => {
    // 1. 获取 Auth 用户信息
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return uni.reLaunch({ url: '/pages/login/login' });

    // 2. 获取 Profile 表信息
    const { data: profileData } = await supabase
        .from('profile')
        .select('*, user_role:role_id(code, name)')
        .eq('id', user.id)
        .single();
    
    if (profileData) {
        profile.value = profileData;
    }

    const newProfileInfo: any = {
        id: profileData.id,
        email: profileData.email,
        phone: profileData.phone,
        nickname: profileData.nickname,
        name: profileData.name,
        role_code: profileData.user_role.code,
        role_name: profileData.user_role.name
    };

    // 更新状态并缓存
    profileInfo.value = newProfileInfo;
    uni.setStorageSync('profileInfo', newProfileInfo);
};

const onChooseAvatar = (e: any) => {
    const { avatarUrl } = e.detail;
    console.log('Chosen Avatar:', avatarUrl);
    editForm.avatarUrl = avatarUrl;
};

const onNicknameBlur = (e: any) => {
    // 确保 v-model 更新 (有时候微信原生填入不触发 input)
    if (e.detail.value) {
        editForm.nickname = e.detail.value;
    }
};

const handleEditProfile = () => {
  // strict reliance on profile table
  editForm.name = profile.value.name || '';
  editForm.email = profile.value.email || '';
  editForm.phone = profile.value.phone || '';
  editForm.nickname = profile.value.nickname || '';
  editForm.avatarUrl = profile.value.avatar_url || '';

  showEditModal.value = true;
};

const closeEditModal = () => {
    showEditModal.value = false;
};

const saveProfile = async () => {
    loading.value = true;
    try {
        let finalAvatarUrl = profile.value.avatar_url;

        // 0. 处理头像上传 (如果在编辑时改了 avatarUrl)
        if (editForm.avatarUrl && editForm.avatarUrl !== profile.value.avatar_url) {
            const uploadedUrl = await uploadAvatar(editForm.avatarUrl, profile.value.id);
            if (uploadedUrl) {
                finalAvatarUrl = uploadedUrl;
            } else {
                 uni.showToast({ title: '头像上传失败，将使用原头像', icon: 'none' });
            }
        }

        // 1. 更新 Profile 表 (Name, Avatar, Nickname, Email, Phone)
        const { error: profileError } = await supabase
            .from('profile')
            .update({ 
                name: editForm.name,
                avatar_url: finalAvatarUrl,
                nickname: editForm.nickname, 
                email: editForm.email,
                phone: editForm.phone
            })
            .eq('id', profile.value.id);
        
        if (profileError) throw profileError;

        uni.showToast({ title: '保存成功', icon: 'success' });
        showEditModal.value = false;
        await fetchUserData();

    } catch (e: any) {
        uni.showToast({ title: '保存失败: ' + e.message, icon: 'none' });
        console.error(e);
    } finally {
        loading.value = false;
    }
};

const navigateTo = (url: string) => {
    uni.navigateTo({ url });
};

const handleLogout = async () => {
    uni.showModal({
        title: '提示',
        content: '确定要退出登录吗？',
        success: async (res) => {
            if (res.confirm) {
                await supabase.auth.signOut(); 
                uni.removeStorageSync('profileInfo');
                uni.reLaunch({ url: '/pages/login/login' });
            }
        }
    });
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  position: relative;
}

.header-bg {
  height: 25vh;
  background: linear-gradient(135deg, #6739b6, #8a4fd3);
  border-bottom-left-radius: 30px;
  border-bottom-right-radius: 30px;
  padding-top: 60px;
  box-sizing: border-box;
}

.title-bar {
  text-align: center;
}

.app-title {
  color: #fff;
  font-size: 20px;
  font-weight: bold;
}

/* 用户卡片 */
.user-card {
  position: absolute;
  top: 18vh;
  left: 15px;
  right: 15px;
  background: #fff;
  border-radius: 15px;
  padding: 20px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  
  &:active {
    background-color: #fafafa;
  }
}

.avatar {
  width: 60px;
  height: 60px;
  background-color: #f0f0f0;
  border-radius: 50%;
  margin-right: 15px;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
  
  .avatar-img {
    width: 100%;
    height: 100%;
  }
  
  .icon-person {
    font-size: 30px;
    color: #999;
  }
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.hint {
  font-size: 12px;
  color: #ff9800; /* Orange highlight */
  margin-bottom: 2px;
}

.name {
  font-size: 18px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.sub-info {
  font-size: 13px;
  color: #666;
  margin-bottom: 5px;
}

.tag {
  align-self: flex-start;
  background-color: #f0ebfa;
  color: #6739b6;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 10px;
}

.arrow {
  color: #ccc;
  font-size: 16px;
}

/* 菜单列表 */
.menu-list {
  position: absolute;
  top: 32vh; 
  left: 15px;
  right: 15px;
  background: #fff;
  border-radius: 15px;
  padding: 10px 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
  margin-top: 20px; /* 增加一点间距 */
}

.menu-item {
  padding: 15px 20px;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background-color: #f9f9f9;
  }

  &.highlight .menu-text {
    color: #ff4d4f;
  }
  &.highlight .menu-icon {
    color: #ff4d4f;
  }
}

.menu-icon {
  font-size: 20px;
  color: #6739b6;
  margin-right: 10px;
  width: 24px;
  text-align: center;
}

.menu-text {
  flex: 1;
  font-size: 16px;
  color: #333;
}

/* 模态框样式 */
.modal-mask {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 999;
}

.modal-content {
  width: 85%;
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  animation: fadeIn 0.2s ease-out;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}

.modal-header {
  padding: 15px;
  text-align: center;
  font-size: 18px;
  font-weight: bold;
  border-bottom: 1px solid #eee;
}

.modal-body {
  padding: 20px;
}

.form-item {
  margin-bottom: 15px;
  
  .label {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    color: #666;
  }
  
  .input {
    width: 100%;
    height: 40px;
    background: #f5f5f5;
    border-radius: 6px;
    padding: 0 10px;
    box-sizing: border-box;
    font-size: 14px;
  }
}

.verify-box {
  display: flex;
  gap: 10px;
  
  .verify-input {
    flex: 1;
  }
  
  .btn-verify {
    width: 100px;
    height: 40px;
    line-height: 40px;
    font-size: 12px;
    background-color: #6739b6;
    color: #fff;
    padding: 0;
    
    &[disabled] {
      background-color: #ccc;
    }
  }
}

.modal-footer {
  display: flex;
  border-top: 1px solid #eee;
  
  button {
    flex: 1;
    background-color: #fff;
    border: none;
    border-radius: 0;
    height: 50px;
    line-height: 50px;
    font-size: 16px;
    
    &::after {
      border: none;
    }
    
    &.btn-cancel {
      color: #666;
      border-right: 1px solid #eee;
    }
    
    &.btn-confirm {
      color: #6739b6;
      font-weight: bold;
    }
  }
}

/* Avatar Edit Styles */
.avatar-edit-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 20px;
}

.avatar-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  padding: 0;
  background: none;
  position: relative;
  overflow: hidden;
  
  &::after { border: none; }

  .avatar-img {
    width: 100%;
    height: 100%;
  }
}

.avatar-edit-icon {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.5);
  height: 24px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.icon-camera {
  color: #fff;
  font-size: 14px;
}

.avatar-tip {
    font-size: 12px;
    color: #999;
    margin-top: 8px;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background-color: #f0f0f0;
  display: flex;
  justify-content: center;
  align-items: center;
  
  .icon-person {
    font-size: 40px;
    color: #ccc;
  }
}
</style>
