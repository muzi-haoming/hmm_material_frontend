<template>
  <view class="container">
    <view class="list">
       <view class="item" v-for="item in list" :key="item.id" @click="goEdit(item.id)">
         <text class="name">{{ item.name }}</text>
         <text class="code">{{ item.code }}</text>
       </view>
    </view>
    <view class="fab-add" @click="goAdd">+</view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

const list = ref<any[]>([]);

onShow(async () => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    await fetchList();
  } finally {
    uni.hideLoading();
  }
});

const fetchList = async () => {
  const { data } = await supabase.from('statement_other_expenses_item').select('*').order('create_time');
  if (data) list.value = data;
};

const goAdd = () => { uni.navigateTo({ url: '/pages/expense-item/edit' }); };
const goEdit = (id: string) => { uni.navigateTo({ url: `/pages/expense-item/edit?id=${id}` }); };
</script>

<style lang="scss">
.container { padding: 15px; background: #f5f5f5; min-height: 100vh; }
.item { background: #fff; padding: 15px; margin-bottom: 10px; border-radius: 8px; display: flex; justify-content: space-between; }
.name { font-weight: bold; color: #333; }
.code { color: #999; font-size: 14px; }
.fab-add {
  position: fixed;
  bottom: 30px;
  right: 30px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background-color: #6739b6;
  display: flex;
  justify-content: center;
  align-items: center;
  box-shadow: 0 4px 10px rgba(103, 57, 182, 0.4);
  
  .plus {
    color: #fff;
    font-size: 30px;
    font-weight: 300;
    margin-top: -4px;
  }
  
  &:active {
    transform: scale(0.95);
  }
}
</style>
