<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">出库单号</text>
        <input class="input" type="text" v-model="form.code" disabled placeholder="自动生成" />
      </view>
      <view class="form-item">
        <text class="label required">关联通用采购单</text>
        <picker @change="onOrderChange" :value="orderIndex" :range="orders" range-key="code" :disabled="isEdit || isPurchaseCompleted">
          <view class="input picker-view" :class="{ disabled: isEdit || isPurchaseCompleted }">
            {{ orders[orderIndex] ? orders[orderIndex].code : '请选择采购单' }}
          </view>
        </picker>
      </view>
      <view class="form-item">
        <text class="label">领用厂家 (收款方)</text>
        <view class="input disabled">{{ selectedOrder?.payee_manufacturer_name || '-' }}</view>
      </view>
      <view class="form-item">
        <text class="label">物料</text>
        <view class="input disabled">{{ selectedOrder?.material_name || '-' }}</view>
      </view>
      
      <view class="form-item">
        <text class="label required">出库数量</text>
        <input class="input" type="number" v-model="form.quantity" placeholder="请输入数量" :disabled="isPurchaseCompleted" />
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
          <view class="upload-btn" @click="chooseAttachment" v-if="!form.file_url && !tempFile && !isPurchaseCompleted">
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
             <view class="delete-btn" @click.stop="deleteAttachment" v-if="!isPurchaseCompleted">
                 <text>×</text>
             </view>
          </view>
        </view>
      </view>
    </view>
    
    <view v-if="isPurchaseCompleted" class="warning-banner">
        关联采购单已完成，不可修改
    </view>
    <view class="footer" v-if="!isPurchaseCompleted">
      <button class="btn-delete" v-if="isEdit" @click="handleDelete" :disabled="loading">删除</button>
      <button class="btn-save" @click="handleSave" :disabled="loading">
        {{ loading ? '保存中...' : '保存' }}
      </button>
      
      <!-- Receipt Generation Button -->
      <button 
          v-if="isEdit && isStockManagedManufacturer" 
          class="btn-receipt" 
          @click="generateReceipt"
      >
          生成凭证
      </button>
    </view>
    
    <!-- Receipt Prompt Modal -->
    <view class="receipt-modal" v-if="showReceiptPrompt">
        <view class="modal-mask"></view>
        <view class="modal-content">
            <view class="modal-icon">✅</view>
            <view class="modal-title">出库单保存成功</view>
            <view class="modal-desc">已为您分配流水单号：{{ form.code }}。当前发货厂家开启了库存管理，是否立即生成用于打印签署的纸质凭单？</view>
            
            <view class="modal-actions">
                <button class="btn-cancel" @click="closeReceiptPrompt">稍后再说</button>
                <button class="btn-confirm" @click="generateReceiptFromPrompt">立即生成</button>
            </view>
        </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase, supabaseUrl, supabaseAnonKey } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
import { onLoad } from '@dcloudio/uni-app';
import { getCurrentUser } from '@/utils/permission';
import { safeDeleteRecordWithFile } from '@/utils/storageFileUtils';
interface GeneralPurchaseOption {
  id: string;
  code: string;
  payee_manufacturer_id: string;
  payee_manufacturer_name?: string;
  material_id: string;
  material_name?: string;
  quantity: number;
  is_completed?: boolean;
}
interface StockOutForm {
  id: string;
  code: string;
  general_purchase_id: string;
  quantity: string;
  file_url: string;
}
const form = ref<StockOutForm>({
  id: '',
  code: '',
  general_purchase_id: '',
  quantity: '',
  file_url: ''
});

const tempFile = ref('');
const tempFileName = ref('');
const orders = ref<GeneralPurchaseOption[]>([]);
const orderIndex = ref(-1);
const loading = ref(false);
const isEdit = ref(false);
const isPurchaseCompleted = ref(false);
const isStockManagedManufacturer = ref(false);

const showReceiptPrompt = ref(false);
const generatedReceiptId = ref('');

const selectedOrder = computed(() => {
    return orderIndex.value >= 0 ? orders.value[orderIndex.value] : null;
});
onLoad(async (options: any) => {
  await fetchOptions();
  
  let targetId = '';
  
  if (options.id) {
    isEdit.value = true;
    form.value.id = options.id;
    await loadData(options.id);
    targetId = form.value.general_purchase_id;
  } else {
      form.value.code = await generateCode('stock_out', 'TYCK');
      
      // Handle pre-fill
      if (options.general_purchase_id) {
          targetId = options.general_purchase_id;
          form.value.general_purchase_id = targetId;
      }
  }
  
  // Ensure target order is in the list
  if (targetId) {
      const index = orders.value.findIndex(o => o.id === targetId);
      if (index >= 0) {
          orderIndex.value = index;
          isPurchaseCompleted.value = !!orders.value[index].is_completed;
          if (!isEdit.value) {
              const selected = orders.value[index];
              if (selected && selected.quantity) {
                  form.value.quantity = String(selected.quantity);
              }
          }
          if (orders.value[index].payee_manufacturer_id) {
               checkManufacturerStockSetting(orders.value[index].payee_manufacturer_id);
          }
      } else {
          await loadSpecificOrder(targetId);
      }
  }
});

const loadSpecificOrder = async (id: string) => {
  const { data, error } = await supabase
    .from('general_purchase')
    .select(`
        id, code, quantity, is_completed,
        payee_manufacturer_id, payee:payee_manufacturer_id(name),
        material_id, material:material_id(name)
    `)
    .eq('id', id)
    .single();
    
  if (data) {
      const orderData = data as any;
      const option: GeneralPurchaseOption = {
          id: orderData.id,
          code: orderData.code,
          payee_manufacturer_id: orderData.payee_manufacturer_id,
          payee_manufacturer_name: Array.isArray(orderData.payee) ? orderData.payee[0]?.name : (orderData.payee?.name || '未知厂家'),
          material_id: orderData.material_id,
          material_name: Array.isArray(orderData.material) ? orderData.material[0]?.name : (orderData.material?.name || '未知物料'),
          quantity: orderData.quantity,
          is_completed: orderData.is_completed
      };
      
      const existing = orders.value.findIndex(o => o.id === option.id);
      if (existing === -1) {
          orders.value.push(option);
          orderIndex.value = orders.value.length - 1;
      } else {
          orderIndex.value = existing;
      }
      
      isPurchaseCompleted.value = !!data.is_completed;
      
      if (!isEdit.value) {
           form.value.quantity = String(data.quantity);
      }
  }
};

const fetchOptions = async () => {
  const user = getCurrentUser();
  
  // Fetch General Purchases
  let query = supabase
    .from('general_purchase')
    .select(`
        id, code, quantity, is_completed,
        payee_manufacturer_id, payee:payee_manufacturer_id(name),
        material_id, material:material_id(name)
    `)
    .eq('is_confirmed', true);
    // .eq('is_completed', false); // Allow completed orders to verify status
  const { data, error } = await query;
  if (error) {
      console.error('Error fetching orders:', error);
      return;
  }
  
  // Filter by Permissions: User must have permission for the PAYEE manufacturer (Seller)
  // because "Stock Out" means removing stock from the Seller's inventory.
  let validOrders = data || [];
  
  if (user && !user.is_admin) {
      const allowedMfrs = user.manufacturer_permissions || [];
      validOrders = validOrders.filter((item: any) => allowedMfrs.includes(item.payee_manufacturer_id));
  }
  // Transform
  orders.value = validOrders.map((item: any) => ({
      id: item.id,
      code: item.code,
      payee_manufacturer_id: item.payee_manufacturer_id,
      payee_manufacturer_name: Array.isArray(item.payee) ? item.payee[0]?.name : (item.payee?.name || '未知厂家'),
      material_id: item.material_id,
      material_name: Array.isArray(item.material) ? item.material[0]?.name : (item.material?.name || '未知物料'),
      quantity: item.quantity,
      is_completed: item.is_completed
  }));
};
const loadData = async (id: string) => {
  uni.showLoading({ title: '加载中' });
  const { data, error } = await supabase
    .from('general_stock_out')
    .select('*')
    .eq('id', id)
    .single();
    
  uni.hideLoading();
  
  if (data) {
    form.value.code = data.code;
    form.value.general_purchase_id = data.general_purchase_id;
    form.value.quantity = data.quantity;
    form.value.file_url = data.file_url || '';
    
    if (form.value.file_url) {
        // 解析出文件名展示
        const urlParts = form.value.file_url.split('/');
        tempFileName.value = urlParts[urlParts.length - 1];
    }
    
    // Set Index
    orderIndex.value = orders.value.findIndex(o => o.id === data.general_purchase_id);
  }
};
const onOrderChange = (e: any) => {
  orderIndex.value = e.detail.value;
  const selected = orders.value[orderIndex.value];
  form.value.general_purchase_id = selected.id;
  isPurchaseCompleted.value = !!selected.is_completed;
  
  // Set and check stock manage flag based on payee
  if (selected.payee_manufacturer_id) {
       checkManufacturerStockSetting(selected.payee_manufacturer_id);
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

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该出库单吗？',
    success: async (res) => {
      if (res.confirm) {
        loading.value = true;
        
        const { success, error } = await safeDeleteRecordWithFile('general_stock_out', form.value.id, form.value.file_url);

        loading.value = false;
        
        if (!success) {
          uni.showToast({ title: '删除失败: ' + (error?.message || '未知错误'), icon: 'none' });
        } else {
          uni.showToast({ title: '已删除', icon: 'success' });
          setTimeout(() => {
            uni.navigateBack();
          }, 1500);
        }
      }
    }
  });
};
const handleSave = async () => {
  if (!form.value.code) return uni.showToast({ title: '请输入单号', icon: 'none' });
  if (!form.value.general_purchase_id) return uni.showToast({ title: '请选择关联订单', icon: 'none' });
  if (!form.value.quantity) return uni.showToast({ title: '请输入数量', icon: 'none' });
  loading.value = true;
  
  let error;
  let savedId = form.value.id;
  const payload: any = {
    code: form.value.code,
    general_purchase_id: form.value.general_purchase_id,
    quantity: Number(form.value.quantity),
    // note: form.value.note, // User reverted this, keeping it commented or removed if not in form
    // stock_out_date: ... // User reverted
  };
  // 1. Initial Insert/Update
  try {
    if (isEdit.value) {
      const { error: updateError } = await supabase.from('general_stock_out').update(payload).eq('id', form.value.id);
      error = updateError;
    } else {
      // @ts-ignore
      const { data, error: insertError } = await supabase.from('general_stock_out').insert(payload).select().single();
      error = insertError;
      if (data) savedId = data.id;
    }
    if (error) throw error;
    // 2. Handle File Upload (if changed)
    if (tempFile.value) {
        // We know we need to upload
        // In the previous version we checked if it changed, but here just checking presence is fine
        // Note: Realistically, if tempFile.value exists AND doesn't start with http, it needs upload
        if (!tempFile.value.startsWith('http')) {
            const fileExt = tempFileName.value.split('.').pop() || 'png';
            const fileName = `${savedId}.${fileExt}`;
            
            const { data: { session }, error: sessionError } = await supabase.auth.getSession();
            if (sessionError || !session) {
                throw new Error('Session not found');
            }
            const uploadRes = await new Promise<any>((resolve, reject) => {
                uni.uploadFile({
                    url: `${supabaseUrl}/storage/v1/object/general_stock_out/${fileName}`,
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
                        if (res.statusCode >= 200 && res.statusCode < 300) resolve(res);
                        else reject(new Error(`Upload failed with status ${res.statusCode}: ${res.data}`));
                    },
                    fail: (err) => reject(err)
                });
            });
            
            // Update record with file_url
            const { data: { publicUrl } } = supabase.storage.from('general_stock_out').getPublicUrl(fileName);
            const { error: updateUrlError } = await supabase
                .from('general_stock_out')
                .update({ file_url: publicUrl })
                .eq('id', savedId);
                
            if (updateUrlError) throw updateUrlError;
        }
    } else if (form.value.file_url === '' && !tempFile.value) {
        // User deleted the image
         const { error: updateUrlError } = await supabase
            .from('general_stock_out')
            .update({ file_url: null })
            .eq('id', savedId);
         if (updateUrlError) throw updateUrlError;
    }
    loading.value = false;
    uni.showToast({ title: '保存成功', icon: 'success' });
    
    if (isStockManagedManufacturer.value) {
         promptReceiptGeneration(savedId);
    } else {
         setTimeout(() => { uni.navigateBack(); }, 1500);
    }
    
  } catch (err: any) {
      console.error('Save error:', err);
      loading.value = false;
      return uni.showToast({ title: '保存失败: ' + (err.message || '未知错误'), icon: 'none' });
  }
};

const promptReceiptGeneration = (id: string) => {
    generatedReceiptId.value = id;
    showReceiptPrompt.value = true;
};

const generateReceipt = () => {
    if (!form.value.id) return;
    uni.navigateTo({ url: `/pages/receipt/stock-slip?mode=general_out&id=${form.value.id}` });
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

const isImage = (url: string) => {
    if (!url) return false;
    const lowerUrl = url.toLowerCase();
    return lowerUrl.includes('.jpg') || lowerUrl.includes('.jpeg') || lowerUrl.includes('.png');
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

const closeReceiptPrompt = () => {
    showReceiptPrompt.value = false;
    uni.navigateBack();
};

const generateReceiptFromPrompt = () => {
    showReceiptPrompt.value = false;
    uni.navigateTo({
        url: `/pages/receipt/stock-slip?mode=general_out&id=${generatedReceiptId.value}`
    });
};
</script>
<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 15px;
}
  .form-card {
  background-color: #fff;
  border-radius: 10px;
  padding: 15px;
}
.warning-banner {
    background-color: #fffbe6;
    border: 1px solid #ffe58f;
    color: #fa8c16;
    padding: 10px;
    border-radius: 6px;
    margin-bottom: 15px;
    font-size: 14px;
    text-align: center;
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
        color: #999;
        background-color: #f0f0f0;
    }
  }
  .picker-view {
    color: #333; 
  }
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
  background: linear-gradient(135deg, #6739b6, #855bc9);
  color: #fff;
  border-radius: 25px;
  height: 46px;
  line-height: 46px;
  font-size: 16px;
  
  &::after { border: none; }
  
  &:active {
    opacity: 0.9;
  }
}
.btn-receipt {
    flex: 2;
    background-color: #fff;
    color: #6739b6;
    border: 1px solid #6739b6;
    border-radius: 25px;
    height: 46px;
    line-height: 44px;
    font-size: 16px;
    padding: 0;
    
    &::after { border: none; }
    
    &:active {
      background-color: #f9f9f9;
    }
}
/* 附件区域样式 */
.attachment-section {
  padding: 16px 0;
  .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      .title {
        display: flex;
        align-items: center;
        font-size: 14px;
        color: #333;
        .blue-bar {
          /* width: 4px; */
          /* height: 16px; */
          /* background-color: #6739b6; */
          /* border-radius: 2px; */
          /* margin-right: 8px; */
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

</style>