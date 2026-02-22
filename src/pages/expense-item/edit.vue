<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">编码</text>
        <input class="input" v-model="form.code" disabled placeholder="自动生成" />
      </view>
      <view class="form-item">
        <text class="label required">名称</text>
        <input class="input" v-model="form.name" placeholder="输入名称" />
      </view>
    </view>
    <view class="footer">
      <button class="btn-save" @click="save">保存</button>
      <button class="btn-delete" v-if="form.id" @click="del">删除</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
import { onLoad } from '@dcloudio/uni-app';

const form = ref({ id: '', code: '', name: '' });

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    if (options.id) {
      form.value.id = options.id;
      await loadData(options.id);
    } else {
      form.value.code = await generateCode('statement_other_expenses_item', 'FY');
    }
  } finally {
    uni.hideLoading();
  }
});

const loadData = async (id: string) => {
  const { data } = await supabase.from('statement_other_expenses_item').select('*').eq('id', id).single();
  if (data) form.value = data;
};

const save = async () => {
  const payload = { code: form.value.code, name: form.value.name };
  let error;
  if (form.value.id) {
    const { error: e } = await supabase.from('statement_other_expenses_item').update(payload).eq('id', form.value.id);
    error = e;
  } else {
    const { error: e } = await supabase.from('statement_other_expenses_item').insert(payload);
    error = e;
  }
  
  if (error) uni.showToast({ title: '保存失败: ' + error.message, icon: 'none' });
  else {
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
  }
};

const del = async () => {
   const { error } = await supabase.from('statement_other_expenses_item').delete().eq('id', form.value.id);
   if (error) uni.showToast({ title: '删除失败', icon: 'none' });
   else {
     uni.showToast({ title: '已删除', icon: 'success' });
     setTimeout(() => uni.navigateBack(), 1500);
   }
};
</script>

<style lang="scss">
.container { padding: 15px; background: #f5f5f5; min-height: 100vh; }
.form-card { background: #fff; padding: 15px; border-radius: 10px; }
.form-item { margin-bottom: 15px; .label { display: block; margin-bottom: 5px; } .input { background: #f9f9f9; height: 40px; border-radius: 4px; padding: 0 10px; } }
.footer { margin-top: 20px; display: flex; gap: 10px; .btn-save { flex: 2; background: #6739b6; color: #fff; } .btn-delete { flex: 1; background: #f5f5f5; color: red; } }
</style>
