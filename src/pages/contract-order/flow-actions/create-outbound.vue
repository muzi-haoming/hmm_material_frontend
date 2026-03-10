<template>
  <view class="container">
    <view class="form-group">
      <view class="form-item">
        <text class="label">产品</text>
        <text class="value">{{ productName }}</text>
      </view>
      <view class="form-item">
        <text class="label">出库数量</text>
        <input class="input" type="digit" v-model="form.quantity" placeholder="请输入出库数量" :disabled="isOrderCompleted" />
        <text class="unit">{{ unit }}</text>
      </view>
      
      <view class="form-item">
        <text class="label">发货厂家</text>
        <view v-if="hasPurchase" class="value" style="color: #999;">
          {{ getManufacturerName() }}
        </view>
        <picker v-else mode="selector" :range="manufacturers" range-key="name" @change="onManufacturerChange" :disabled="isOrderCompleted">
          <view class="picker-value" :class="{ placeholder: !form.manufacturer_id, disabled: isOrderCompleted }">
            {{ getManufacturerName() || '请选择发货厂家' }}
          </view>
        </picker>
      </view>

      <!-- 附件上传区域 -->
      <view class="attachment-section">
        <view class="section-header">
          <view class="title">
            <text class="blue-bar"></text>
            <text>附件/凭证</text>
          </view>
        </view>
        <view class="upload-container">
          <view class="upload-btn" @click="chooseAttachment" v-if="!form.file_url && !tempFile && !isOrderCompleted">
            <text class="icon-plus">+</text>
            <text class="upload-text">添加附件</text>
          </view>
          
          <view class="file-preview" v-if="form.file_url || tempFile">
             <view class="file-info" @click="previewAttachment">
                 <image v-if="isImage(form.file_url || tempFile)" :src="tempFile || form.file_url" mode="aspectFill" class="preview-img"></image>
                 <view v-else class="document-icon">
                    <text class="icon-file">📄</text>
                    <text class="file-name">{{ tempFileName || '已上传的文件' }}</text>
                 </view>
             </view>
             <view class="delete-btn" @click.stop="deleteAttachment" v-if="!isOrderCompleted">
                 <text>×</text>
             </view>
          </view>
        </view>
      </view>
    </view>

    <view class="submit-btn-box" :class="{ 'has-receipt': actionId && isStockManagedManufacturer }">
      <view v-if="isOrderCompleted" class="status-alert" style="width: 100%">关联订单已完成，不可修改</view>
      <template v-else>
          <button class="submit-btn btn-save" :loading="submitting" @click="submit">
              {{ actionId ? '保存' : '提交出库单' }}
          </button>
          
          <!-- Receipt Generation Button -->
          <button 
              v-if="actionId && isStockManagedManufacturer" 
              class="submit-btn btn-receipt" 
              @click="generateReceipt"
          >
              生成凭证
          </button>
      </template>
    </view>
    
    <!-- Receipt Prompt Modal -->
    <view class="receipt-modal" v-if="showReceiptPrompt">
        <view class="modal-mask"></view>
        <view class="modal-content">
            <view class="modal-icon">✅</view>
            <view class="modal-title">出库单保存成功</view>
            <view class="modal-desc">已为您记录单据。当前发货厂家开启了库存管理，是否立即生成用于打印签署的纸质凭单？</view>
            
            <view class="modal-actions">
                <button class="btn-cancel" @click="closeReceiptPrompt">稍后再说</button>
                <button class="btn-confirm" @click="generateReceiptFromPrompt">立即生成</button>
            </view>
        </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
import { onLoad } from '@dcloudio/uni-app';

const orderId = ref('');
const productName = ref('');
const unit = ref('');
const productId = ref('');
const manufacturers = ref<any[]>([]);
const submitting = ref(false);
const hasPurchase = ref(false);
const actionId = ref('');
const isOrderCompleted = ref(false);
const isStockManagedManufacturer = ref(false);

const showReceiptPrompt = ref(false);
const generatedReceiptId = ref('');

const form = ref({
  quantity: '',
  manufacturer_id: '',
  file_url: ''
});

const tempFile = ref('');
const tempFileName = ref('');

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    if (options.actionId) {
        actionId.value = options.actionId;
    }
      
    if (options.orderId) {
      orderId.value = options.orderId;
      await fetchOrderInfo();
      await fetchManufacturers();
    }
    
    if (actionId.value) {
        await fetchExistingData();
    }
  } finally {
    uni.hideLoading();
  }
});


const fetchOrderInfo = async () => {
  const { data } = await supabase
    .from('contract_order')
    .select('quantity, is_completed, product:product_id(id, name, unit)')
    .eq('id', orderId.value)
    .single();
    
  if (data) {
    form.value.quantity = data.quantity; // Default to order quantity
    isOrderCompleted.value = data.is_completed;
    if (data.product) {
        productName.value = (data.product as any).name;
        unit.value = (data.product as any).unit;
    }
  }
};
const isImage = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png');
};

const setupFilePreview = (url: string) => {
    tempFileName.value = url.split('/').pop() || 'image.jpg';
    if (!isImage(url)) {
         setTimeout(() => {
             // ensure view loads in doc icon
         }, 100);
    }
};

const fetchExistingData = async () => {
    const { data } = await supabase
        .from('contract_order_stock_out')
        .select('*')
        .eq('id', actionId.value)
        .single();
        
    if (data) {
        form.value.manufacturer_id = data.manufacturer_id;
        form.value.quantity = data.quantity;
        form.value.file_url = data.file_url || '';
        
        if (form.value.file_url) {
            setupFilePreview(form.value.file_url);
        }
        
        await checkManufacturerStockSetting(data.manufacturer_id);
    }
};

const checkManufacturerStockSetting = async (id: string) => {
    isStockManagedManufacturer.value = false;
    if (!id) return;
    const { data } = await supabase.from('manufacturer').select('is_manage_stock').eq('id', id).single();
    if (data && data.is_manage_stock) {
        isStockManagedManufacturer.value = true;
    }
};

const fetchManufacturers = async () => {
  const { data } = await supabase.from('manufacturer').select('id, name');
  if (data) manufacturers.value = data;
  
  // Auto-fill from latest Purchase Order
  const { data: purchaseData } = await supabase
    .from('contract_order_purchase')
    .select('payee_manufacturer_id')
    .eq('contract_order_id', orderId.value)
    .order('create_time', { ascending: false })
    .limit(1)
    .maybeSingle(); 
    
   if (purchaseData && purchaseData.payee_manufacturer_id && !actionId.value) {
       form.value.manufacturer_id = purchaseData.payee_manufacturer_id;
       hasPurchase.value = true;
       checkManufacturerStockSetting(purchaseData.payee_manufacturer_id);
   }
};

const getManufacturerName = () => manufacturers.value.find(m => m.id === form.value.manufacturer_id)?.name;

const onManufacturerChange = (e: any) => {
  form.value.manufacturer_id = manufacturers.value[e.detail.value].id;
  checkManufacturerStockSetting(form.value.manufacturer_id);
};

const performUploadAndGetUrl = async (recordId: string): Promise<string | null | undefined> => {
     if (!tempFile.value) {
         if (form.value.file_url === '' && !!actionId.value) {
              return null; // indicates it was deleted
         }
         return undefined; // no change
     }
     
     const ext = tempFileName.value.split('.').pop()?.toLowerCase() || 'jpg';
     const fileName = `${recordId}.${ext}`;
     
     const session = await supabase.auth.getSession().then(res => res.data.session);
     if (!session) throw new Error('No valid session for upload');
     
     await new Promise<any>((resolve, reject) => {
         uni.uploadFile({
             url: `${supabaseUrl}/storage/v1/object/contract_order_stock_out/${fileName}`,
             filePath: tempFile.value,
             name: 'file',
             header: {
                 'apikey': supabaseAnonKey,
                 'Authorization': `Bearer ${session.access_token}`,
                 'x-upsert': 'true',
             },
             formData: { upsert: 'true' },
             success: (res) => {
                 if (res.statusCode >= 200 && res.statusCode < 300) resolve(res);
                 else reject(new Error(`Upload failed with status ${res.statusCode}: ${res.data}`));
             },
             fail: (err) => reject(err)
         });
     });
     
     const { data: { publicUrl } } = supabase.storage.from('contract_order_stock_out').getPublicUrl(fileName);
     return publicUrl;
};

const submit = async () => {
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });
  if (!form.value.manufacturer_id) return uni.showToast({ title: '请选择发货厂家', icon: 'none' });

  submitting.value = true;
  
  try {
      if (actionId.value) {
          const { error } = await supabase.from('contract_order_stock_out')
              .update({
                  manufacturer_id: form.value.manufacturer_id,
                  quantity: parseFloat(form.value.quantity)
              })
              .eq('id', actionId.value);
              
          if (error) throw error;
          
          const newUrl = await performUploadAndGetUrl(actionId.value);
          if (newUrl !== undefined) {
              await supabase.from('contract_order_stock_out').update({ file_url: newUrl }).eq('id', actionId.value);
          }
          
          submitting.value = false;
          uni.showToast({ title: '保存成功', icon: 'success' });
          
          if (isStockManagedManufacturer.value) {
               promptReceiptGeneration(actionId.value);
          } else {
               setTimeout(() => { uni.navigateBack(); }, 1500);
          }
          
      } else {
          const code = await generateCode('contract_order_stock_out', 'HTCK');
        
          const { data: insertedData, error } = await supabase.from('contract_order_stock_out').insert({
            code: code,
            contract_order_id: orderId.value,
            manufacturer_id: form.value.manufacturer_id,
            quantity: parseFloat(form.value.quantity)
          }).select().single();
        
          if (error) throw error;
          
          if (insertedData) {
               const newUrl = await performUploadAndGetUrl(insertedData.id);
               if (newUrl !== undefined) {
                   await supabase.from('contract_order_stock_out').update({ file_url: newUrl }).eq('id', insertedData.id);
               }
          }
        
          submitting.value = false;
          uni.showToast({ title: '创建成功', icon: 'success' });
          
          if (isStockManagedManufacturer.value && insertedData?.id) {
               promptReceiptGeneration(insertedData.id);
          } else {
               setTimeout(() => { uni.navigateBack(); }, 1500);
          }
      }
  } catch (error: any) {
      console.error('Submit error:', error);
      submitting.value = false;
      uni.showToast({ title: '操作失败: ' + (error.data?.message || error.message || '未知错误'), icon: 'none' });
  }
};

const promptReceiptGeneration = (id: string) => {
    generatedReceiptId.value = id;
    showReceiptPrompt.value = true;
};

const closeReceiptPrompt = () => {
    showReceiptPrompt.value = false;
    uni.navigateBack();
};

const generateReceiptFromPrompt = () => {
    showReceiptPrompt.value = false;
    uni.navigateTo({ url: `/pages/receipt/stock-slip?mode=contract_out&id=${generatedReceiptId.value}` });
};

const generateReceipt = () => {
    if (!actionId.value) return;
    uni.navigateTo({ url: `/pages/receipt/stock-slip?mode=contract_out&id=${actionId.value}` });
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

const previewAttachment = () => {
    const url = tempFile.value || form.value.file_url;
    if (!url) return;
    
    if (isImage(url)) {
        uni.previewImage({ urls: [url], current: url });
    } else {
        uni.showLoading({ title: '正在打开文档' });
        uni.downloadFile({
            url: url,
            success: (res) => {
                if (res.statusCode === 200) {
                    uni.openDocument({
                        filePath: res.tempFilePath,
                        success: () => uni.hideLoading(),
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
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f7fa;
  padding: 15px;
}
.form-group {
  background-color: #fff;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}
.form-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #f5f5f5;
  .label { width: 80px; color: #333; font-weight: 500; }
  .value { flex: 1; color: #666; }
  .input { flex: 1; color: #333; }
  .unit { margin-left: 10px; color: #999; font-size: 14px; }
  picker { flex: 1; }
  .picker-value { color: #333; &.placeholder { color: #999; } }
}
.submit-btn-box {
  margin-top: 30px;
  
  &.has-receipt {
      display: flex;
      gap: 15px;
      
      .submit-btn {
          margin-top: 0;
          flex: 1;
      }
      
      .btn-save {
          flex: 2.5;
      }
      
      .btn-receipt {
          flex: 2;
          background: #fff;
          color: #6739b6;
          border: 1px solid #6739b6;
          
          &::after { border: none; }
          &:active { background-color: #f9f9f9; }
      }
  }
  
  .submit-btn {
    background: linear-gradient(135deg, #6739b6, #855bc9);
    color: #fff;
    border-radius: 25px;
    height: 46px;
    line-height: 46px;
    font-size: 16px;
    
    &::after { border: none; }
    &:active { opacity: 0.9; }
  }
}

.status-alert {
  background-color: #fffbe6;
  color: #d46b08;
  border: 1px solid #ffe58f;
  padding: 12px;
  text-align: center;
  border-radius: 8px;
  font-size: 14px;
}

/* 附件区域样式 */
.attachment-section {
  padding: 16px;
  .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      .title {
        display: flex;
        align-items: center;
        font-size: 16px;
        font-weight: 500;
        color: #333;
        .blue-bar {
          width: 4px;
          height: 16px;
          background-color: #6739b6;
          border-radius: 2px;
          margin-right: 8px;
        }
      }
  }
  
  .upload-container {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
  }
  
  .upload-btn {
      width: 100px;
      height: 100px;
      background-color: #f8f9fc;
      border: 1px dashed #dcdfe6;
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      .icon-plus {
          font-size: 28px;
          color: #909399;
          margin-bottom: 4px;
      }
      .upload-text {
          font-size: 12px;
          color: #909399;
      }
  }

  .file-preview {
      position: relative;
      width: 100px;
      height: 100px;
      border-radius: 8px;
      border: 1px solid #ebeef5;
      overflow: hidden;
      
      .file-info {
           width: 100%;
           height: 100%;
           display: flex;
           justify-content: center;
           align-items: center;
           background-color: #fafafa;
           
           .preview-img {
               width: 100%;
               height: 100%;
           }
           
           .document-icon {
               display: flex;
               flex-direction: column;
               align-items: center;
               justify-content: center;
               padding: 8px;
               
               .icon-file {
                   font-size: 32px;
                   margin-bottom: 8px;
               }
               
               .file-name {
                   font-size: 10px;
                   color: #606266;
                   text-align: center;
                   word-break: break-all;
                   display: -webkit-box;
                   -webkit-box-orient: vertical;
                   -webkit-line-clamp: 2;
                   overflow: hidden;
               }
           }
      }
      
      .delete-btn {
          position: absolute;
          top: 0;
          right: 0;
          width: 20px;
          height: 20px;
          background-color: rgba(245, 108, 108, 0.9);
          border-bottom-left-radius: 8px;
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 10;
          
          text {
              color: #fff;
              font-size: 14px;
              line-height: 1;
              font-weight: bold;
          }
      }
  }
}

.receipt-modal {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 999;
    display: flex;
    align-items: center;
    justify-content: center;
    
    .modal-mask {
        position: absolute;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
    }
    
    .modal-content {
        position: relative;
        background-color: #fff;
        width: 80%;
        max-width: 320px;
        border-radius: 12px;
        padding: 30px 20px 20px;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        animation: scaleIn 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }
    
    .modal-icon {
        font-size: 48px;
        margin-bottom: 15px;
        line-height: 1;
    }
    
    .modal-title {
        font-size: 18px;
        font-weight: bold;
        color: #333;
        margin-bottom: 10px;
    }
    
    .modal-desc {
        font-size: 14px;
        color: #666;
        line-height: 1.5;
        margin-bottom: 25px;
        text-align: left;
    }
    
    .modal-actions {
        display: flex;
        gap: 15px;
        
        button {
            flex: 1;
            height: 40px;
            line-height: 40px;
            font-size: 15px;
            border-radius: 20px;
            margin: 0;
            
            &.btn-cancel {
                background-color: #f5f5f5;
                color: #666;
            }
            
            &.btn-confirm {
                background-color: #6739b6;
                color: #fff;
            }
        }
    }
}

@keyframes scaleIn {
    from {
        opacity: 0;
        transform: scale(0.9);
    }
    to {
        opacity: 1;
        transform: scale(1);
    }
}
</style>
