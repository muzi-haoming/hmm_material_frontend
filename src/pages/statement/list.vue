<template>
  <view class="container">
    <view class="search-bar">
      <view class="search-input-box">
        <text class="iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          placeholder="搜索对账单号" 
          @confirm="handleSearch"
        />
        <text v-if="keyword" class="iconfont icon-close" @click="clearSearch"></text>
      </view>
    </view>

    <view class="list-container">
      <view 
        class="list-item" 
        v-for="(item, index) in list" 
        :key="item.id"
        @click="goEdit(item.id)"
      >
        <view class="item-content">
          <text class="item-name">{{ item.code }}</text>
          <text class="item-sub">合同: {{ item.contract_name || '未知合同' }}</text>
          <text class="item-detail">
            {{ formatDate(item.start_time) }} 至 {{ formatDate(item.end_time) }}
          </text>
        </view>
        <view class="item-actions">
          <text class="iconfont icon-delete" @click.stop="handleDelete(item.id)"></text>
        </view>
      </view>
      
      <view v-if="list.length === 0 && !loading" class="empty-state">
        <text>暂无数据</text>
      </view>
    </view>

    <view class="fab-add" @click="goAdd">
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

interface Statement {
  id: string;
  code: string;
  contract_id: string;
  contract_name?: string;
  start_time: string;
  end_time: string;
}

const list = ref<Statement[]>([]);
const keyword = ref('');
const loading = ref(false);

const fetchData = async () => {
  loading.value = true;
  let query = supabase
    .from('statement')
    .select('*, contract:contract_id(name)')
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.ilike('code', `%${keyword.value}%`);
  }

  const { data, error } = await query;
  
  if (error) {
    console.error('Error fetching statement:', error);
    uni.showToast({ title: '加载失败', icon: 'none' });
  } else {
    // Map contract name
    list.value = (data || []).map((item: any) => ({
      ...item,
      contract_name: item.contract?.name
    }));
  }
  loading.value = false;
};

const handleSearch = () => {
  fetchData();
};

const clearSearch = () => {
  keyword.value = '';
  fetchData();
};

const goAdd = () => {
  uni.navigateTo({ url: '/pages/statement/edit' });
};

const goEdit = (id: string) => {
  uni.navigateTo({ url: `/pages/statement/edit?id=${id}` });
};

const handleDelete = async (id: string) => {
  uni.showModal({
    title: '提示',
    content: '删除对账单将同时删除关联明细，确定吗？',
    success: async (res) => {
      if (res.confirm) {
        // Cascade delete should ideally be handled by DB foreign keys, but we can do it here explicitly to be safe if cascade isn't set up
        // Assuming cascade is ON in DB, or we delete children first.
        // Given we don't control DB schema strictly here, let's try delete parent. If constraint fails, we delete children first.
        
        // Try Delete Parent
        const { error } = await supabase.from('statement').delete().eq('id', id);
        
        if (error) {
          // If foreign key constraint fails, delete children first (manual cascade)
           await supabase.from('statement_material_detail').delete().eq('statement_id', id);
           await supabase.from('statement_other_expenses_detail').delete().eq('statement_id', id);
           const { error: retryError } = await supabase.from('statement').delete().eq('id', id);
           
           if (retryError) {
             uni.showToast({ title: '删除失败', icon: 'none' });
           } else {
             uni.showToast({ title: '已删除', icon: 'success' });
             fetchData();
           }
        } else {
          uni.showToast({ title: '已删除', icon: 'success' });
          fetchData();
        }
      }
    }
  });
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

onShow(() => {
  fetchData();
});
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 80px;
}

.search-bar {
  background-color: #fff;
  padding: 10px 15px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.search-input-box {
  background-color: #f0f0f0;
  border-radius: 20px;
  height: 40px;
  display: flex;
  align-items: center;
  padding: 0 15px;
  
  .search-input {
    flex: 1;
    font-size: 14px;
    margin-left: 10px;
  }
}

.list-container {
  padding: 15px;
}

.list-item {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  
  &:active {
    background-color: #fafafa;
  }
}

.item-content {
  display: flex;
  flex-direction: column;
}

.item-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.item-sub {
  font-size: 14px;
  color: #666;
  margin-bottom: 5px;
}

.item-detail {
  font-size: 13px;
  color: #6739b6;
  font-weight: bold;
}

.item-actions {
  padding: 10px;
}

.icon-delete {
  color: #ff4d4f;
  font-size: 20px;
}

.empty-state {
  text-align: center;
  padding-top: 50px;
  color: #999;
}

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
