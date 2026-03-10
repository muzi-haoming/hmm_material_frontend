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
               <text class="action-btn text-warning" @click="unconfirmStatement">取消确认</text>
               <text class="action-btn text-danger" @click="completeStatement">完成</text>
           </template>
           <template v-else>
               <text class="action-btn text-warning" @click="uncompleteStatement">取消完成</text>
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
            <view class="item-actions" v-if="!isConfirmed">
              <text class="action-btn text-danger" @click.stop="deleteMaterial(item.id)">删除</text>
            </view>
          </view>
        </view>
        <view v-if="materials.length === 0" class="empty-state">暂无物资</view>
      </view>
    </view>

    <!-- Tab 2: Expenses -->
    <view v-if="currentTab === 1" class="tab-content">
       <view class="list">
        <view class="list-item" v-for="(item, index) in expenses" :key="item.id">
          <view class="item-main">
            <view class="item-title">{{ item.item?.name || '未知费用' }}</view>
          </view>
          <view class="item-side">
            <text class="item-amount">¥{{ item.amount }}</text>
            <view class="item-actions" v-if="!isConfirmed">
              <text class="action-btn text-danger" @click.stop="deleteExpense(item.id)">删除</text>
            </view>
          </view>
        </view>
        <view v-if="expenses.length === 0" class="empty-state">暂无费用</view>
      </view>
    </view>

    <!-- Tab 3: Invoices -->
    <view v-if="currentTab === 2" class="tab-content">
       <view class="list">
        <view class="list-item" v-for="(item, index) in invoices" :key="item.id">
          <view class="item-main">
            <view class="item-title">{{ item.invoice?.invoice_title }}</view>
            <view class="item-sub">{{ item.invoice?.invoice_no }}</view>
          </view>
          <view class="item-side">
            <text class="item-amount">¥{{ item.invoice?.amount }}</text>
            <view class="item-actions">
              <text class="action-btn text-warning" v-if="isConfirmed && !isCompleted" @click.stop="unlinkInvoice(item.id)">取消关联</text>
              <text class="action-btn text-primary" @click.stop="goInvoiceDetail(item.invoice_id)">详情</text>
            </view>
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

    <!-- Floating Action Button -->
    <view class="fab-add" v-if="(currentTab !== 2 && !isConfirmed) || (currentTab === 2 && isConfirmed && !isCompleted)" @click="handleAddClick">
      <text class="plus">+</text>
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

    const { data: mats } = await supabase.from('statement_material_detail').select('*, product:product_id(name)').eq('statement_id', statementId.value).order('create_time', { ascending: true });
    if (mats) materials.value = mats;

    const { data: exps } = await supabase.from('statement_other_expenses_detail').select('*, item:item_id(name)').eq('statement_id', statementId.value).order('create_time', { ascending: true });
    if (exps) expenses.value = exps;
    
    const { data: invs } = await supabase.from('statement_invoice_rela').select('*, invoice:invoice_id(invoice_no, invoice_title, amount)').eq('statement_id', statementId.value).order('create_time', { ascending: true });
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

// Main Add Button Click Handler
const handleAddClick = () => {
    if (currentTab.value === 0) {
        openMaterialModal();
    } else if (currentTab.value === 1) {
        openExpenseModal();
    } else if (currentTab.value === 2) {
        openLinkInvoice();
    }
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
    uni.showModal({
        title: '提示',
        content: '确定要删除该物资明细吗？',
        success: async (res) => {
            if (res.confirm) {
                const { error } = await supabase.from('statement_material_detail').delete().eq('id', id);
                if (!error) {
                    uni.showToast({ title: '已删除', icon: 'success' });
                    loadData();
                } else {
                    uni.showToast({ title: '删除事败: ' + error.message, icon: 'none' });
                }
            }
        }
    });
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
    uni.showModal({
        title: '提示',
        content: '确定要删除该费用项吗？',
        success: async (res) => {
            if (res.confirm) {
                const { error } = await supabase.from('statement_other_expenses_detail').delete().eq('id', id);
                if (!error) {
                    uni.showToast({ title: '已删除', icon: 'success' });
                    loadData();
                } else {
                    uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
                }
            }
        }
    });
};

// Invoice
const openLinkInvoice = () => {
    uni.$once('invoiceSelected', async (invoice: any) => {
        // 检查是否已经关联过该发票
        if (invoices.value.some(inv => inv.invoice_id === invoice.id)) {
            return uni.showToast({ title: '已关联该发票', icon: 'none' });
        }
        
        uni.showLoading({ title: '关联中...' });
        const { error } = await supabase.from('statement_invoice_rela').insert({
            statement_id: statementId.value,
            invoice_id: invoice.id
        });
        uni.hideLoading();
        
        if (error) {
            if (error.code === '23505') {
                 uni.showToast({ title: '发票已关联', icon: 'none' });
            } else {
                 uni.showToast({ title: '关联失败: ' + error.message, icon: 'none' });
            }
        } else {
            uni.showToast({ title: '关联成功', icon: 'success' });
            loadData();
        }
    });

    uni.navigateTo({ url: '/pages/invoice/list?mode=select' });
};
const unlinkInvoice = async (id: string) => {
    uni.showModal({
        title: '提示',
        content: '确定要取消关联此发票吗？',
        success: async (res) => {
            if (res.confirm) {
                const { error } = await supabase.from('statement_invoice_rela').delete().eq('id', id);
                if (!error) {
                    uni.showToast({ title: '已取消关联', icon: 'success' });
                    loadData();
                } else {
                    uni.showToast({ title: '取消关联失败: ' + error.message, icon: 'none' });
                }
            }
        }
    });
};
const goInvoiceDetail = (invoiceId: string) => {
    if (invoiceId) {
        uni.navigateTo({ url: `/pages/invoice/edit?id=${invoiceId}` });
    }
};

const confirmStatement = async () => {
    uni.navigateTo({ url: `/pages/statement/compare?id=${statementId.value}` });
};
const unconfirmStatement = async () => {
    uni.showModal({
        title: '提示',
        content: '确定要取消确认吗？',
        success: async (res) => {
            if (res.confirm) {
                const { error } = await supabase.from('statement').update({ is_confirmed: false }).eq('id', statementId.value);
                if (!error) {
                    uni.showToast({ title: '已取消确认', icon: 'success' });
                    loadData();
                } else {
                    const errMsg = (error as any).data?.message || error?.message || (error as any)?.details || (error as any)?.msg || '未知错误';
                    uni.showToast({ title: '取消确认失败: ' + errMsg, icon: 'none' });
                }
            }
        }
    });
};
const completeStatement = async () => {
    const { error } = await supabase.from('statement').update({ is_completed: true }).eq('id', statementId.value);
    if (!error) loadData();
    else uni.showToast({ title: '完成失败', icon: 'none' });
};
const uncompleteStatement = async () => {
    uni.showModal({
        title: '提示',
        content: '确定要取消完成吗？',
        success: async (res) => {
            if (res.confirm) {
                const { error } = await supabase.from('statement').update({ is_completed: false }).eq('id', statementId.value);
                if (!error) {
                    uni.showToast({ title: '已取消完成', icon: 'success' });
                    loadData();
                } else {
                    const errMsg = (error as any).data?.message || error?.message || (error as any)?.details || (error as any)?.msg || '未知错误';
                    uni.showToast({ title: '取消完成失败: ' + errMsg, icon: 'none' });
                }
            }
        }
    });
};
</script>

<style lang="scss">
.container { min-height: 100vh; background: #f5f5f5; padding-bottom: 80px; }
.header-card { background: #fff; padding: 20px; margin-bottom: 10px; }
.header-top { display: flex; justify-content: space-between; margin-bottom: 10px; align-items: flex-start; flex-wrap: wrap; gap: 10px; }
.title-row { flex: 1; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; min-width: 60%; }
.title { font-size: 18px; font-weight: bold; word-break: break-all; line-height: 1.4; }
.card-actions { display: flex; gap: 12px; align-items: center; justify-content: flex-end; flex-shrink: 0; }
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

.list-item { background: #fff; padding: 15px; border-radius: 8px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-start; }
.item-main { flex: 1; margin-right: 15px; }
.item-title { font-size: 15px; font-weight: 500; color: #333; word-break: break-all; line-height: 1.4; }
.item-sub { font-size: 12px; color: #999; margin-top: 4px; word-break: break-all; line-height: 1.4; }
.item-side { text-align: right; }
.item-amount { font-size: 15px; font-weight: bold; color: #333; display: block; margin-bottom: 5px; }
.item-actions { display: flex; justify-content: flex-end; align-items: center; gap: 15px; margin-top: 8px; }
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
