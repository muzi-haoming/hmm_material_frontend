<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">发票号码</text>
        <input class="input" type="text" v-model="form.invoice_no" placeholder="请输入发票号码" :disabled="isReadOnly" />
      </view>
      <view class="form-item">
        <text class="label required">发票抬头</text>
        <input class="input" type="text" v-model="form.invoice_title" placeholder="请输入发票抬头" :disabled="isReadOnly" />
      </view>
      <view class="form-item">
        <text class="label required">纳税人识别号</text>
        <input class="input" type="text" v-model="form.tax_no" placeholder="请输入纳税人识别号" :disabled="isReadOnly" />
      </view>
      <view class="form-item">
        <text class="label required">开票日期</text>
        <picker mode="date" :value="form.issued_time" @change="bindDateChange" :disabled="isReadOnly">
          <view class="input picker-view" :class="{ disabled: isReadOnly }">
            {{ form.issued_time || '请选择开票日期' }}
          </view>
        </picker>
      </view>
      <!-- Auto calculated totals -->
      <view class="form-item">
        <text class="label">总金额 (含税)</text>
        <text class="value money">¥{{ form.amount }}</text>
      </view>
      <view class="form-item">
        <text class="label">总税额</text>
        <text class="value money">¥{{ form.tax_amount }}</text>
      </view>
    </view>

    <!-- Invoice Details -->
    <view class="details-card">
      <view class="card-header">
        <text class="title">发票明细</text>
        <button v-if="!isReadOnly" class="btn-mini" @click="addDetail">+ 添加</button>
      </view>
      
      <view v-for="(item, index) in details" :key="index" class="detail-item">
        <view class="detail-row">
            <input class="input-mini" v-model="item.item_name" placeholder="项目名称" :disabled="isReadOnly" />
            <input class="input-mini" v-model="item.spec" placeholder="规格型号" :disabled="isReadOnly" />
        </view>
        <view class="detail-row">
            <input class="input-mini" type="digit" v-model="item.quantity" placeholder="数量" @input="calcItemAmount(item)" :disabled="isReadOnly" />
            <input class="input-mini" type="digit" v-model="item.price" placeholder="单价" @input="calcItemAmount(item)" :disabled="isReadOnly" />
            <input class="input-mini" type="digit" v-model="item.tax_rate" placeholder="税率%" @input="calcItemAmount(item)" :disabled="isReadOnly" />
        </view>
        <view class="detail-row footer">
            <text>金额: {{ item.amount }}</text>
            <text class="btn-remove" v-if="!isReadOnly" @click="removeDetail(index)">删除</text>
        </view>
      </view>
    </view>

    <view class="footer" v-if="!isReadOnly">
      <button class="btn-save" @click="submit" :loading="submitting">保存</button>
      <button class="btn-delete" v-if="isEdit" @click="handleDelete" :loading="submitting">删除</button>
    </view>
    <view class="footer" v-else>
       <text class="read-only-tip">该发票已关联对账单，无法修改</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';

const form = ref({
  id: '',
  invoice_no: '',
  invoice_title: '',
  tax_no: '',
  issued_time: '',
  amount: 0,
  tax_amount: 0
});

const details = ref<any[]>([]);
const isEdit = ref(false);
const submitting = ref(false);
const isReadOnly = ref(false);

onLoad(async (options: any) => {
  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
  } else {
    // Default today
    form.value.issued_time = new Date().toISOString().split('T')[0];
    addDetail();
  }
});

const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  
  // Check if linked to statement
  const { data: rela } = await supabase.from('statement_invoice_rela').select('id').eq('invoice_id', id).single();
  if (rela) {
      isReadOnly.value = true;
  }

  const { data: invoice } = await supabase.from('invoice').select('*').eq('id', id).single();
  if (invoice) {
    form.value = { ...invoice, issued_time: invoice.issued_time.split('T')[0] };
  }

  const { data: detailData } = await supabase.from('invoice_detail').select('*').eq('invoice_id', id);
  if (detailData) {
    details.value = detailData;
  }
  
  uni.hideLoading();
};

const bindDateChange = (e: any) => {
  form.value.issued_time = e.detail.value;
};

const addDetail = () => {
    details.value.push({
        item_name: '',
        spec: '',
        quantity: '',
        price: '',
        tax_rate: '13', // Default tax rate
        amount: 0
    });
};

const removeDetail = (index: number) => {
    details.value.splice(index, 1);
    calcTotal();
};

const calcItemAmount = (item: any) => {
    const qty = parseFloat(item.quantity) || 0;
    const price = parseFloat(item.price) || 0;
    // Amount usually means Total Amount (including tax) or excluding tax?
    // Schema says "amount" and "tax_amount" in invoice.
    // In invoice_detail, "amount". Usually implies line total.
    // Let's assume line amount = qty * price (excluding tax) ? Or including?
    // Usually Invoice Detail Amount = qty * price.
    // And Tax is calculated separately?
    // But table invoice has "amount" and "tax_amount".
    // Let's assume item.amount = qty * price. 
    item.amount = parseFloat((qty * price).toFixed(2));
    calcTotal();
};

const calcTotal = () => {
    let totalAmt = 0;
    let totalTax = 0;
    
    details.value.forEach(d => {
        const amt = parseFloat(d.amount) || 0;
        const rate = parseFloat(d.tax_rate) || 0;
        totalAmt += amt; // Assuming amount is excluding tax?
                         // If amount is excluding tax, then total invoice amount = sum(amt) + sum(tax).
                         // Or is invoice.amount the "Total Value" (including tax)?
                         // Standard: invoice.amount is usually Total (Inc Tax).
                         // Let's assume input price is Tax Exclusive.
                         // Then tax = amt * rate / 100.
                         // Total = amt + tax.
        
        // Wait, standard VAT invoice:
        // Amount (Video) Usually Excl Tax.
        // Tax Amount.
        // Total = Amount + Tax Amount.
        
        // Let's try to infer from schema columns.
        // invoice: amount, tax_amount.
        // invoice_detail: amount. (Quantity * Price).
        
        // Let's assume Price is Excl Tax.
        const tax = amt * (rate / 100);
        totalTax += tax;
    });
    
    // So invoice.amount = Sum(item.amount) + Sum(tax) ?
    // Or invoice.amount = Sum(item.amount) (Excl tax)?
    // Usually "Total Amount" on an invoice is the Grand Total.
    // Let's store Grand Total in invoice.amount.
    // And Total Tax in tax_amount.
    
    form.value.tax_amount = parseFloat(totalTax.toFixed(2));
    form.value.amount = parseFloat((totalAmt + totalTax).toFixed(2));
};

const submit = async () => {
    if (!form.value.invoice_no) return uni.showToast({ title: '请输入发票号', icon: 'none' });
    
    submitting.value = true;
    
    // Save Invoice
    const payload = {
        invoice_no: form.value.invoice_no,
        invoice_title: form.value.invoice_title,
        tax_no: form.value.tax_no,
        issued_time: form.value.issued_time,
        amount: form.value.amount,
        tax_amount: form.value.tax_amount
    };
    
    let invoiceId = form.value.id;
    let error;
    
    if (isEdit.value) {
        const { error: updateError } = await supabase.from('invoice').update(payload).eq('id', invoiceId);
        error = updateError;
    } else {
        const { data, error: insertError } = await supabase.from('invoice').insert(payload).select().single();
        if (data) invoiceId = data.id;
        error = insertError;
    }
    
    if (error) {
         submitting.value = false;
         return uni.showToast({ title: '保存失败:'+error.message, icon: 'none' });
    }
    
    // Save Details
    // Delete old details first (simple strategy)
    if (isEdit.value) {
        await supabase.from('invoice_detail').delete().eq('invoice_id', invoiceId);
    }
    
    const detailPayload = details.value.map(d => ({
        invoice_id: invoiceId,
        item_name: d.item_name,
        spec: d.spec,
        quantity: parseFloat(d.quantity) || 0,
        price: parseFloat(d.price) || 0,
        tax_rate: parseFloat(d.tax_rate) || 0,
        amount: parseFloat(d.amount) || 0
    }));
    
    const { error: detailError } = await supabase.from('invoice_detail').insert(detailPayload);
    
    submitting.value = false;
    
    if (detailError) {
         uni.showToast({ title: '保存明细失败', icon: 'none' });
    } else {
         uni.showToast({ title: '保存成功', icon: 'success' });
         setTimeout(() => uni.navigateBack(), 1500);
    }
};

const handleDelete = async () => {
    uni.showModal({
        title: '提示',
        content: '确定删除此发票?',
        success: async (res) => {
            if (res.confirm) {
                // Delete details first
                await supabase.from('invoice_detail').delete().eq('invoice_id', form.value.id);
                // Delete invoice
                const { error } = await supabase.from('invoice').delete().eq('id', form.value.id);
                if (error) {
                    uni.showToast({ title: '删除失败', icon: 'none' });
                } else {
                    uni.showToast({ title: '已删除', icon: 'success' });
                    setTimeout(() => uni.navigateBack(), 1500);
                }
            }
        }
    })
};
</script>

<style lang="scss">
.container {
  padding: 15px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.form-card, .details-card {
  background: #fff;
  border-radius: 10px;
  padding: 15px;
  margin-bottom: 15px;
}
.form-item {
  margin-bottom: 15px;
  .label { font-size: 14px; color: #666; display: block; margin-bottom: 5px; }
  .required::after { content: '*'; color: red; margin-left: 2px; }
  .input { background: #f9f9f9; height: 40px; border-radius: 4px; padding: 0 10px; font-size: 14px; }
  .money { font-size: 18px; font-weight: bold; color: #ff4d4f; }
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    .title { font-weight: bold; font-size: 16px; }
    .btn-mini { font-size: 12px; background: #6739b6; color: #fff; padding: 4px 10px; }
}

.detail-item {
    background: #f9f9f9;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 10px;
}
.detail-row {
    display: flex;
    gap: 10px;
    margin-bottom: 5px;
    .input-mini { flex: 1; background: #fff; height: 32px; padding: 0 5px; font-size: 13px; border-radius: 4px; }
}
.footer {
    display: flex;
    justify-content: space-between;
}
.btn-remove { color: red; font-size: 12px; }

.footer { margin-top: 20px; display: flex; gap: 10px; }
.btn-save { flex: 1; background: #6739b6; color: #fff; border-radius: 20px; }
.btn-delete { flex: 1; background: #f5f5f5; color: red; border-radius: 20px; }
.read-only-tip { color: #999; width: 100%; text-align: center; }
</style>
