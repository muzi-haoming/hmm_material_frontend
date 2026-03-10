<template>
  <view class="container">
    <view class="form-card">
      <view class="card-header">
        <text class="title">基本信息</text>
      </view>
      <view class="form-item">
        <text class="label required">发票号码</text>
        <input class="input" type="text" v-model="form.invoice_no" placeholder="请输入发票号码" :disabled="isReadOnly" />
      </view>
      <view class="form-item">
        <text class="label required">发票抬头</text>
        <input class="input" type="text" v-model="form.invoice_title" placeholder="请输入发票抬头" :disabled="isReadOnly" />
      </view>
      <view class="form-item">
        <text class="label required">税号</text>
        <input class="input" type="text" v-model="form.tax_no" placeholder="请输入税号" :disabled="isReadOnly" />
      </view>
      <view class="form-item">
        <text class="label required">开票日期</text>
        <picker mode="date" :value="form.issued_time" @change="bindDateChange" :disabled="isReadOnly">
          <view class="input picker-view" :class="{ disabled: isReadOnly }">
            <text>{{ form.issued_time || '请选择开票日期' }}</text>
          </view>
        </picker>
      </view>
      <!-- Auto calculated totals -->
      <!-- Auto calculated totals -->
      <view class="summary-grid">
          <view class="form-item summary-item">
            <text class="label">总金额 (含税)</text>
            <text class="value money">¥{{ form.amount }}</text>
          </view>
          <view class="form-item summary-item">
            <text class="label">总税额</text>
            <text class="value money">¥{{ form.tax_amount }}</text>
          </view>
      </view>

      <!-- Attachment section -->
      <view class="form-item">
        <text class="label">附件/凭证</text>
        <view class="upload-box">
             <view class="upload-btn" @click="chooseAttachment" v-if="!form.file_url && !tempFile && !isReadOnly">
                 <text class="plus">+</text>
                 <text class="text">选择附件</text>
             </view>
             <view class="preview-box" v-else-if="form.file_url || tempFile">
                 <!-- If it's an image, show thumbnail -->
                 <image v-if="isImage(tempFile || form.file_url)" class="preview-img" :src="tempFile || form.file_url" mode="aspectFill" @click="previewAttachment"></image>
                 <!-- If it's a document, show file icon/text -->
                 <view v-else class="preview-doc" @click="previewAttachment">
                     <text class="iconfont icon-file"></text>
                     <text class="doc-text">查看文档</text>
                 </view>
                 
                 <view class="delete-icon" @click.stop="deleteAttachment" v-if="!isReadOnly">×</view>
             </view>
             <view class="empty-text" v-else>
                 无附件
             </view>
        </view>
      </view>
    </view>

    <!-- Invoice Details -->
    <view class="details-card">
      <view class="card-header">
        <text class="title">发票明细</text>
      </view>
      
      <view v-for="(item, index) in details" :key="index" class="detail-item-box">
        <view class="detail-header">
            <text class="detail-index">明细 {{ index + 1 }}</text>
            <text class="btn-remove" v-if="!isReadOnly" @click="removeDetail(index)"><text class="iconfont icon-delete"></text> 删除</text>
        </view>
        <view class="detail-grid">
            <view class="grid-item">
                <text class="grid-label">项目名称</text>
                <input class="grid-input" v-model="item.item_name" placeholder="请输入" :disabled="isReadOnly" />
            </view>
            <view class="grid-item">
                <text class="grid-label">规格型号</text>
                <input class="grid-input" v-model="item.spec" placeholder="请输入" :disabled="isReadOnly" />
            </view>
            <view class="grid-item">
                <text class="grid-label">数量</text>
                <input class="grid-input" type="digit" v-model="item.quantity" placeholder="0" @input="calcItemAmount(item)" :disabled="isReadOnly" />
            </view>
            <view class="grid-item">
                <text class="grid-label">单价</text>
                <input class="grid-input" type="digit" v-model="item.price" placeholder="0" @input="calcItemAmount(item)" :disabled="isReadOnly" />
            </view>
            <view class="grid-item">
                <text class="grid-label">税率(%)</text>
                <input class="grid-input" type="digit" v-model="item.tax_rate" placeholder="13" @input="calcItemAmount(item)" :disabled="isReadOnly" />
            </view>
            <view class="grid-item">
                <text class="grid-label">明细金额</text>
                <view class="grid-text money">¥{{ item.amount || 0 }}</view>
            </view>
        </view>
      </view>

      <view class="add-detail-container" v-if="!isReadOnly">
        <button class="btn-add-detail" @click="addDetail">+ 添加明细</button>
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
  tax_amount: 0,
  file_url: ''
});

const details = ref<any[]>([]);
const isEdit = ref(false);
const submitting = ref(false);
const isReadOnly = ref(false);
const tempFile = ref('');
const tempFileName = ref('');

import { supabaseUrl, supabaseAnonKey } from '@/utils/supabase';

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
         return;
    } 
    
    // Upload File if needed
    if (tempFile.value) {
        try {
            const ext = tempFileName.value.split('.').pop()?.toLowerCase() || 'jpg';
            const fileName = `${invoiceId}.${ext}`;
            
            const session = await supabase.auth.getSession().then(res => res.data.session);
            if (!session) {
                throw new Error('No valid session for upload');
            }
            const uploadRes = await new Promise<any>((resolve, reject) => {
                uni.uploadFile({
                    url: `${supabaseUrl}/storage/v1/object/invoice/${fileName}`,
                    filePath: tempFile.value,
                    name: 'file',
                    header: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${session.access_token}`,
                        'x-upsert': 'true', // Allow overwriting
                    },
                    formData: {
                        upsert: 'true'
                    },
                    success: (res) => {
                        if (res.statusCode >= 200 && res.statusCode < 300) {
                            resolve(res);
                        } else {
                            reject(new Error(`Upload failed with status ${res.statusCode}: ${res.data}`));
                        }
                    },
                    fail: (err) => reject(err)
                });
            });
            console.log('Upload success:', uploadRes);
            const { data: { publicUrl } } = supabase.storage.from('invoice').getPublicUrl(fileName);
            
            const { error: updateUrlError } = await supabase
                .from('invoice')
                .update({ file_url: publicUrl })
                .eq('id', invoiceId);
                
            if (updateUrlError) throw updateUrlError;
        } catch (err: any) {
             console.error('File Upload error:', err);
             submitting.value = false;
             return uni.showToast({ title: '附件上传失败: ' + (err.message || '未知错误'), icon: 'none' });
        }
    } else if (form.value.file_url === '' && !tempFile.value && isEdit.value) {
         const { error: updateUrlError } = await supabase
             .from('invoice')
             .update({ file_url: null })
             .eq('id', invoiceId);
         if (updateUrlError) {
             console.error('Failed to clear file url', updateUrlError);
         }
    }

    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => uni.navigateBack(), 1500);
};

const chooseAttachment = () => {
    uni.showActionSheet({
        itemList: ['拍照或从相册选择图片', '从微信聊天选择文件'],
        success: (res) => {
            if (res.tapIndex === 0) {
                uni.chooseImage({
                    count: 1,
                    success: (res) => {
                        tempFile.value = res.tempFilePaths[0];
                        // Auto generate a name for image
                        tempFileName.value = 'image.jpg';
                    }
                });
            } else if (res.tapIndex === 1) {
                uni.chooseMessageFile({
                     count: 1,
                     type: 'file',
                     extension: ['.pdf', '.xls', '.xlsx', '.jpg', '.png', '.jpeg'],
                     success: (res) => {
                         const file = res.tempFiles[0];
                         tempFile.value = file.path;
                         tempFileName.value = file.name;
                     }
                });
            }
        }
    });
};

const deleteAttachment = () => {
    tempFile.value = '';
    tempFileName.value = '';
    form.value.file_url = '';
};

const isImage = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png');
};

const previewAttachment = () => {
    const url = tempFile.value || form.value.file_url;
    if (!url) return;
    
    if (isImage(url)) {
        uni.previewImage({
            urls: [url],
            current: url
        });
    } else {
        // We use downloadFile + openDocument for files
        uni.showLoading({ title: '正在打开文档' });
        uni.downloadFile({
            url: url,
            success: (res) => {
                if (res.statusCode === 200) {
                    uni.openDocument({
                        filePath: res.tempFilePath,
                        success: () => {
                            uni.hideLoading();
                        },
                        fail: () => {
                            uni.hideLoading();
                            uni.showToast({ title: '不支持打开此类文件', icon: 'none' });
                        }
                    });
                } else {
                    uni.hideLoading();
                    uni.showToast({ title: '下载失败', icon: 'none' });
                }
            },
            fail: () => {
                uni.hideLoading();
                uni.showToast({ title: '下载失败', icon: 'none' });
            }
        });
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
  .input { 
      background: #f9f9f9; 
      height: 40px; 
      border-radius: 4px; 
      padding: 0 10px; 
      font-size: 14px; 
      display: flex;
      align-items: center;
  }
  .money { font-size: 18px; font-weight: bold; color: #ff4d4f; }
}

.summary-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 15px;
    margin-top: 10px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding-bottom: 5px;

    .title { 
        font-weight: bold; 
        font-size: 15px; 
        color: #333;
        display: flex;
        align-items: center;
        
        &::before {
            content: '';
            display: inline-block;
            width: 4px;
            height: 14px;
            background-color: #6739b6;
            margin-right: 8px;
            border-radius: 2px;
        }
    }
}

.detail-item-box {
    background: #f9f9f9;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 15px;
    border: 1px solid #ebebeb;
}

.detail-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px dashed #e0e0e0;
    
    .detail-index {
        font-size: 14px;
        font-weight: 500;
        color: #333;
    }
    
    .btn-remove { 
        color: #ff4d4f; 
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 4px;
        &:active { opacity: 0.7; }
    }
}

.detail-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.grid-item {
    display: flex;
    flex-direction: column;
    
    .grid-label {
        font-size: 12px;
        color: #666;
        margin-bottom: 4px;
    }
    
    .grid-input {
        background: #fff;
        height: 36px;
        padding: 0 8px;
        font-size: 14px;
        border-radius: 4px;
        border: 1px solid #eee;
    }
    
    .grid-text {
        height: 36px;
        line-height: 36px;
        font-size: 16px;
        font-weight: bold;
    }
}

.add-detail-container {
    margin-top: 15px;
}

.btn-add-detail {
    background-color: transparent;
    color: #6739b6;
    border: 1px dashed #6739b6;
    border-radius: 22px;
    font-size: 14px;
    height: 44px;
    line-height: 42px;
    
    &::after {
        border: none;
    }
    
    &:active {
        background-color: rgba(103, 57, 182, 0.05);
    }
}

.footer { margin-top: 20px; display: flex; gap: 10px; }
.btn-save { flex: 1; background: #6739b6; color: #fff; border-radius: 20px; }
.btn-delete { flex: 1; background: #f5f5f5; color: red; border-radius: 20px; }
.read-only-tip { color: #999; width: 100%; text-align: center; }

/* Upload Box Styles borrowed/adapted from stock out */
.upload-box {
    margin-top: 5px;
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
}
.upload-btn {
    width: 80px;
    height: 80px;
    background-color: #f9f9f9;
    border: 1px dashed #d9d9d9;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    
    &:active {
        background-color: #f0f0f0;
    }
    
    .plus {
        font-size: 24px;
        color: #999;
        margin-bottom: 4px;
        line-height: 1;
    }
    .text {
        font-size: 11px;
        color: #999;
    }
}
.preview-box {
    width: 80px;
    height: 80px;
    position: relative;
    border-radius: 8px;
    border: 1px solid #eee;
    overflow: visible;
    
    .preview-img {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        display: block;
    }
    .preview-doc {
        width: 100%;
        height: 100%;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background-color: #f0f2f5;
        
        .icon-file {
            font-size: 28px;
            color: #6739b6;
            margin-bottom: 5px;
        }
        .doc-text {
            font-size: 11px;
            color: #666;
        }
    }
    .delete-icon {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 20px;
        height: 20px;
        background-color: rgba(255, 77, 79, 0.9);
        color: #fff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        font-weight: bold;
        line-height: 1;
        z-index: 2;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        
        &:active {
            transform: scale(0.9);
        }
    }
}
.empty-text {
    font-size: 14px;
    color: #999;
    line-height: 80px;
}
</style>
