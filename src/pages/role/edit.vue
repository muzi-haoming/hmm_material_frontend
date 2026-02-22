<template>
  <view class="container">
    <view class="form-card">
        <view class="form-item">
            <text class="label required">角色编码</text>
             <input class="input" type="text" v-model="form.code" placeholder="如: site_agent" :disabled="isEdit" />
             <text class="hint" v-if="!isEdit">编码一旦保存不可修改</text>
        </view>
        <view class="form-item">
            <text class="label required">角色名称</text>
             <input class="input" type="text" v-model="form.name" placeholder="如: 工地代理人" />
        </view>
    </view>
    
    <view class="footer-btn">
        <button class="btn-save" @click="handleSave" :disabled="loading">{{ loading ? '保存中...' : '保存' }}</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { supabase } from '@/utils/supabase';

const isEdit = ref(false);
const loading = ref(false);
const form = ref<any>({
    id: '',
    code: '',
    name: ''
});

onLoad(async (options: any) => {
    uni.showLoading({ title: '加载中...', mask: true });
    try {
        if (options.id) {
            isEdit.value = true;
            form.value.id = options.id;
            await loadData(options.id);
        }
    } finally {
        uni.hideLoading();
    }
});

const loadData = async (id: string) => {
    loading.value = true;
    const { data, error } = await supabase.from('role').select('*').eq('id', id).single();
    loading.value = false;
    if (data) {
        form.value.code = data.code;
        form.value.name = data.name;
    } else if (error) {
        uni.showToast({ title: '加载失败', icon: 'none' });
    }
};

const handleSave = async () => {
    if (!form.value.code || !form.value.name) {
        return uni.showToast({ title: '请填写完整信息', icon: 'none' });
    }
    
    loading.value = true;
    let error;
    
    if (isEdit.value) {
        const { error: updateError } = await supabase
            .from('role')
            .update({ name: form.value.name })
            .eq('id', form.value.id);
        error = updateError;
    } else {
        const { error: insertError } = await supabase
            .from('role')
            .insert({ code: form.value.code, name: form.value.name });
        error = insertError;
    }
    
    loading.value = false;
    
    if (error) {
        uni.showToast({ title: '保存失败: ' + error.message, icon: 'none' });
    } else {
        uni.showToast({ title: '保存成功', icon: 'success' });
        setTimeout(() => uni.navigateBack(), 1500);
    }
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 15px;
}

.form-card {
    background: #fff;
    border-radius: 12px;
    padding: 20px;
}

.form-item {
    margin-bottom: 20px;
    
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
        background: #f9f9f9;
        height: 44px;
        border-radius: 8px;
        padding: 0 12px;
        font-size: 14px;
        
        &[disabled] { color: #999; }
    }
    
    .hint {
        font-size: 12px;
        color: #999;
        margin-top: 4px;
        display: block;
    }
}

.footer-btn {
    margin-top: 30px;
    
    .btn-save {
        background: #6739b6;
        color: #fff;
        height: 46px;
        line-height: 46px;
        border-radius: 23px;
        font-size: 16px;
    }
}
</style>
