<template>
  <view class="container">
    <!-- Header Status -->
    <view class="status-header" :class="statusClass" v-if="isEdit">
      <view class="status-text">{{ statusText }}</view>
      <view class="order-code">NO. {{ form.code }}</view>
    </view>

    <!-- Basic Info Card -->
    <view class="card">
      <view class="card-header">
        <view class="card-title">基本信息</view>
        <!-- Card Header Actions -->
        <view class="header-actions" v-if="isReadMode && isEdit">
           <!-- Edit Actions (Draft) -->
           <block v-if="!isConfirmed">
             <view class="action-btn text-primary" @click="handleEdit">编辑</view>
             <view class="action-btn text-danger" @click="handleDelete">删除</view>
             <view class="action-btn text-success" @click="handleConfirm">确认</view>
           </block>
           <!-- Confirm Actions (Confirmed) -->
           <block v-else-if="!form.is_completed">
             <view class="action-btn text-warning" @click="handleUnconfirm">取消确认</view>
             <view class="action-btn text-primary" @click="handleComplete">完成</view>
           </block>
           <!-- Complete Actions (Completed) -->
           <block v-else>
             <view class="action-btn text-warning" @click="handleUncomplete">取消完成</view>
           </block>
        </view>
      </view>

      <view class="card-body">
        <!-- View Mode: Text Display -->
        <block v-if="isReadMode">
          <view class="info-row">
            <text class="label">付款厂家 (买方)</text>
            <text class="value">{{ getManufacturerName(form.payer_manufacturer_id) }}</text>
          </view>
          <view class="info-row">
            <text class="label">收款厂家 (卖方)</text>
            <text class="value">{{ getManufacturerName(form.payee_manufacturer_id) }}</text>
          </view>
          <view class="info-row">
            <text class="label">物料</text>
            <text class="value">{{ getMaterialName(form.material_id) }}</text>
          </view>
          <view class="info-row">
            <text class="label">数量</text>
            <text class="value">{{ form.quantity }} 吨</text>
          </view>
        </block>

        <!-- Edit Mode: Form Inputs -->
        <block v-else>
          <view class="form-item">
            <view class="label required">采购单号</view>
            <input class="input" type="text" v-model="form.code" placeholder="请输入采购单号" :disabled="isConfirmed" />
          </view>

          <view class="form-item">
            <view class="label required">付款厂家 (买方)</view>
            <picker @change="onPayerChange" :value="payerIndex" :range="manufacturers" range-key="name">
              <view class="input picker-view" :class="{ placeholder: !form.payer_manufacturer_id }">
                {{ getManufacturerName(form.payer_manufacturer_id) || '请选择付款厂家' }}
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <view class="label required">收款厂家 (卖方)</view>
            <picker @change="onPayeeChange" :value="payeeIndex" :range="manufacturers" range-key="name">
              <view class="input picker-view" :class="{ placeholder: !form.payee_manufacturer_id }">
                {{ getManufacturerName(form.payee_manufacturer_id) || '请选择收款厂家' }}
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <view class="label required">物料</view>
            <picker @change="onMaterialChange" :value="materialIndex" :range="materials" range-key="name">
              <view class="input picker-view" :class="{ placeholder: !form.material_id }">
                {{ getMaterialName(form.material_id) || '请选择物料' }}
              </view>
            </picker>
          </view>
          
          <view class="form-item">
            <view class="label required">数量 (吨)</view>
            <input class="input" type="digit" v-model="form.quantity" placeholder="请输入数量" />
          </view>
        </block>
      </view>
    </view>

    <!-- Execution Flow (Only if Confirmed/Completed) -->
    <view class="flow-card" v-if="isConfirmed">
      <view class="card-title">执行流程</view>
      
      <!-- Step 1: Stock Out -->
      <view class="flow-step">
        <view class="step-header">
          <text class="step-title">1. 通用出库 (卖方)</text>
          <view class="step-status" :class="stockOutStatusClass">{{ stockOutStatusText }}</view>
        </view>
        
        <view class="step-content" v-for="doc in stockOuts" :key="doc.id">
           <view class="step-info">
             <view class="sub-row">
               <text class="sub-label">单号：</text>
               <text class="sub-value">{{ doc.code }}</text>
             </view>
             <view class="sub-row">
               <text class="sub-label">厂家：</text>
               <text class="sub-value">{{ getManufacturerName(form.payee_manufacturer_id) }}</text>
             </view>
             <view class="sub-row">
               <text class="sub-label">数量：</text>
               <text class="sub-value">{{ doc.quantity }}</text>
             </view>
           </view>

           <view class="step-action">
               <text class="edit-btn" @click="handleEditStockOut(doc)">{{ form.is_completed ? '详情' : '编辑' }}</text>
               <text class="delete-btn" v-if="!form.is_completed" @click="handleDeleteStockOut(doc)">删除</text>
           </view>

        </view>
        
        <button v-if="stockOuts.length === 0 && !form.is_completed" class="step-btn" @click="createStockOut">办理出库</button>
      </view>

      <!-- Step 2: Stock In -->
      <view class="flow-step">
        <view class="step-header">
          <text class="step-title">2. 通用入库 (买方)</text>
          <view class="step-status" :class="stockInStatusClass">{{ stockInStatusText }}</view>
        </view>
        
        <view class="step-content" v-for="doc in stockIns" :key="doc.id">
           <view class="step-info">
             <view class="sub-row">
               <text class="sub-label">单号：</text>
               <text class="sub-value">{{ doc.code }}</text>
             </view>
             <view class="sub-row">
               <text class="sub-label">厂家：</text>
               <text class="sub-value">{{ getManufacturerName(form.payer_manufacturer_id) }}</text>
             </view>
             <view class="sub-row">
               <text class="sub-label">数量：</text>
               <text class="sub-value">{{ doc.quantity }}</text>
             </view>
           </view>

           <view class="step-action">
               <text class="edit-btn" @click="handleEditStockIn(doc)">{{ form.is_completed ? '详情' : '编辑' }}</text>
               <text class="delete-btn" v-if="!form.is_completed" @click="handleDeleteStockIn(doc)">删除</text>
           </view>

        </view>
        
        <button v-if="stockIns.length === 0 && !form.is_completed" class="step-btn" @click="createStockIn">办理入库</button>
      </view>
    </view>

    <!-- Footer Actions (Only for Edit Mode) -->
    <view class="footer" v-if="!isReadMode">
      <button class="btn-cancel" @click="handleCancelEdit">取消</button>
      <button class="btn-save" @click="handleSave">保存</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
import { onLoad, onShow } from '@dcloudio/uni-app';
import { safeDeleteRecordWithFile } from '@/utils/storageFileUtils';

interface Option {
  id: string;
  name: string;
}

const form = ref({
  id: '',
  code: '',
  payer_manufacturer_id: '',
  payee_manufacturer_id: '',
  material_id: '',
  quantity: '',
  is_confirmed: false,
  is_completed: false
});

const materials = ref<Option[]>([]);
const manufacturers = ref<Option[]>([]);
const stockOuts = ref<any[]>([]);
const stockIns = ref<any[]>([]);

const loading = ref(false);
const isEdit = ref(false);
const isReadMode = ref(false);

const materialIndex = computed(() => materials.value.findIndex(p => p.id === form.value.material_id));
const payerIndex = computed(() => manufacturers.value.findIndex(m => m.id === form.value.payer_manufacturer_id));
const payeeIndex = computed(() => manufacturers.value.findIndex(m => m.id === form.value.payee_manufacturer_id));

const isConfirmed = computed(() => form.value.is_confirmed);
const statusText = computed(() => {
    if (form.value.is_completed) return '已完成';
    if (form.value.is_confirmed) return '已确认';
    return '待确认';
});
const statusClass = computed(() => {
    if (form.value.is_completed) return 'completed';
    if (form.value.is_confirmed) return 'confirmed';
    return 'pending';
});

const stockOutStatusText = computed(() => stockOuts.value.length > 0 ? `${stockOuts.value.length}笔` : '待出库');
const stockOutStatusClass = computed(() => stockOuts.value.length > 0 ? 'success' : 'warning');
const stockInStatusText = computed(() => stockIns.value.length > 0 ? `${stockIns.value.length}笔` : '待入库');
const stockInStatusClass = computed(() => stockIns.value.length > 0 ? 'success' : 'warning');

const getMaterialName = (id: string) => {
    const p = materials.value.find(item => item.id === id);
    return p ? p.name : '';
};

const fetchOptions = async () => {
  const [manuRes, matRes] = await Promise.all([
    supabase.from('manufacturer').select('id, name').order('name'),
    supabase.from('material').select('id, name').order('name')
  ]);
  
  if (manuRes.data) manufacturers.value = manuRes.data;
  if (matRes.data) materials.value = matRes.data;
};

const loadData = async (id: string) => {
    loading.value = true;
    const { data, error } = await supabase
        .from('general_purchase')
        .select('*')
        .eq('id', id)
        .single();
    
    loading.value = false;
    
    if (error) {
        uni.showToast({ title: '加载失败', icon: 'none' });
        return;
    }
    
    if (data) {
        form.value = { ...data };
    }
};




onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...' });
  try {
    await fetchOptions();

    if (options.id) {
      isEdit.value = true;
      form.value.id = options.id;
      isReadMode.value = true;
      await loadData(form.value.id);
      await fetchRelatedDocs();
    } else {
      isEdit.value = false;
      isReadMode.value = false;
      form.value.code = await generateCode('general_purchase', 'TYCG');
    }
  } finally {
    uni.hideLoading();
  }
});

onShow(async () => {
    if (form.value.id) {
        await loadData(form.value.id);
        await fetchRelatedDocs();
    }
});

const onPayerChange = (e: any) => {
    const index = e.detail.value;
    if (manufacturers.value[index]) {
        form.value.payer_manufacturer_id = manufacturers.value[index].id;
    }
};

const onPayeeChange = (e: any) => {
    const index = e.detail.value;
    if (manufacturers.value[index]) {
        form.value.payee_manufacturer_id = manufacturers.value[index].id;
    }
};

const onMaterialChange = (e: any) => {
    const index = e.detail.value;
    if (materials.value[index]) {
        form.value.material_id = materials.value[index].id;
    }
};

const handleEdit = () => {
    isReadMode.value = false;
};

const handleCancelEdit = () => {
    if (!isEdit.value) {
        uni.navigateBack();
    } else {
        isReadMode.value = true;
        loadData(form.value.id);
    }
};

const handleSave = async () => {
    if (!form.value.code) return uni.showToast({ title: '请输入单号', icon: 'none' });
    if (!form.value.material_id) return uni.showToast({ title: '请选择物料', icon: 'none' });
    if (!form.value.payer_manufacturer_id) return uni.showToast({ title: '请选择付款方', icon: 'none' });
    if (!form.value.payee_manufacturer_id) return uni.showToast({ title: '请选择收款方', icon: 'none' });
    if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });

    loading.value = true;
    const dataToSave = {
        code: form.value.code,
        payer_manufacturer_id: form.value.payer_manufacturer_id,
        payee_manufacturer_id: form.value.payee_manufacturer_id,
        material_id: form.value.material_id,
        quantity: Number(form.value.quantity)
    };
    
    let error;
    let newId = form.value.id;
    
    if (isEdit.value) {
        const { error: updateError } = await supabase
            .from('general_purchase')
            .update(dataToSave)
            .eq('id', form.value.id);
        error = updateError;
    } else {
        // @ts-ignore
        const { data, error: insertError } = await supabase
            .from('general_purchase')
            .insert(dataToSave)
            .select()
            .single();
        error = insertError;
        if (data) newId = data.id;
    }
    
    loading.value = false;
    
    if (error) {
        uni.showToast({ title: '保存失败: ' + error.message, icon: 'none' });
    } else {
        uni.showToast({ title: '保存成功', icon: 'success' });
        form.value.id = newId;
        isEdit.value = true;
        isReadMode.value = true;
        
        if (!isEdit.value) { // Was new
             // Force reload to setup URL if needed, but since we modify state in place, just load data
        }
        await loadData(newId);
    }
};

// ... keep handleConfirm, handleUnconfirm, handleComplete, handleUncomplete, createStockOut, createStockIn, deleteItem ...

const handleDelete = async () => {
    uni.showModal({
        title: '提示',
        content: '确定要删除该采购单吗？',
        success: async (res) => {
            if (res.confirm) {
                loading.value = true;
                const { error } = await supabase.from('general_purchase').delete().eq('id', form.value.id);
                loading.value = false;
                
                if (error) {
                    uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
                } else {
                    uni.showToast({ title: '已删除', icon: 'success' });
                    uni.navigateBack();
                }
            }
        }
    });
};

const handleConfirm = async () => {
     uni.showModal({
    title: '确认采购单',
    content: '确认后将无法修改，且可用于办理出入库。确定要确认吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('general_purchase').update({ is_confirmed: true }).eq('id', form.value.id);
        loading.value = false;
        
        if (error) {
          uni.showToast({ title: '操作失败: ' + error.message, icon: 'none' });
        } else {
          uni.showToast({ title: '已确认', icon: 'success' });
          form.value.is_confirmed = true;
        }
      }
    }
  });
};

const handleUnconfirm = async () => {
  // Check for related records
  if (stockOuts.value.length > 0 || stockIns.value.length > 0) {
      uni.showToast({ title: '请先删除关联的出入库单据', icon: 'none' });
      return;
  }

  uni.showModal({
    title: '取消确认',
    content: '撤销确认后单据将变回草稿状态，且无法办理出入库。确定要撤销吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('general_purchase').update({ is_confirmed: false }).eq('id', form.value.id);
        loading.value = false;
        
        if (error) {
          uni.showToast({ title: '操作失败: ' + error.message, icon: 'none' });
        } else {
          uni.showToast({ title: '已撤销', icon: 'success' });
          form.value.is_confirmed = false;
        }
      }
    }
  });
};

const handleComplete = async () => {
  // Validate Stock Out
  if (!stockOuts.value.length) {
       uni.showToast({ title: '请先完成出库操作', icon: 'none' });
       return;
  }
  // Validate Stock In
  if (!stockIns.value.length) {
       uni.showToast({ title: '请先完成入库操作', icon: 'none' });
       return;
  }

  uni.showModal({
    title: '完成采购单',
    content: '确定要完成该采购单吗？注意：必须已完成入出库操作。',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('general_purchase').update({ is_completed: true }).eq('id', form.value.id);
        loading.value = false;
        
        if (error) {
           let msg = error.message || '操作失败';
           // Clean common Postgres error prefixes
           msg = msg.replace(/^Error: /, '').replace(/^P\d+: /, '');
           
           if (msg.includes('必须先确认')) {
               uni.showToast({ title: '请先确认单据', icon: 'none' });
           } else if (msg.includes('关联信息')) {
               uni.showToast({ title: '无法修改关联信息', icon: 'none' });
           } else {
               // Ensure message isn't too long for toast
               const displayMsg = msg.length > 30 ? msg.substring(0, 28) + '...' : msg;
               uni.showToast({ title: displayMsg, icon: 'none', duration: 3000 });
           }
        } else {
          uni.showToast({ title: '已完成', icon: 'success' });
          form.value.is_completed = true;
        }
      }
    }
  });
};

const handleUncomplete = async () => {
  uni.showModal({
    title: '取消完成',
    content: '确定要取消完成状态吗？单据将变回执行中状态。',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        const { error } = await supabase.from('general_purchase').update({ is_completed: false }).eq('id', form.value.id);
        loading.value = false;
        
        if (error) {
          let msg = error.message || '未知错误';
          msg = msg.replace(/^Error: /, '').replace(/^P\d+: /, '');
          uni.showToast({ title: '操作失败: ' + msg, icon: 'none' });
        } else {
          uni.showToast({ title: '已取消完成', icon: 'success' });
          form.value.is_completed = false;
        }
      }
    }
  });
};

const getManufacturerName = (id: string) => {
    const m = manufacturers.value.find(item => item.id === id);
    return m ? m.name : '';
};

const fetchRelatedDocs = async () => {
  // Fetch General Stock Outs
  const { data: outData } = await supabase
    .from('general_stock_out')
    .select('id, code, quantity, create_time')
    .eq('general_purchase_id', form.value.id)
    .order('create_time', { ascending: false });
  stockOuts.value = outData || [];

  // Fetch General Stock Ins
  const { data: inData } = await supabase
    .from('general_stock_in')
    .select('id, code, quantity, create_time')
    .eq('general_purchase_id', form.value.id)
    .order('create_time', { ascending: false });
  stockIns.value = inData || [];
};

const deleteItem = async (type: 'stock_in' | 'stock_out', id: string) => {
    const table = type === 'stock_in' ? 'general_stock_in' : 'general_stock_out';
    
    uni.showModal({
        title: '提示',
        content: '确定要删除该单据吗？',
        success: async (res) => {
            if (res.confirm) {
                loading.value = true;
                
                const { success, error } = await safeDeleteRecordWithFile(table, id);
                
                loading.value = false;
                
                if (!success) {
                    uni.showToast({ title: '删除失败: ' + (error?.message || '未知错误'), icon: 'none' });
                } else {
                    uni.showToast({ title: '已删除', icon: 'success' });
                    fetchRelatedDocs();
                }
            }
        }
    });
};

const handleDeleteStockOut = async (doc: any) => {
    await deleteItem('stock_out', doc.id);
};

const handleDeleteStockIn = async (doc: any) => {
    await deleteItem('stock_in', doc.id);
};

const handleEditStockOut = (doc: any) => {
    uni.navigateTo({
        url: `/pages/stock-out/edit?id=${doc.id}`
    });
};

const handleEditStockIn = (doc: any) => {
    uni.navigateTo({
        url: `/pages/stock-in/edit?id=${doc.id}`
    });
};

const createStockOut = () => {
    uni.navigateTo({
        url: `/pages/stock-out/edit?general_purchase_id=${form.value.id}`
    });
};

const createStockIn = () => {
    uni.navigateTo({
        url: `/pages/stock-in/edit?general_purchase_id=${form.value.id}`
    });
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 15px;
  padding-bottom: 80px;
}

.status-header {
  padding: 20px;
  border-radius: 12px;
  color: #fff;
  margin-bottom: 15px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  &.pending { background: linear-gradient(135deg, #1890ff, #36cfc9); }
  &.confirmed { background: linear-gradient(135deg, #fa8c16, #ffd666); }
  &.completed { background: linear-gradient(135deg, #52c41a, #95de64); }
  
  .status-text { font-size: 20px; font-weight: bold; }
  .order-code { font-size: 14px; opacity: 0.9; }
}

.card {
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f0f0;
}

.card-title {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  border-left: 4px solid #6739b6;
  padding-left: 10px;
}

.header-actions {
  display: flex;
  gap: 15px;
  
  .action-btn {
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    background: none;
    padding: 0;
  }
  
  .text-primary { color: #6739b6; }
  .text-danger { color: #ff4d4f; }
  .text-success { color: #52c41a; }
  .text-warning { color: #fa8c16; }
}

.info-row {
  display: flex;
  margin-bottom: 10px;
  font-size: 14px;
  
  .label { color: #999; width: 110px; flex-shrink: 0; }
  .value { color: #333; flex: 1; word-break: break-all; }
}

.flow-card {
  background-color: #fff;
  border-radius: 12px;
  padding: 15px;
  margin-bottom: 15px;
}

.form-item {
  margin-bottom: 20px;
  
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
    height: 44px;
    background-color: #f9f9f9;
    border-radius: 6px;
    padding: 0 12px;
    font-size: 15px;
    box-sizing: border-box;
    display: flex;
    align-items: center; 
    
    &.disabled {
        background-color: #f5f5f5;
        color: #666;
    }
  }
  .picker-view {
    color: #333; 
    
    &.placeholder {
      color: #808080; /* Standard placeholder gray */
    }
  }
}

.flow-step {
  border-bottom: 1px dashed #eee;
  padding-bottom: 15px;
  margin-bottom: 15px;
  
  &:last-child {
    margin-bottom: 0;
    border-bottom: none;
  }
  
  .step-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    
    .step-title {
      font-size: 15px;
      font-weight: 500;
    }
    
    .step-status {
      font-size: 12px;
      padding: 2px 8px;
      border-radius: 12px;
      
      &.success {
        background-color: #e6f7ff;
        color: #1890ff;
      }
      
      &.warning {
        background-color: #fff7e6;
        color: #fa8c16;
      }
    }
  }
  
  .step-content {
      background-color: #f9f9f9;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .step-info {
          flex: 1;
      }
      
      .sub-row {
        display: flex;
        font-size: 13px;
        margin-bottom: 6px;
        line-height: 1.4;
        
        .sub-label {
          color: #999;
          width: 48px;
          flex-shrink: 0;
        }
        
        .sub-value {
          color: #333;
          flex: 1;
          word-break: break-all;
        }
      }
      
      .step-action {
          margin-left: 10px;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          justify-content: center;
      }
      
      .delete-btn {
          font-size: 12px;
          color: #ff4d4f;
          padding: 4px 8px;
          cursor: pointer;
      }
      
      .edit-btn {
          font-size: 12px;
          color: #6739b6;
          padding: 4px 8px;
          cursor: pointer;
          margin-right: 0;
          margin-bottom: 8px;
          text-align: right;
      }
      
      .delete-btn:active, .edit-btn:active {
          opacity: 0.7;
      } 
  }
  
  .step-btn {
    width: 100%;
    margin-top: 10px;
    height: 36px;
    line-height: 36px;
    font-size: 14px;
    background-color: #fff;
    color: #722ed1;
    border: 1px dashed #722ed1;
    border-radius: 18px;
    
    &:active {
      background-color: #f9f0ff;
    }
  }
}

.empty-tip {
    text-align: center;
    color: #999;
    padding: 30px 0;
    font-size: 14px;
}

.footer {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff;
  padding: 10px 15px;
  padding-bottom: calc(10px + env(safe-area-inset-bottom));
  display: flex;
  gap: 15px;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  z-index: 100;
  
  button {
      flex: 1;
      height: 44px;
      line-height: 44px;
      font-size: 16px;
      border-radius: 22px;
      margin: 0;
      
      &::after { border: none; }
  }
  
  .btn-delete {
      background-color: #f5f5f5;
      color: #ff4d4f;
  }
  
  .btn-save {
      background-color: #722ed1; // Primary Purple
      color: #fff;
  }
  
  .btn-confirm {
      background-color: #52c41a; // Success Green
      color: #fff;
  }
  
  .btn-warning {
      background-color: #fa8c16; // Warning Orange
      color: #fff;
  }
  
  .btn-complete {
      background-color: #1890ff; // Action Blue
      color: #fff;
  }
}
</style>
