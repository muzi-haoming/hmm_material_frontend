<template>
  <view class="container">
    <!-- Tab Navigation -->
    <view class="tab-header">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="switchTab(0)">
        <text>对账单</text>
        <view class="tab-line" v-if="currentTab === 0"></view>
      </view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="switchTab(1)">
        <text>发票库</text>
        <view class="tab-line" v-if="currentTab === 1"></view>
      </view>
    </view>

    <!-- Search Bar -->
    <view class="search-bar">
      <view class="search-input-box">
        <text class="iconfont icon-search"></text>
        <input 
          class="search-input" 
          type="text" 
          v-model="keyword" 
          :placeholder="currentTab === 0 ? '搜索对账单号' : '搜索发票号/抬头'" 
          @confirm="fetchData"
        />
        <text v-if="keyword" class="iconfont icon-close" @click="clearSearch"></text>
      </view>
    </view>

    <!-- Content Area -->
    <view class="list-container">
      
      <!-- Statement List -->
      <block v-if="currentTab === 0">
         <view 
            class="list-item" 
            v-for="(item, index) in statementList" 
            :key="item.id"
            @click="goStatementDetail(item.id)"
          >
            <view class="item-content">
              <view class="item-header-row">
                 <text class="item-name">{{ item.code }}</text>
                 <text class="status-tag" :class="getStatusClass(item)">{{ getStatusText(item) }}</text>
              </view>
              <text class="item-sub">合同: {{ item.contract_name || '未知合同' }}</text>
              <text class="item-detail">
                {{ formatDate(item.start_time) }} 至 {{ formatDate(item.end_time) }}
              </text>
            </view>
            <view class="item-actions">
              <text class="iconfont icon-delete" @click.stop="handleDeleteStatement(item)" v-if="!item.is_confirmed"></text>
            </view>
          </view>
          <view v-if="statementList.length === 0 && !loading" class="empty-state">
            <text>暂无对账单</text>
          </view>
      </block>

      <!-- Invoice List -->
      <block v-if="currentTab === 1">
          <view class="list-item" v-for="item in invoiceList" :key="item.id" @click="goInvoiceDetail(item.id)">
            <view class="invoice-header">
              <text class="item-title">{{ item.invoice_title }}</text>
              <text class="item-amount">¥{{ item.amount }}</text>
            </view>
            <view class="item-body">
              <view class="info-row">
                <text class="label">发票号:</text>
                <text class="value">{{ item.invoice_no }}</text>
              </view>
              <view class="info-row">
                <text class="label">开票日期:</text>
                <text class="value">{{ formatDate(item.issued_time) }}</text>
              </view>
            </view>
          </view>
          <view v-if="invoiceList.length === 0 && !loading" class="empty-state">
            <text>暂无发票</text>
          </view>
      </block>

    </view>

    <!-- Floating Action Button -->
    <view class="fab-add" @click="goAdd">
      <text class="plus">+</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

// Types
interface Statement {
  id: string;
  code: string;
  contract_id: string;
  contract_name?: string;
  start_time: string;
  end_time: string;
  is_confirmed: boolean;
  is_completed: boolean;
}

interface Invoice {
    id: string;
    invoice_no: string;
    invoice_title: string;
    amount: number;
    issued_time: string;
}

// State
const currentTab = ref(0);
const keyword = ref('');
const loading = ref(false);
const statementList = ref<Statement[]>([]);
const invoiceList = ref<Invoice[]>([]);

// Methods
const switchTab = (index: number) => {
    currentTab.value = index;
    keyword.value = '';
    fetchData();
};

const fetchData = async () => {
    loading.value = true;
    if (currentTab.value === 0) {
        await fetchStatements();
    } else {
        await fetchInvoices();
    }
    loading.value = false;
};

const fetchStatements = async () => {
  let query = supabase
    .from('statement')
    .select('*, contract:contract_id(name)')
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.ilike('code', `%${keyword.value}%`);
  }

  const { data, error } = await query;
  if (!error) {
    statementList.value = (data || []).map((item: any) => ({
      ...item,
      contract_name: item.contract?.name
    }));
  }
};

const fetchInvoices = async () => {
  let query = supabase
    .from('invoice')
    .select('id, invoice_no, invoice_title, amount, issued_time, create_time')
    .order('create_time', { ascending: false });

  if (keyword.value) {
    query = query.or(`invoice_no.ilike.%${keyword.value}%,invoice_title.ilike.%${keyword.value}%`);
  }

  const { data, error } = await query;
  if (data) {
    invoiceList.value = data;
  }
};

const clearSearch = () => {
    keyword.value = '';
    fetchData();
};

const goAdd = () => {
    if (currentTab.value === 0) {
        uni.navigateTo({ url: '/pages/statement/edit' });
    } else {
        uni.navigateTo({ url: '/pages/invoice/edit' });
    }
};

const goStatementDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/statement/detail?id=${id}` });
};

const goInvoiceDetail = (id: string) => {
  uni.navigateTo({ url: `/pages/invoice/edit?id=${id}` });
};

const handleDeleteStatement = async (item: Statement) => {
  if (item.is_confirmed) {
      return uni.showToast({ title: '已确认的单据无法删除', icon: 'none' });
  }
  
  uni.showModal({
    title: '提示',
    content: '确定要删除该对账单吗？',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '删除中' });
        // Cascade delete simulation
        await supabase.from('statement_material_detail').delete().eq('statement_id', item.id);
        await supabase.from('statement_other_expenses_detail').delete().eq('statement_id', item.id);
        await supabase.from('statement_invoice_rela').delete().eq('statement_id', item.id);
        
        const { error } = await supabase.from('statement').delete().eq('id', item.id);
        
        uni.hideLoading();
        if (error) {
           uni.showToast({ title: '删除失败', icon: 'none' });
        } else {
           fetchStatements();
        }
      }
    }
  });
};

const getStatusText = (item: any) => {
  if (item.is_completed) return '已完成';
  if (item.is_confirmed) return '已确认';
  return '待确认';
};

const getStatusClass = (item: any) => {
  if (item.is_completed) return 'status-completed';
  if (item.is_confirmed) return 'status-confirmed';
  return 'status-unconfirmed';
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
};

onShow(() => {
    fetchData();
});
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding-bottom: 20px;
}

.tab-header {
    background: #fff;
    display: flex;
    justify-content: space-around;
    padding: 10px 0;
    position: sticky;
    top: 0;
    z-index: 100;
    
    .tab-item {
        position: relative;
        padding: 10px 0;
        font-size: 16px;
        color: #666;
        
        &.active {
            color: #6739b6;
            font-weight: bold;
        }
        
        .tab-line {
            position: absolute;
            bottom: 0;
            left: 50%;
            transform: translateX(-50%);
            width: 20px;
            height: 3px;
            background-color: #6739b6;
            border-radius: 2px;
        }
    }
}

.search-bar {
  background-color: #fff;
  padding: 10px 15px;
}

.search-input-box {
  background-color: #f0f0f0;
  border-radius: 8px;
  height: 36px;
  display: flex;
  align-items: center;
  padding: 0 10px;
  
  .search-input {
    flex: 1;
    font-size: 14px;
    margin-left: 8px;
  }
}

.list-container {
  padding: 15px;
}

.list-item {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.02);
  
  .item-content {
      display: flex;
      flex-direction: column;
  }

  .item-header-row, .invoice-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
      
      .item-name, .item-title {
          font-size: 16px;
          font-weight: 600;
          color: #333;
      }
      
      .item-amount {
          font-size: 16px;
          font-weight: bold;
          color: #ff4d4f;
      }
  }

  .item-sub, .label, .value {
     font-size: 13px;
     color: #666;
     margin-bottom: 4px;
  }

  .item-detail {
      font-size: 12px;
      color: #6739b6;
      font-weight: 500;
  }
  
  .item-actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 8px;
      
      .icon-delete {
          color: #ff4d4f;
          font-size: 18px;
      }
  }
  
  .item-body {
     .info-row {
        display: flex;
        margin-bottom: 4px;
        .label {
            width: 70px;
            color: #999;
        }
        .value {
            flex: 1;
        }
     }
  }
}

.status-tag {
    font-size: 12px;
    padding: 2px 6px;
    border-radius: 4px;
    
    &.status-unconfirmed { background: #fff7e6; color: #fa8c16; }
    &.status-confirmed { background: #e6f7ff; color: #1890ff; }
    &.status-completed { background: #f6ffed; color: #52c41a; }
}

.empty-state {
  text-align: center;
  padding-top: 50px;
  color: #999;
  font-size: 14px;
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
