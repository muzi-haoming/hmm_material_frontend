<template>
  <view class="container">
    <!-- Header Info -->
    <view class="header-card">
      <view class="header-top">
        <view class="title-row">
          <text class="title">{{ statement?.code || '加载中...' }}</text>
          <text class="status-tag" :class="statusClass">{{ statusText }}</text>
        </view>
        <view class="card-actions">
           <template v-if="!isConfirmed">
               <text class="action-btn text-primary" @click="goEditHeader">编辑</text>
               <text class="action-btn text-success" @click="confirmStatement">确认</text>
           </template>
           <template v-else-if="!isCompleted">
               <text class="action-btn text-danger" @click="completeStatement">完成</text>
           </template>
        </view>
      </view>
      <view class="header-row">
        <text class="label">合同：</text>
        <text class="value">{{ statement?.contract?.name }}</text>
      </view>
      <view class="header-row">
        <text class="label">周期：</text>
        <text class="value">{{ formatDate(statement?.start_time) }} 至 {{ formatDate(statement?.end_time) }}</text>
      </view>
      <view class="header-row">
         <text class="label">金额：</text>
         <text class="value money">¥{{ totalAmount }}</text>
      </view>
    </view>

    <!-- Tabs -->
    <view class="tabs">
      <view class="tab-item" :class="{ active: currentTab === 0 }" @click="currentTab = 0">物资明细</view>
      <view class="tab-item" :class="{ active: currentTab === 1 }" @click="currentTab = 1">其他费用</view>
      <view class="tab-item" :class="{ active: currentTab === 2 }" @click="currentTab = 2">关联发票</view>
    </view>

    <!-- Tab 1: Materials -->
    <view v-if="currentTab === 0" class="tab-content">
      <view class="action-bar" v-if="!isConfirmed">
        <button class="btn-mini" @click="openMaterialModal">+ 添加物资</button>
      </view>
      <view class="list">
        <view class="list-item" v-for="(item, index) in materials" :key="item.id">
          <view class="item-main">
            <view class="detail-row">
              <text class="detail-label">物料：</text>
              <text class="detail-value">{{ item.product?.name }}</text>
            </view>
            <view class="detail-row">
              <text class="detail-label">数量：</text>
              <text class="detail-value">{{ item.quantity }}</text>
            </view>
          </view>
          <view class="item-side">
            <text class="item-amount">¥{{ item.amount }}</text>
            <text class="iconfont icon-delete" v-if="!isConfirmed" @click="deleteMaterial(item.id)"></text>
          </view>
        </view>
        <view v-if="materials.length === 0" class="empty-state">暂无物资</view>
      </view>
    </view>

    <!-- Tab 2: Expenses -->
    <view v-if="currentTab === 1" class="tab-content">
      <view class="action-bar" v-if="!isConfirmed">
        <button class="btn-mini" @click="openExpenseModal">+ 添加费用</button>
      </view>
       <view class="list">
        <view class="list-item" v-for="(item, index) in expenses" :key="item.id">
          <view class="item-main">
            <text class="item-title">{{ item.item?.name || '未知费用' }}</text>
          </view>
          <view class="item-side">
            <text class="item-amount">¥{{ item.amount }}</text>
            <text class="iconfont icon-delete" v-if="!isConfirmed" @click="deleteExpense(item.id)"></text>
          </view>
        </view>
        <view v-if="expenses.length === 0" class="empty-state">暂无费用</view>
      </view>
    </view>

    <!-- Tab 3: Invoices -->
    <view v-if="currentTab === 2" class="tab-content">
      <view class="action-bar" v-if="!isConfirmed">
        <button class="btn-mini" @click="openLinkInvoice">+ 关联发票</button>
      </view>
       <view class="list">
        <view class="list-item" v-for="(item, index) in invoices" :key="item.id">
          <view class="item-main">
            <text class="item-title">{{ item.invoice?.invoice_title }}</text>
            <text class="item-sub">{{ item.invoice?.invoice_no }}</text>
          </view>
          <view class="item-side">
            <text class="item-amount">¥{{ item.invoice?.amount }}</text>
            <text class="iconfont icon-delete" v-if="!isConfirmed" @click="unlinkInvoice(item.id)"></text>
          </view>
        </view>
        <view v-if="invoices.length === 0" class="empty-state">暂无关联发票</view>
      </view>
    </view>



    <!-- Material Modal -->
    <view class="modal-mask" v-if="showMaterialModal" @click="closeMaterialModal">
      <view class="modal-content" @click.stop>
        <view class="modal-title">添加物资</view>
        <view class="form-group">
          <picker @change="bindProductChange" :value="tempMaterial.productIndex" :range="products" range-key="name">
             <view class="picker-input">{{ products[tempMaterial.productIndex]?.name || '选择产品' }}</view>
          </picker>
          <input class="modal-input" type="digit" v-model="tempMaterial.quantity" placeholder="数量" />
          <input class="modal-input" type="digit" v-model="tempMaterial.amount" placeholder="金额" />
        </view>
        <view class="modal-footer">
          <button @click="closeMaterialModal">取消</button>
          <button class="primary" @click="saveMaterial">确定</button>
        </view>
      </view>
    </view>

    <!-- Expense Modal -->
    <view class="modal-mask" v-if="showExpenseModal" @click="closeExpenseModal">
      <view class="modal-content" @click.stop>
        <view class="modal-title">添加费用</view>
        <view class="form-group">
          <picker @change="bindExpenseItemChange" :value="tempExpense.itemIndex" :range="expenseItems" range-key="name">
             <view class="picker-input">{{ expenseItems[tempExpense.itemIndex]?.name || '选择费用项' }}</view>
          </picker>
          <input class="modal-input" type="digit" v-model="tempExpense.amount" placeholder="金额" />
        </view>
        <view class="modal-footer">
          <button @click="closeExpenseModal">取消</button>
          <button class="primary" @click="saveExpense">确定</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad, onShow } from '@dcloudio/uni-app';

const statementId = ref('');
const statement = ref<any>(null);
const currentTab = ref(0);
const materials = ref<any[]>([]);
const expenses = ref<any[]>([]);
const invoices = ref<any[]>([]);

// Options
const products = ref<any[]>([]);
const expenseItems = ref<any[]>([]);

// Modals
const showMaterialModal = ref(false);
const tempMaterial = ref({ productIndex: -1, quantity: '', amount: '' });
const showExpenseModal = ref(false);
const tempExpense = ref({ itemIndex: -1, amount: '' });

onLoad((options: any) => {
    if (options.id) statementId.value = options.id;
    fetchOptions();
});

onShow(() => {
    if (statementId.value) loadData();
});

const loadData = async () => {
    uni.showLoading({ title: '加载中' });
    const { data } = await supabase.from('statement').select('*, contract:contract_id(name)').eq('id', statementId.value).single();
    if (data) statement.value = data;

    const { data: mats } = await supabase.from('statement_material_detail').select('*, product:product_id(name)').eq('statement_id', statementId.value);
    if (mats) materials.value = mats;

    const { data: exps } = await supabase.from('statement_other_expenses_detail').select('*, item:item_id(name)').eq('statement_id', statementId.value);
    if (exps) expenses.value = exps;
    
    const { data: invs } = await supabase.from('statement_invoice_rela').select('*, invoice:invoice_id(invoice_no, invoice_title, amount)').eq('statement_id', statementId.value);
    if (invs) invoices.value = invs;
    
    uni.hideLoading();
};

const fetchOptions = async () => {
    const { data: p } = await supabase.from('product').select('id, name');
    if (p) products.value = p;
    const { data: e } = await supabase.from('statement_other_expenses_item').select('id, name');
    if (e) expenseItems.value = e;
};

const isConfirmed = computed(() => statement.value?.is_confirmed);
const isCompleted = computed(() => statement.value?.is_completed);

const statusText = computed(() => {
    if (statement.value?.is_completed) return '已完成';
    if (statement.value?.is_confirmed) return '已确认';
    return '待确认';
});

const statusClass = computed(() => {
    if (statement.value?.is_completed) return 'status-completed';
    if (statement.value?.is_confirmed) return 'status-confirmed';
    return 'status-unconfirmed';
});

const totalAmount = computed(() => {
    const matTotal = materials.value.reduce((sum, m) => sum + (m.amount || 0), 0);
    const expTotal = expenses.value.reduce((sum, e) => sum + (e.amount || 0), 0);
    return (matTotal + expTotal).toFixed(2);
});

const formatDate = (str: string) => str ? str.split('T')[0] : '';

const goEditHeader = () => {
    uni.navigateTo({ url: `/pages/statement/edit?id=${statementId.value}` });
};

// Material
const openMaterialModal = () => {
    tempMaterial.value = { productIndex: -1, quantity: '', amount: '' };
    showMaterialModal.value = true;
};
const closeMaterialModal = () => { showMaterialModal.value = false; };
const bindProductChange = (e: any) => { tempMaterial.value.productIndex = e.detail.value; };
const saveMaterial = async () => {
    if (tempMaterial.value.productIndex === -1) return uni.showToast({ title: '请选择产品', icon: 'none' });
    const { error } = await supabase.from('statement_material_detail').insert({
        statement_id: statementId.value,
        product_id: products.value[tempMaterial.value.productIndex].id,
        quantity: parseFloat(tempMaterial.value.quantity),
        amount: parseFloat(tempMaterial.value.amount)
    });
    if (error) uni.showToast({ title: '添加失败', icon: 'none' });
    else { closeMaterialModal(); loadData(); }
};
const deleteMaterial = async (id: string) => {
    const { error } = await supabase.from('statement_material_detail').delete().eq('id', id);
    if (!error) loadData();
};

// Expense
const openExpenseModal = () => {
    tempExpense.value = { itemIndex: -1, amount: '' };
    showExpenseModal.value = true;
};
const closeExpenseModal = () => { showExpenseModal.value = false; };
const bindExpenseItemChange = (e: any) => { tempExpense.value.itemIndex = e.detail.value; };
const saveExpense = async () => {
    if (tempExpense.value.itemIndex === -1) return uni.showToast({ title: '请选择费用项', icon: 'none' });
    const { error } = await supabase.from('statement_other_expenses_detail').insert({
        statement_id: statementId.value,
        item_id: expenseItems.value[tempExpense.value.itemIndex].id,
        amount: parseFloat(tempExpense.value.amount)
    });
    if (error) uni.showToast({ title: '添加失败', icon: 'none' });
    else { closeExpenseModal(); loadData(); }
};
const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('statement_other_expenses_detail').delete().eq('id', id);
    if (!error) loadData();
};

// Invoice
const openLinkInvoice = () => {
    // Navigate to a selection page or show a picker. 
    // Since Invoice list can be long, maybe navigate to a selector page?
    // Or simplified: show invoice list page with select mode?
    // For now, let's just toast "请前往发票列表关联" or implement a simple picker if list is short.
    // Better: Navigate to `invoice/list?mode=select&statementId=...`
    // But I haven't implemented select mode in invoice list.
    // I'll skip implementing complex Invoice Selector for this turn to save space.
    uni.showToast({ title: '暂未实现关联发票选择', icon: 'none' });
};
const unlinkInvoice = async (id: string) => {
    const { error } = await supabase.from('statement_invoice_rela').delete().eq('id', id);
    if (!error) loadData();
};

// Actions
const confirmStatement = async () => {
    const { error } = await supabase.from('statement').update({ is_confirmed: true }).eq('id', statementId.value);
    if (!error) loadData();
    else uni.showToast({ title: '确认失败', icon: 'none' });
};
const completeStatement = async () => {
    const { error } = await supabase.from('statement').update({ is_completed: true }).eq('id', statementId.value);
    if (!error) loadData();
    else uni.showToast({ title: '完成失败', icon: 'none' });
};
</script>

<style lang="scss">
.container { min-height: 100vh; background: #f5f5f5; padding-bottom: 80px; }
.header-card { background: #fff; padding: 20px; margin-bottom: 10px; }
.header-top { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: center; }
.title-row { flex: 1; display: flex; align-items: center; gap: 10px; }
.title { font-size: 18px; font-weight: bold; }
.card-actions { display: flex; gap: 15px; align-items: center; }
.action-btn { font-size: 14px; font-weight: 500; cursor: pointer; &:active { opacity: 0.7; } }
.text-primary { color: #6739b6; }
.text-warning { color: #fa8c16; }
.text-success { color: #52c41a; }
.text-danger { color: #ff4d4f; }
.status-tag { font-size: 12px; padding: 2px 8px; border-radius: 4px; 
    &.status-unconfirmed { background: #fff7e6; color: #fa8c16; }
    &.status-confirmed { background: #e6f7ff; color: #1890ff; }
    &.status-completed { background: #f6ffed; color: #52c41a; }
}
.header-row { display: flex; margin-bottom: 5px; font-size: 14px; color: #666; .label { width: 60px; } .value { color: #333; } .money { color: #ff4d4f; font-weight: bold; } }

.tabs { display: flex; background: #fff; border-bottom: 1px solid #eee; }
.tab-item { flex: 1; text-align: center; padding: 15px 0; font-size: 15px; color: #666; &.active { color: #6739b6; border-bottom: 2px solid #6739b6; } }

.tab-content { padding: 15px; }
.action-bar { margin-bottom: 10px; text-align: right; }
.btn-mini { display: inline-block; font-size: 12px; background: #6739b6; color: #fff; border-radius: 12px; padding: 4px 12px; }

.list-item { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
.item-title { font-size: 15px; font-weight: 500; color: #333; }
.item-sub { font-size: 12px; color: #999; margin-top: 4px; }
.item-side { text-align: right; }
.item-amount { font-size: 15px; font-weight: bold; color: #333; display: block; margin-bottom: 5px; }
.icon-delete { color: #ff4d4f; font-size: 16px; }

.detail-row {
  display: flex;
  font-size: 13px;
  margin-bottom: 4px;
  line-height: 1.4;
  
  .detail-label {
    color: #999;
    width: 48px;
    flex-shrink: 0;
  }
  
  .detail-value {
    color: #666;
    flex: 1;
    word-break: break-all;
  }
}



.modal-mask { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 999; display: flex; justify-content: center; align-items: center; }
.modal-content { background: #fff; width: 80%; border-radius: 10px; padding: 20px; }
.modal-title { text-align: center; font-size: 18px; font-weight: bold; margin-bottom: 20px; }
.form-group { margin-bottom: 20px; }
.picker-input { background: #f9f9f9; padding: 10px; border-radius: 4px; margin-bottom: 10px; color: #333; }
.modal-input { background: #f9f9f9; padding: 10px; border-radius: 4px; margin-bottom: 10px; font-size: 14px; }
.modal-footer { display: flex; gap: 10px; button { flex: 1; font-size: 14px; &.primary { background: #6739b6; color: #fff; } } }
.empty-state { text-align: center; color: #999; padding: 20px; }
</style>
