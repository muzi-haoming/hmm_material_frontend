<template>
  <view class="container">
    <view class="form-card">
      <view class="section-title">基本信息</view>
      <view class="form-item">
        <text class="label required">对账单号</text>
        <input class="input" type="text" v-model="form.code" placeholder="请输入单号" />
      </view>

      <view class="form-item">
        <text class="label required">关联合同</text>
        <picker @change="bindContractChange" :value="contractIndex" :range="contracts" range-key="name">
          <view class="input picker-view">
            {{ contracts[contractIndex] ? contracts[contractIndex].name : '请选择合同' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">开始日期</text>
        <picker mode="date" :value="form.start_time" @change="bindStartDateChange">
          <view class="input picker-view">{{ form.start_time || '请选择日期' }}</view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">结束日期</text>
        <picker mode="date" :value="form.end_time" @change="bindEndDateChange">
          <view class="input picker-view">{{ form.end_time || '请选择日期' }}</view>
        </picker>
      </view>
    </view>

    <!-- Material Details -->
    <view class="form-card">
      <view class="section-header">
        <view class="section-title">物资明细</view>
        <view class="btn-add-mini" @click="openMaterialModal">+ 添加物资</view>
      </view>
      
      <view class="detail-list">
        <view class="detail-item" v-for="(item, index) in materials" :key="index">
          <view class="detail-row">
            <text class="detail-name">{{ getProductName(item.product_id) }}</text>
            <text class="iconfont icon-close" @click="removeMaterial(index)"></text>
          </view>
          <view class="detail-row sub">
            <text>数量: {{ item.quantity }}</text>
            <text>金额: ¥{{ item.amount }}</text>
          </view>
        </view>
        <view v-if="materials.length === 0" class="empty-text">暂无物资明细</view>
      </view>
    </view>

    <!-- Expense Details -->
    <view class="form-card">
      <view class="section-header">
        <view class="section-title">其他费用</view>
        <view class="btn-add-mini" @click="openExpenseModal">+ 添加费用</view>
      </view>
      
      <view class="detail-list">
        <view class="detail-item" v-for="(item, index) in expenses" :key="index">
          <view class="detail-row">
             <text class="detail-name">{{ getExpenseName(item.item_id) }}</text>
             <text class="iconfont icon-close" @click="removeExpense(index)"></text>
          </view>
          <view class="detail-row sub">
             <text>金额: ¥{{ item.amount }}</text>
          </view>
        </view>
        <view v-if="expenses.length === 0" class="empty-text">暂无其他费用</view>
      </view>
    </view>

    <view class="footer">
      <button class="btn-delete" v-if="isEdit" @click="handleDelete" :disabled="loading">删除</button>
      <button class="btn-save" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存' }}
      </button>
    </view>

    <!-- Material Modal -->
    <view class="modal-mask" v-if="showMaterialModal" @click="closeMaterialModal">
      <view class="modal-content" @click.stop>
        <view class="modal-title">添加物资</view>
        <view class="form-item">
          <text class="label">产品</text>
          <picker @change="bindModalProductChange" :value="tempMaterial.productIndex" :range="products" range-key="name">
            <view class="input picker-view">
              {{ products[tempMaterial.productIndex] ? products[tempMaterial.productIndex].name : '请选择' }}
            </view>
          </picker>
        </view>
        <view class="form-item">
          <text class="label">数量</text>
          <input class="input" type="number" v-model="tempMaterial.quantity" placeholder="输入数量" />
        </view>
        <view class="form-item">
          <text class="label">金额</text>
          <input class="input" type="number" v-model="tempMaterial.amount" placeholder="输入金额" />
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeMaterialModal">取消</button>
          <button class="btn-confirm" @click="confirmMaterial">确定</button>
        </view>
      </view>
    </view>

    <!-- Expense Modal -->
    <view class="modal-mask" v-if="showExpenseModal" @click="closeExpenseModal">
      <view class="modal-content" @click.stop>
        <view class="modal-title">添加费用</view>
        <view class="form-item">
           <text class="label">费用项</text>
           <picker @change="bindModalExpenseChange" :value="tempExpense.itemIndex" :range="expenseItems" range-key="name">
             <view class="input picker-view">
               {{ expenseItems[tempExpense.itemIndex] ? expenseItems[tempExpense.itemIndex].name : '请选择' }}
             </view>
           </picker>
        </view>
        <view class="form-item">
          <text class="label">金额</text>
          <input class="input" type="number" v-model="tempExpense.amount" placeholder="输入金额" />
        </view>
        <view class="modal-footer">
          <button class="btn-cancel" @click="closeExpenseModal">取消</button>
          <button class="btn-confirm" @click="confirmExpense">确定</button>
        </view>
      </view>
    </view>

  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';
import { v4 as uuidv4 } from 'uuid';

interface Option {
  id: string;
  name: string;
}

const form = ref({
  id: '',
  code: '',
  contract_id: '',
  start_time: '',
  end_time: ''
});

const contracts = ref<Option[]>([]);
const contractIndex = ref(-1);

const products = ref<Option[]>([]);
const expenseItems = ref<Option[]>([]);

// Local State for Details
const materials = ref<any[]>([]);
const expenses = ref<any[]>([]);

const loading = ref(false);
const isEdit = ref(false);

// Modal State
const showMaterialModal = ref(false);
const tempMaterial = ref({ productIndex: -1, quantity: '', amount: '' });

const showExpenseModal = ref(false);
const tempExpense = ref({ itemIndex: -1, amount: '' });

onLoad(async (options: any) => {
  await fetchOptions();
  
  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  }
});

const fetchOptions = async () => {
  const { data: cData } = await supabase.from('contract').select('id, name');
  if (cData) contracts.value = cData;

  const { data: pData } = await supabase.from('product').select('id, name');
  if (pData) products.value = pData;

  const { data: eData } = await supabase.from('statement_other_expenses_item').select('id, name');
  if (eData) expenseItems.value = eData;
};

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  
  // 1. Fetch Master
  const { data: master } = await supabase
    .from('statement')
    .select('*')
    .eq('id', id)
    .single();
    
  if (master) {
    form.value.code = master.code;
    form.value.contract_id = master.contract_id;
    form.value.start_time = master.start_time ? master.start_time.split('T')[0] : '';
    form.value.end_time = master.end_time ? master.end_time.split('T')[0] : '';
    contractIndex.value = contracts.value.findIndex(c => c.id === master.contract_id);
  }

  // 2. Fetch Materials
  const { data: mats } = await supabase
    .from('statement_material_detail')
    .select('*')
    .eq('statement_id', id);
  if (mats) materials.value = mats;

  // 3. Fetch Expenses
  const { data: exps } = await supabase
    .from('statement_other_expenses_detail')
    .select('*')
    .eq('statement_id', id);
  if (exps) expenses.value = exps;

  uni.hideLoading();
};

const bindContractChange = (e: any) => {
  contractIndex.value = e.detail.value;
  form.value.contract_id = contracts.value[contractIndex.value].id;
};

const bindStartDateChange = (e: any) => {
  form.value.start_time = e.detail.value;
};

const bindEndDateChange = (e: any) => {
  form.value.end_time = e.detail.value;
};

// Material Modal
const openMaterialModal = () => {
  tempMaterial.value = { productIndex: -1, quantity: '', amount: '' };
  showMaterialModal.value = true;
};
const closeMaterialModal = () => { showMaterialModal.value = false; };
const bindModalProductChange = (e: any) => { tempMaterial.value.productIndex = e.detail.value; };
const confirmMaterial = () => {
  if (tempMaterial.value.productIndex === -1) return uni.showToast({ title: '请选择产品', icon: 'none' });
  if (!tempMaterial.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });
  
  materials.value.push({
    product_id: products.value[tempMaterial.value.productIndex].id,
    quantity: Number(tempMaterial.value.quantity),
    amount: Number(tempMaterial.value.amount || 0)
  });
  closeMaterialModal();
};

// Expense Modal
const openExpenseModal = () => {
  tempExpense.value = { itemIndex: -1, amount: '' };
  showExpenseModal.value = true;
};
const closeExpenseModal = () => { showExpenseModal.value = false; };
const bindModalExpenseChange = (e: any) => { tempExpense.value.itemIndex = e.detail.value; };
const confirmExpense = () => {
   if (tempExpense.value.itemIndex === -1) return uni.showToast({ title: '请选择费用项', icon: 'none' });
   
   expenses.value.push({
     item_id: expenseItems.value[tempExpense.value.itemIndex].id,
     amount: Number(tempExpense.value.amount || 0)
   });
   closeExpenseModal();
};

const removeMaterial = (index: number) => { materials.value.splice(index, 1); };
const removeExpense = (index: number) => { expenses.value.splice(index, 1); };

const getProductName = (id: string) => {
  const p = products.value.find(x => x.id === id);
  return p ? p.name : id;
};

const getExpenseName = (id: string) => {
  const e = expenseItems.value.find(x => x.id === id);
  return e ? e.name : id;
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '删除对账单将删除所有明细，确定吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        // Delete Details First
        await supabase.from('statement_material_detail').delete().eq('statement_id', form.value.id);
        await supabase.from('statement_other_expenses_detail').delete().eq('statement_id', form.value.id);
        const { error } = await supabase.from('statement').delete().eq('id', form.value.id);
        loading.value = false;
        
        if (error) {
          uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
        } else {
          uni.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => { uni.navigateBack(); }, 1500);
        }
      }
    }
  });
};

const handleSave = async () => {
  if (!form.value.code) return uni.showToast({ title: '请输入单号', icon: 'none' });
  if (!form.value.contract_id) return uni.showToast({ title: '请选择合同', icon: 'none' });
  if (!form.value.start_time) return uni.showToast({ title: '请选择开始日期', icon: 'none' });
  if (!form.value.end_time) return uni.showToast({ title: '请选择结束日期', icon: 'none' });

  loading.value = true;
  
  // 1. Upsert Master
  const masterPayload = {
    code: form.value.code,
    contract_id: form.value.contract_id,
    start_time: form.value.start_time,
    end_time: form.value.end_time,
    update_time: new Date().toISOString()
  };
  
  let statementId = form.value.id;
  
  if (isEdit.value) {
    const { error } = await supabase.from('statement').update(masterPayload).eq('id', statementId);
    if (error) { loading.value = false; return uni.showToast({ title: '保存主表失败' + error.message, icon: 'none' }); }
  } else {
    // @ts-ignore
    statementId = uuidv4();
    // @ts-ignore
    masterPayload.id = statementId;
    const { error } = await supabase.from('statement').insert(masterPayload);
    if (error) { loading.value = false; return uni.showToast({ title: '保存主表失败' + error.message, icon: 'none' }); }
  }

  // 2. Refresh Details (Delete old -> Insert new)
  if (isEdit.value) {
    await supabase.from('statement_material_detail').delete().eq('statement_id', statementId);
    await supabase.from('statement_other_expenses_detail').delete().eq('statement_id', statementId);
  }

  // 3. Insert Materials
  if (materials.value.length > 0) {
    const matInserts = materials.value.map(m => ({
      id: uuidv4(),
      statement_id: statementId,
      product_id: m.product_id,
      quantity: m.quantity,
      amount: m.amount
    }));
    await supabase.from('statement_material_detail').insert(matInserts);
  }

  // 4. Insert Expenses
  if (expenses.value.length > 0) {
    const expInserts = expenses.value.map(e => ({
      id: uuidv4(),
      statement_id: statementId,
      item_id: e.item_id,
      amount: e.amount
    }));
    await supabase.from('statement_other_expenses_detail').insert(expInserts);
  }

  loading.value = false;
  uni.showToast({ title: '保存成功', icon: 'success' });
  setTimeout(() => { uni.navigateBack(); }, 1500);
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 15px;
  padding-bottom: 80px;
}

.form-card {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.section-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin-bottom: 5px;
}

.btn-add-mini {
  font-size: 12px;
  color: #6739b6;
  border: 1px solid #6739b6;
  padding: 2px 8px;
  border-radius: 12px;
  
  &:active {
    background-color: #f3e5f5;
  }
}

.form-item {
  margin-bottom: 15px;
  
  &:last-child {
    margin-bottom: 0;
  }
  
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
    width: 100%;
    height: 40px;
    background-color: #f9f9f9;
    border-radius: 6px;
    padding: 0 12px;
    font-size: 14px;
    box-sizing: border-box;
    display: flex;
    align-items: center; 
  }
  .picker-view {
    color: #333; 
  }
}

.detail-list {
  background-color: #f9f9f9;
  border-radius: 6px;
  padding: 10px;
}

.detail-item {
  background-color: #fff;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 8px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.detail-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 4px;
  
  &.sub {
    font-size: 12px;
    color: #666;
  }
}

.detail-name {
  font-weight: bold;
  color: #333;
}

.icon-close {
  color: #999;
  font-size: 16px;
  padding: 0 5px;
}

.empty-text {
  text-align: center;
  color: #999;
  font-size: 12px;
  padding: 10px 0;
}

.footer {
  margin-top: 30px;
  display: flex;
  gap: 15px;
}

.btn-delete {
  flex: 1;
  background-color: #f5f5f5;
  color: #ff4d4f;
  border-radius: 25px;
  height: 46px;
  line-height: 46px;
  font-size: 16px;
  
  &:active {
    background-color: #eee;
  }
}

.btn-save {
  flex: 2;
  background-color: #6739b6;
  color: #fff;
  border-radius: 25px;
  height: 46px;
  line-height: 46px;
  font-size: 16px;
  
  &:active {
    opacity: 0.9;
  }
}

/* Modal Styles */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0,0,0,0.5);
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
}

.modal-content {
  background-color: #fff;
  width: 80%;
  border-radius: 10px;
  padding: 20px;
}

.modal-title {
  font-size: 18px;
  font-weight: bold;
  text-align: center;
  margin-bottom: 20px;
}

.modal-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  gap: 15px;
  
  button {
    flex: 1;
    font-size: 14px;
    height: 40px;
    line-height: 40px;
  }
  
  .btn-cancel {
    background-color: #f5f5f5;
    color: #666;
  }
  
  .btn-confirm {
    background-color: #6739b6;
    color: #fff;
  }
}
</style>
