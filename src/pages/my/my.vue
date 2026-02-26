<template>
  <view class="container">
    <!-- Header -->
    <view class="header-section">
      <view class="user-card" @click="handleEditProfile">
        <view class="avatar-box">
           <image v-if="profile.avatar_url" :src="profile.avatar_url" mode="aspectFill" class="avatar-img" />
           <view v-else class="avatar-placeholder">
               <text class="iconfont icon-person"></text>
           </view>
        </view>
        <view class="user-details">
           <text class="user-name">{{ profile.nickname || profile.name || '未设置昵称' }}</text>
           <text class="user-role">{{ profile.role_name || '普通用户' }}</text>
        </view>
        <text class="iconfont icon-right arrow"></text>
      </view>
    </view>

    <!-- Menu Groups -->
    
    <!-- Admin Management -->
    <view class="menu-group" v-if="isAdmin">
        <view class="group-title">管理中心</view>
        <view class="menu-item" @click="navTo('/pages/site/list')">
            <text class="iconfont icon-site menu-icon"></text>
            <text class="menu-text">工地管理</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
        <view class="menu-item" @click="navTo('/pages/manufacturer/list')">
            <text class="iconfont icon-factory menu-icon"></text>
            <text class="menu-text">厂家管理</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
        <view class="menu-item" @click="navTo('/pages/product/list')">
            <text class="iconfont icon-product menu-icon"></text>
            <text class="menu-text">产品管理</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
        <view class="menu-item" @click="navTo('/pages/material/list')">
            <text class="iconfont icon-product menu-icon"></text>
            <text class="menu-text">物料管理</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
        <view class="menu-item" @click="navTo('/pages/product-material/list')">
            <text class="iconfont icon-product menu-icon"></text>
            <text class="menu-text">产品与物料关系</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
         <view class="menu-item" @click="navTo('/pages/expense-item/list')">
            <text class="iconfont icon-transaction menu-icon"></text>
            <text class="menu-text">费用项管理</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
         <view class="menu-item" @click="navTo('/pages/profile/list')">
            <text class="iconfont icon-team menu-icon"></text>
            <text class="menu-text">用户管理</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
         <view class="menu-item" @click="navTo('/pages/role/list')">
            <text class="iconfont icon-safety menu-icon"></text>
            <text class="menu-text">角色管理</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
        <view class="menu-item" @click="navTo('/pages/role-manufacturer/list')">
            <text class="iconfont icon-link menu-icon"></text>
            <text class="menu-text">角色与厂家关系</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
         <view class="menu-item" @click="navTo('/pages/role-site/list')">
            <text class="iconfont icon-apartment menu-icon"></text>
            <text class="menu-text">角色与工地关系</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
    </view>
    
    <!-- Account Settings -->
    <view class="menu-group">
        <view class="group-title">账户设置</view>
        <view class="menu-item" @click="handleEditProfile">
            <text class="iconfont icon-edit menu-icon"></text>
            <text class="menu-text">编辑资料</text>
            <text class="iconfont icon-right arrow"></text>
        </view>
         <view class="menu-item logout" @click="handleLogout">
            <text class="iconfont icon-logout menu-icon"></text>
            <text class="menu-text">退出登录</text>
        </view>
    </view>

    <!-- Copyright -->
    <view class="footer">
        <text>Version 1.0.0</text>
    </view>

    <!-- Edit Modal (Reused Logic) -->
    <view class="modal-mask" v-if="showEditModal" @click="closeEditModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">编辑资料</view>
        <view class="modal-body">
             <view class="avatar-edit">
                 <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
                   <image v-if="editForm.avatarUrl" :src="editForm.avatarUrl" mode="aspectFill"></image>
                   <view v-else class="avatar-placeholder"><text class="iconfont icon-camera"></text></view>
                 </button>
             </view>
             <view class="form-item">
                 <text class="label">昵称</text>
                 <input class="input" type="nickname" v-model="editForm.nickname" @blur="onNicknameBlur" placeholder="请输入昵称"/>
             </view>
             <view class="form-item">
                 <text class="label">真实姓名</text>
                 <input class="input" type="text" v-model="editForm.name" placeholder="请输入真实姓名"/>
             </view>
             <view class="form-item">
                 <text class="label">邮箱</text>
                 <input class="input" type="text" v-model="editForm.email" placeholder="请输入邮箱"/>
             </view>
             <view class="form-item">
                 <text class="label">电话</text>
                 <input class="input" type="number" v-model="editForm.phone" placeholder="联系电话"/>
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
import { ref, computed, reactive } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';
import { uploadAvatar } from '@/utils/upload';
import { getCurrentUser, refreshUserPermissions } from '@/utils/permission';

const profile = ref<any>({});
const showEditModal = ref(false);
const loading = ref(false);

const editForm = reactive({
    name: '',
    nickname: '',
    email: '',
    phone: '',
    avatarUrl: ''
});

const isAdmin = computed(() => {
    return profile.value?.role_code === 'admin' || profile.value?.is_admin;
});

onShow(async () => {
    uni.showLoading({ title: '加载中...', mask: true });
    try {
        await loadData();
    } finally {
        uni.hideLoading();
    }
});

const loadData = async () => {
    let user = getCurrentUser();
    if (!user) {
        try {
            user = await refreshUserPermissions();
        } catch (e) {
            return;
        }
    }
    profile.value = user;
    
    // Fetch detailed profile for editing if needed, but current user info usually suffices for display
    // For editing we might want fresh data
    const { data } = await supabase.from('profile').select('*').eq('id', user?.id).single();
    if (data) {
        profile.value = { ...profile.value, ...data }; // Merge fresh data
    }
};

const navTo = (url: string) => {
    uni.navigateTo({ url });
};

const handleLogout = () => {
    uni.showModal({
        content: '确定退出吗？',
        success: async (res) => {
            if (res.confirm) {
                await supabase.auth.signOut();
                uni.removeStorageSync('userInfo');
                uni.removeStorageSync('profileInfo');
                uni.reLaunch({ url: '/pages/login/login' });
            }
        }
    });
};

const handleEditProfile = () => {
    editForm.name = profile.value.name || profile.value.full_name || '';
    editForm.nickname = profile.value.nickname || '';
    editForm.email = profile.value.email || '';
    editForm.phone = profile.value.phone || '';
    editForm.avatarUrl = profile.value.avatar_url || '';
    showEditModal.value = true;
};

const closeEditModal = () => {
    showEditModal.value = false;
};

const onChooseAvatar = (e: any) => {
    editForm.avatarUrl = e.detail.avatarUrl;
};

const onNicknameBlur = (e: any) => {
    if (e.detail.value) editForm.nickname = e.detail.value;
};

const saveProfile = async () => {
    loading.value = true;
    try {
        let avatarUrl = profile.value.avatar_url;
        
        // Upload Avatar if changed and is local path
        if (editForm.avatarUrl && editForm.avatarUrl !== avatarUrl && !editForm.avatarUrl.startsWith('http')) {
             const uploaded = await uploadAvatar(editForm.avatarUrl, profile.value.id);
             if (uploaded) avatarUrl = uploaded;
        } else if (editForm.avatarUrl) {
            avatarUrl = editForm.avatarUrl;
        }

        const updates = {
            full_name: editForm.name,
            nickname: editForm.nickname,
            email: editForm.email,
            phone: editForm.phone,
            avatar_url: avatarUrl,
            modify_time: new Date()
        };

        const { error } = await supabase.from('profile').update(updates).eq('id', profile.value.id);
        
        if (error) throw error;
        
        uni.showToast({ title: '保存成功', icon: 'success' });
        showEditModal.value = false;
        await refreshUserPermissions(profile.value.id); // Refresh global state
        loadData();
        
    } catch (e: any) {
        console.error('Profile save error:', e);
        const msg = e.message || (typeof e === 'string' ? e : '保存失败');
        uni.showToast({ title: '保存失败: ' + msg, icon: 'none' });
    } finally {
        loading.value = false;
    }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 40px;
}

.header-section {
    background: linear-gradient(135deg, #6739b6, #8a4fd3);
    padding: 60px 20px 40px;
    color: #fff;
    border-bottom-left-radius: 24px;
    border-bottom-right-radius: 24px;
}

.user-card {
    display: flex;
    align-items: center;
    background: rgba(255,255,255,0.1);
    backdrop-filter: blur(10px);
    padding: 20px;
    border-radius: 16px;
    
    .avatar-box {
        width: 60px;
        height: 60px;
        background: #fff;
        border-radius: 50%;
        margin-right: 15px;
        overflow: hidden;
        display: flex;
        justify-content: center;
        align-items: center;
        
        .avatar-img { width: 100%; height: 100%; }
        
        .avatar-placeholder {
            .iconfont { font-size: 30px; color: #ccc; }
        }
    }
    
    .user-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        
        .user-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 4px;
        }
        .user-role {
            font-size: 12px;
            background: rgba(0,0,0,0.2);
            padding: 2px 8px;
            border-radius: 10px;
            align-self: flex-start;
        }
    }
    
    .arrow { opacity: 0.7; }
}

.menu-group {
    background: #fff;
    margin: 20px 20px 0;
    border-radius: 16px;
    padding: 10px 0;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
    
    .group-title {
        font-size: 12px;
        color: #999;
        padding: 5px 20px 10px;
        border-bottom: 1px solid #f9f9f9;
        margin-bottom: 5px;
    }
}

.menu-item {
    display: flex;
    align-items: center;
    padding: 15px 20px;
    
    &:active { background: #f9f9f9; }
    
    .menu-icon {
        font-size: 20px;
        color: #6739b6;
        margin-right: 12px;
        width: 24px;
        text-align: center;
    }
    
    .menu-text {
        flex: 1;
        font-size: 15px;
        color: #333;
    }
    
    .arrow { font-size: 14px; color: #ccc; }
    
    &.logout {
        .menu-text, .menu-icon { color: #ff4d4f; }
    }
}

.footer {
    text-align: center;
    padding: 30px;
    color: #ccc;
    font-size: 12px;
}

/* Modal Styles */
.modal-mask {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999;
    display: flex; justify-content: center; align-items: center;
}
.modal-content {
    width: 80%; background: #fff; border-radius: 16px; overflow: hidden;
}
.modal-header {
    text-align: center; padding: 15px; font-weight: bold; border-bottom: 1px solid #eee;
}
.modal-body { padding: 20px; }
.avatar-edit {
    display: flex; justify-content: center; margin-bottom: 20px;
    .avatar-btn {
        width: 80px; height: 80px; border-radius: 50%; padding: 0;
        image { width: 100%; height: 100%; }
        .avatar-placeholder { width: 100%; height: 100%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; }
        .iconfont { font-size: 24px; color: #999; }
    }
}
.form-item {
    margin-bottom: 15px;
    .label { font-size: 12px; color: #666; margin-bottom: 4px; display: block; }
    .input { background: #f5f5f5; height: 40px; border-radius: 8px; padding: 0 10px; font-size: 14px; }
}
.modal-footer {
    display: flex; border-top: 1px solid #eee;
    button {
        flex: 1; border: none; background: #fff; height: 50px; font-size: 16px;
        &::after { border: none; }
        &.btn-cancel { color: #666; border-right: 1px solid #eee; }
        &.btn-confirm { color: #6739b6; }
    }
}
</style>
