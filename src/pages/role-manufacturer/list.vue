<template>
  <view class="container">
    <view class="sidebar">
        <view 
            class="role-item" 
            :class="{ active: currentRoleId === item.id }"
            v-for="item in roleList" 
            :key="item.id"
            @click="handleRoleSelect(item)"
        >
            <text>{{ item.name }}</text>
        </view>
    </view>
    
    <view class="main-content">
        <view class="header" v-if="currentRole">
            <text class="title">正在配置: {{ currentRole.name }}</text>
            <view class="actions">
                <button class="btn-save" @click="handleSave" :disabled="loading">保存配置</button>
            </view>
        </view>
        <view class="empty-tip" v-else>
            请选择左侧角色进行配置
        </view>
        
        <scroll-view scroll-y class="list-area" v-if="currentRole">
             <label class="list-item" v-for="m in manufacturerList" :key="m.id">
                 <checkbox :value="m.id" :checked="isChecked(m.id)" @click="toggle(m.id)" color="#6739b6" />
                 <text class="item-name">{{ m.name }}</text>
                 <text class="item-code">{{ m.code }}</text>
             </label>
        </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { supabase } from '@/utils/supabase';

const roleList = ref<any[]>([]);
const manufacturerList = ref<any[]>([]);
const currentRole = ref<any>(null);
const currentRoleId = ref('');
const selectedIds = ref<Set<string>>(new Set());
const loading = ref(false);

onShow(() => {
    loadRoles();
    loadManufacturers();
});

const loadRoles = async () => {
    const { data } = await supabase.from('role').select('*').order('name');
    if (data) roleList.value = data;
};

const loadManufacturers = async () => {
    const { data } = await supabase.from('manufacturer').select('*').order('name');
    if (data) manufacturerList.value = data;
};

const handleRoleSelect = async (role: any) => {
    if (currentRoleId.value === role.id) return;
    currentRoleId.value = role.id;
    currentRole.value = role;
    await loadRelations(role.id);
};

const loadRelations = async (roleId: string) => {
    uni.showLoading({ title: '加载中' });
    const { data, error } = await supabase
        .from('role_manufacturer_rela')
        .select('manufacturer_id')
        .eq('role_id', roleId);
        
    uni.hideLoading();
    
    if (data) {
        selectedIds.value = new Set(data.map(item => item.manufacturer_id));
    } else {
        selectedIds.value = new Set();
    }
};

const isChecked = (id: string) => {
    return selectedIds.value.has(id);
};

const toggle = (id: string) => {
    if (selectedIds.value.has(id)) {
        selectedIds.value.delete(id);
    } else {
        selectedIds.value.add(id);
    }
    selectedIds.value = new Set(selectedIds.value);
};

const handleSave = async () => {
    if (!currentRoleId.value) return;
    
    loading.value = true;
    uni.showLoading({ title: '保存中' });
    
    // 1. Delete existing relations
    const { error: delError } = await supabase
        .from('role_manufacturer_rela')
        .delete()
        .eq('role_id', currentRoleId.value);
        
    if (delError) {
        uni.hideLoading();
        loading.value = false;
        return uni.showToast({ title: '保存失败: ' + delError.message, icon: 'none' });
    }
    
    // 2. Insert new relations
    if (selectedIds.value.size > 0) {
        const rows = Array.from(selectedIds.value).map(mid => ({
            role_id: currentRoleId.value,
            manufacturer_id: mid
        }));
        
        const { error: insError } = await supabase
            .from('role_manufacturer_rela')
            .insert(rows);
            
        if (insError) {
             uni.hideLoading();
             loading.value = false;
             return uni.showToast({ title: '保存失败: ' + insError.message, icon: 'none' });
        }
    }
    
    uni.hideLoading();
    loading.value = false;
    uni.showToast({ title: '保存成功', icon: 'success' });
};
</script>

<style lang="scss">
.container {
  height: 100vh;
  display: flex;
  background-color: #f5f7fa;
}

.sidebar {
    width: 100px;
    background: #fff;
    border-right: 1px solid #eee;
    height: 100%;
    overflow-y: auto;
    
    .role-item {
        padding: 15px 10px;
        text-align: center;
        font-size: 14px;
        color: #333;
        border-bottom: 1px solid #f9f9f9;
        
        &.active {
            background-color: #f0ebfa;
            color: #6739b6;
            border-left: 3px solid #6739b6;
            font-weight: bold;
        }
    }
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    
    .header {
        padding: 15px;
        background: #fff;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .title { font-weight: bold; font-size: 16px; }
        
        .btn-save {
            font-size: 12px;
            background: #6739b6;
            color: #fff;
            padding: 0 15px;
            height: 30px;
            line-height: 30px;
        }
    }
    
    .empty-tip {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #999;
    }
    
    .list-area {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        
        .list-item {
            display: flex;
            align-items: center;
            background: #fff;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            
            .item-name {
                flex: 1;
                margin-left: 10px;
                font-size: 15px;
            }
            .item-code {
                color: #999;
                font-size: 12px;
            }
        }
    }
}
</style>
