<template>
  <view class="container">
    <view class="form-card">
      <view class="form-item">
        <text class="label required">对账单号</text>
        <input class="input" type="text" v-model="form.code" disabled placeholder="自动生成" />
      </view>
      
      <view class="form-item">
        <text class="label required">选择合同</text>
        <picker 
          mode="selector" 
          :range="contracts" 
          range-key="name" 
          @change="onContractChange"
          :disabled="isEdit"
        >
          <view class="input picker-view" :class="{ disabled: isEdit }">
            {{ getContractName() || '请选择合同' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">开始日期</text>
        <picker mode="date" :value="form.start_time" @change="bindStartDateChange">
          <view class="input picker-view">
            {{ form.start_time || '请选择开始日期' }}
          </view>
        </picker>
      </view>

      <view class="form-item">
        <text class="label required">结束日期</text>
        <picker mode="date" :value="form.end_time" @change="bindEndDateChange">
          <view class="input picker-view">
            {{ form.end_time || '请选择结束日期' }}
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
          <view class="upload-btn" @click="chooseAttachment" v-if="!form.file_url && !tempFile">
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
             <view class="delete-btn" @click.stop="deleteAttachment">
                 <text>×</text>
             </view>
          </view>
        </view>
      </view>
    </view>

    <view class="footer">
      <button class="btn-delete" v-if="isEdit" @click="handleDelete" :disabled="submitting">删除</button>
      <button class="btn-save" @click="submit" :disabled="submitting">
        {{ submitting ? '保存中...' : '保存' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { generateCode } from '@/utils/codeGen';
import { onLoad } from '@dcloudio/uni-app';
import { getCurrentUser, type UserInfo } from '@/utils/permission';

const form = ref({
  id: '',
  code: '',
  contract_id: '',
  start_time: '',
  end_time: '',
  file_url: ''
});

const tempFile = ref('');
const tempFileName = ref('');

const contracts = ref<any[]>([]);
const isEdit = ref(false);
const submitting = ref(false);
const currentUser = ref<UserInfo | null>(null);

const selectedContract = computed(() => contracts.value.find(c => c.id === form.value.contract_id));
const getContractName = () => selectedContract.value?.name;

onLoad(async (options: any) => {
  uni.showLoading({ title: '加载中...', mask: true });
  try {
    currentUser.value = await getCurrentUser();
    await fetchContracts();
    
    if (options.id) {
      isEdit.value = true;
      form.value.id = options.id;
      await loadData(options.id);
    } else {
      await initCode();
      // Default dates
      const now = new Date();
      form.value.end_time = now.toISOString().split('T')[0];
      const lastMonth = new Date();
      lastMonth.setMonth(now.getMonth() - 1);
      form.value.start_time = lastMonth.toISOString().split('T')[0];
    }
  } finally {
    uni.hideLoading();
  }
});

const initCode = async () => {
  form.value.code = await generateCode('statement', 'JSD');
};

const fetchContracts = async () => {
  const { data } = await supabase
    .from('contract')
    .select('id, name, site_id')
    .eq('is_confirmed', true)
    .eq('is_completed', false)
    .order('create_time', { ascending: false });
    
  if (data) {
     if (currentUser.value?.is_admin) {
         contracts.value = data;
     } else {
         const allowedSites = currentUser.value?.site_permissions || [];
         contracts.value = data.filter(c => allowedSites.includes(c.site_id));
     }
  }
};

const loadData = async (id: string) => {
  const { data } = await supabase.from('statement').select('*').eq('id', id).single();
  if (data) {
    form.value = {
        ...data,
        start_time: data.start_time.split('T')[0],
        end_time: data.end_time.split('T')[0],
        file_url: data.file_url || ''
    };
    
    if (form.value.file_url) {
        // 解析出文件名展示
        const urlParts = form.value.file_url.split('/');
        tempFileName.value = urlParts[urlParts.length - 1];
    }
  }
};

const onContractChange = (e: any) => {
  const index = e.detail.value;
  form.value.contract_id = contracts.value[index].id;
};

const bindStartDateChange = (e: any) => {
  form.value.start_time = e.detail.value;
};

const bindEndDateChange = (e: any) => {
  form.value.end_time = e.detail.value;
};

const submit = async () => {
  if (!form.value.contract_id) return uni.showToast({ title: '请选择合同', icon: 'none' });
  if (!form.value.start_time) return uni.showToast({ title: '请选择开始日期', icon: 'none' });
  if (!form.value.end_time) return uni.showToast({ title: '请选择结束日期', icon: 'none' });
  
  submitting.value = true;
  
  const payload = {
    code: form.value.code,
    contract_id: form.value.contract_id,
    start_time: form.value.start_time,
    end_time: form.value.end_time
  };
  
  let targetId = form.value.id;
  let error;
  
  try {
      if (isEdit.value) {
         const { error: updateError } = await supabase.from('statement').update({
             start_time: form.value.start_time,
             end_time: form.value.end_time
         }).eq('id', targetId);
         error = updateError;
      } else {
         const { data, error: insertError } = await supabase.from('statement').insert(payload).select().single();
         if (data) targetId = data.id;
         error = insertError;
      }

      if (error) throw error;

      // 文件上传逻辑合并
      if (tempFile.value) {
          if (!tempFile.value.startsWith('http')) {
              const fileExt = tempFileName.value.split('.').pop() || 'png';
              const fileName = `${targetId}.${fileExt}`;
              
              const { data: { session }, error: sessionError } = await supabase.auth.getSession();
              if (sessionError || !session) throw new Error('Session not found');

              await new Promise<any>((resolve, reject) => {
                  uni.uploadFile({
                      url: `${supabaseUrl}/storage/v1/object/statement/${fileName}`,
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
              
              const { data: { publicUrl } } = supabase.storage.from('statement').getPublicUrl(fileName);
              
              const { error: updateUrlError } = await supabase
                  .from('statement')
                  .update({ file_url: publicUrl })
                  .eq('id', targetId);
                  
              if (updateUrlError) throw updateUrlError;
          }
      } else if (form.value.file_url === '' && !tempFile.value) {
           const { error: updateUrlError } = await supabase
              .from('statement')
              .update({ file_url: null })
              .eq('id', targetId);
           if (updateUrlError) throw updateUrlError;
      }
      
      error = null;
  } catch(err: any) {
      error = err;
      console.error('Save error:', err);
  }
  
  submitting.value = false;
  
  if (error) {
    uni.showToast({ title: '保存失败: ' + error.message, icon: 'none' });
  } else {
    uni.showToast({ title: '保存成功', icon: 'success' });
    setTimeout(() => {
        // Redirect to detail page
        uni.redirectTo({ url: `/pages/statement/detail?id=${targetId}` });
    }, 1500);
  }
};

const handleDelete = async () => {
  uni.showModal({
    title: '提示',
    content: '确定要删除该对账单吗？',
    success: async (res) => {
      if (res.confirm) {
        submitting.value = true;
        // 注意：这里需要先删除文件引用的封装函数，但为了简便先直接删除数据再删除文件
        const { error } = await supabase.from('statement').delete().eq('id', form.value.id);
        if (!error && form.value.file_url) {
             const urlParts = form.value.file_url.split('/');
             const fileName = urlParts[urlParts.length - 1];
             await supabase.storage.from('statement').remove([fileName]);
        }
        submitting.value = false;
        
        if (error) {
          uni.showToast({ title: '删除失败: ' + error.message, icon: 'none' });
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
</script>

<style lang="scss">
.container {
  padding: 15px;
  background-color: #f5f5f5;
  min-height: 100vh;
}
.form-card {
  background: #fff;
  border-radius: 10px;
  padding: 15px;
}
.form-item {
  margin-bottom: 20px;
  .label { display: block; margin-bottom: 8px; font-size: 14px; color: #666; }
  .required::after { content: '*'; color: red; margin-left: 2px; }
  .input { background: #f9f9f9; height: 44px; line-height: 44px; padding: 0 10px; border-radius: 6px; font-size: 15px; }
  .picker-view { color: #333; &.disabled { color: #999; } }
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
  border: none;
  
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
  border: none;
  
  &:active {
    opacity: 0.9;
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
