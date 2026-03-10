<template>
  <view class="container">
    <view class="actions-bar">
      <view class="actions-left" v-if="mode === 'contract_out'">
        <button class="btn-rotate" @click="toggleOrientation">
          {{ isLandscape ? '取消横屏' : '全屏横向浏览' }}
        </button>
      </view>
      <button class="btn-export" @click="exportToImage">保存为图片</button>
    </view>
    
    <scroll-view scroll-y class="scroll-area">
      <!-- To be captured by canvas -->
      <view class="receipt-paper" id="receipt-box" ref="receiptBox">
        
        <!-- Header -->
        <view class="receipt-header">
          <text class="receipt-title">{{ receiptTitle }}</text>
          <text class="receipt-no">单号：{{ receiptData.code || '--' }}</text>
        </view>

        <!-- Meta Info -->
        <view class="meta-info">
          <!-- General slip meta info (Hide for contract_out, as it has custom layout) -->
          <view class="meta-row" v-if="mode !== 'contract_out'">
            <text class="meta-item">厂家：{{ receiptData.manufacturer_name || '--' }}</text>
            <text class="meta-item">日期：{{ formatShortDate(receiptData.create_time) }}</text>
          </view>
        </view>

        <!-- Contract Order Outbound Specific Layout (Horizontal) -->
        <view class="contract-horizontal-layout" v-if="mode === 'contract_out'">
             <!-- 顶部基本信息 -->
             <view class="co-header-row">
                 <view class="co-header-cell">合同编号：{{ receiptData.contract_code || '--' }}</view>
                 <view class="co-header-cell">出库厂家：{{ receiptData.manufacturer_name || '--' }}</view>
                 <view class="co-header-cell">产品：{{ receiptData.product_name || '--' }}</view>
                 <view class="co-header-cell">出库数量：{{ receiptData.quantity || 0 }}</view>
             </view>

             <!-- 产品物料实际用量 -->
             <view class="co-section">
                <view class="co-section-title">| 产品物料实际用量</view>
                <scroll-view scroll-x="true" class="table-scroll">
                    <view class="co-table-h">
                        <view class="ct-tr ct-header">
                            <view class="ct-td col-prod">产品</view>
                            <view class="ct-td col-qty">出库数量</view>
                            <view class="ct-td col-mats">
                                <view class="mats-title">物料明细</view>
                                <view class="mats-row">
                                    <view class="mat-cell" v-for="(item, index) in tableData" :key="'act-h'+index">
                                        {{ item.material_name }}
                                    </view>
                                </view>
                            </view>
                        </view>
                        <view class="ct-tr ct-body">
                            <view class="ct-td col-prod">{{ receiptData.product_name || '--' }}</view>
                            <view class="ct-td col-qty">{{ receiptData.quantity || 0 }}</view>
                            <view class="ct-td col-mats">
                                <view class="mats-row">
                                    <view class="mat-cell empty-write" v-for="(item, index) in tableData" :key="'act-v'+index">
                                        {{ formatQty((item.formula_qty || 0) * (receiptData.quantity || 0) * receiptData.quantity || 0) }}
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </scroll-view>
             </view>

             <!-- 产品配方 -->
             <view class="co-section" style="margin-top: 15px;">
                <view class="co-section-title">| 产品配方</view>
                <scroll-view scroll-x="true" class="table-scroll">
                    <view class="co-table-h">
                        <view class="ct-tr ct-header">
                            <view class="ct-td col-prod">产品</view>
                            <view class="ct-td col-mats">
                                <view class="mats-title">物料明细</view>
                                <view class="mats-row">
                                    <view class="mat-cell" v-for="(item, index) in tableData" :key="'theo-h'+index">
                                        {{ item.material_name }}
                                    </view>
                                </view>
                            </view>
                        </view>
                        <view class="ct-tr ct-body">
                            <view class="ct-td col-prod">{{ receiptData.product_name || '--' }}</view>
                            <view class="ct-td col-mats">
                                <view class="mats-row">
                                    <view class="mat-cell theo-val" v-for="(item, index) in tableData" :key="'theo-v'+index">
                                        {{ formatQty((item.formula_qty || 0) * (receiptData.quantity || 0)) }}
                                    </view>
                                </view>
                            </view>
                        </view>
                    </view>
                </scroll-view>
             </view>
        </view>

        <!-- Main Table: Formula / Details -->
        <view class="table-container" v-if="mode !== 'contract_out'">
          <view class="table-header">
            <text class="col-name">物料名称</text>
            <text class="col-spec">规格</text>
            <text class="col-formula" v-if="mode === 'contract_out'">单耗</text>
            <text class="col-qty">{{ getQtyHeader() }}</text>
            <text class="col-unit">单位</text>
            <text class="col-actual" v-if="mode === 'contract_out'">实际用量</text>
          </view>
          
          <view class="table-row" v-for="(item, index) in tableData" :key="index">
            <text class="col-name">{{ item.material_name }}</text>
            <text class="col-spec">{{ item.spec || '-' }}</text>
            <text class="col-formula num" v-if="mode === 'contract_out'">{{ item.formula_qty || '-' }}</text>
            <text class="col-qty num">{{ formatQty(item.calculated_qty || item.quantity) }}</text>
            <text class="col-unit">{{ item.unit || '-' }}</text>
            <text class="col-actual line" v-if="mode === 'contract_out'"></text>
          </view>
          
          <!-- Empty State -->
          <view class="table-row empty-row" v-if="tableData.length === 0">
              <text>无可显示明细</text>
          </view>
        </view>
        
        <view class="summary-row" v-if="mode !== 'contract_out' && tableData.length > 0">
             <text>合计总量：</text>
             <text class="num highlight">{{ formatQty(totalQuantity) }}</text>
        </view>

        <!-- Signatures -->
        <view class="signatures">
          <view class="sign-item">制单人：{{ receiptData.creator_name || '--' }}</view>
        </view>

        <view class="footer-note">
           生成时间：{{ currentTime }} · 内部单据，请妥善保管
        </view>
      </view>
    </scroll-view>
    
    <!-- 隐藏的画板用于生成海报 -->
    <l-painter 
      ref="painterRef" 
      :board="posterData" 
      isCanvasToTempFilePath 
      path-type="url"
      @success="onPainterSuccess" 
      @fail="onPainterFail" 
      custom-style="position: fixed; left: -9999px;" 
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import { supabase } from '@/utils/supabase';
import { 
    fetchContractOutboundSlip, 
    fetchGeneralOutboundSlip, 
    fetchGeneralInboundSlip,
    fetchContractInboundSlip 
} from '@/api/stockSlip';
import lPainter from 'lime-painter/components/l-painter/l-painter.vue';
import { generateContractOutPoster, generateGeneralReceiptPoster } from '@/utils/receiptPainter';

const mode = ref(''); // contract_out, general_out, general_in
const receiptId = ref('');
const receiptData = ref<any>({});
const tableData = ref<any[]>([]);

const currentTime = ref('');
const isLandscape = ref(false); // Track manual orientation state

const receiptTitle = computed(() => {
    switch(mode.value) {
        case 'contract_out': return '合同出库单';
        case 'general_out': return '通用出库单';
        case 'general_in': return '通用入库单';
        case 'contract_in': return '合同入库单';
        default: return '流转单';
    }
});

const getQtyHeader = () => {
    if (mode.value === 'contract_out') return '应耗量';
    if (mode.value === 'general_in' || mode.value === 'contract_in') return '入库量';
    return '出库量';
};

const totalQuantity = computed(() => {
     return tableData.value.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
});

onLoad((options: any) => {
    if (options.mode && options.id) {
        mode.value = options.mode;
        receiptId.value = options.id;
        currentTime.value = new Date().toLocaleString('zh-CN', { hour12: false });
        
        // 默认不强制横屏，只在用户手动点击后切换
        if (typeof (uni as any).setPageOrientation === 'function') {
            (uni as any).setPageOrientation({ orientation: 'portrait' });
        }
        
        loadData();
    } else {
        uni.showToast({ title: '参数错误', icon: 'none' });
    }
});

const loadData = async () => {
    uni.showLoading({ title: '加载凭证中...' });
    
    try {
        if (mode.value === 'contract_out') {
            await loadContractOutbound();
        } else if (mode.value === 'general_out') {
            await loadGeneralOutbound();
        } else if (mode.value === 'general_in') {
            await loadGeneralInbound();
        } else if (mode.value === 'contract_in') {
            await loadContractInbound();
        }
    } catch (e: any) {
        uni.showToast({ title: '读取失败: ' + e.message, icon: 'none' });
    } finally {
        uni.hideLoading();
    }
};

const loadContractOutbound = async () => {
    try {
        const { receipt, items } = await fetchContractOutboundSlip(receiptId.value);
        receiptData.value = receipt;
        tableData.value = items;
    } catch (e: any) {
        throw new Error('加载合同出库单失败: ' + e.message);
    }
};

const loadContractInbound = async () => {
    try {
        const { receipt, items } = await fetchContractInboundSlip(receiptId.value);
        receiptData.value = receipt;
        tableData.value = items;
    } catch (e: any) {
        throw new Error('加载合同入库单失败: ' + e.message);
    }
};

const loadGeneralOutbound = async () => {
    try {
        const { receipt, items } = await fetchGeneralOutboundSlip(receiptId.value);
        receiptData.value = receipt;
        tableData.value = items;
    } catch (e) {
        console.error('Error loading general outbound receipt:', e);
        uni.showToast({ title: '单据加载失败', icon: 'none' });
        throw e;
    }
};

const loadGeneralInbound = async () => {
    try {
        const { receipt, items } = await fetchGeneralInboundSlip(receiptId.value);
        receiptData.value = receipt;
        tableData.value = items;
    } catch (e) {
        console.error('Error loading general inbound receipt:', e);
        uni.showToast({ title: '单据加载失败', icon: 'none' });
        throw e;
    }
};


// Utilities for formatting
const formatShortDate = (iso: string) => {
    if (!iso) return '';
    return iso.split('T')[0]; // simple YYYY-MM-DD
};
const formatQty = (val: number) => {
    if (val === undefined || isNaN(val)) return '0.00';
    return Number(val).toFixed(2);
};


// 切换横竖屏 (Toggle Orientation)
const toggleOrientation = () => {
    isLandscape.value = !isLandscape.value;
    if (typeof (uni as any).setPageOrientation === 'function') {
        (uni as any).setPageOrientation({ 
            orientation: isLandscape.value ? 'landscape' : 'portrait' 
        });
    } else {
        uni.showToast({ title: '当前设备不支持动态旋转屏幕', icon: 'none' });
    }
};

// 导出为图片 (Export to Image)
const painterRef = ref();
const posterData = ref<any>({});
const isGenerating = ref(false);

const exportToImage = () => {
    if (isGenerating.value) return;
    
    // 支持所有类型单据导出
    
    isGenerating.value = true;
    uni.showLoading({ title: '清理缓存并准备...', mask: true });
    
    // 清除可能存在的旧海报缓存，防止超出微信存储上限
    // 微信小程序中 getFileSystemManager() 可用
    try {
        // @ts-ignore
        const _wx = typeof wx !== 'undefined' ? (wx as any) : undefined;
        if (_wx && _wx.getFileSystemManager) {
            const fs = _wx.getFileSystemManager();
            const tempDirPath = `${_wx.env.USER_DATA_PATH}`;
            try {
                const files = fs.readdirSync(tempDirPath);
                files.forEach((file: string) => {
                    // 清理 .png, .jpg, .jpeg 等后缀缓存文件
                    if (file.endsWith('.png') || file.endsWith('.jpg') || file.endsWith('.jpeg') || file.includes('tmp_')) {
                        try {
                            fs.unlinkSync(`${tempDirPath}/${file}`);
                            console.log('Cleared cache file:', file);
                        } catch (err) {
                            console.warn('Failed to delete cache file:', file, err);
                        }
                    }
                });
            } catch (err) {
                console.warn('Failed to read temp directory:', err);
            }
        }
    } catch (e) {
        console.warn('Cache clear fail:', e);
    }
    
    uni.showLoading({ title: '渲染图片中...', mask: true });
    
    try {
        // 构建海报 Schema 数据
        let newData: any;
        if (mode.value === 'contract_out') {
            newData = generateContractOutPoster(receiptData.value, tableData.value);
        } else {
            newData = generateGeneralReceiptPoster(receiptData.value, tableData.value, receiptTitle.value, getQtyHeader());
        }

        if (JSON.stringify(newData) === JSON.stringify(posterData.value)) {
            // 如果数据没变，l-painter 不会重新触发 @success, 我们必须手动让它再次渲染并走一遍生成流程
            painterRef.value && painterRef.value.render(newData);
        } else {
            posterData.value = newData;
        }
        
        // 加入一个强制超时机制，防止一直转圈
        setTimeout(() => {
            if (isGenerating.value) {
                isGenerating.value = false;
                uni.hideLoading();
                uni.showToast({ title: '图片生成超时，请重试', icon: 'none' });
            }
        }, 8000);
    } catch (e) {
        uni.hideLoading();
        uni.showToast({ title: '海报构建失败', icon: 'none' });
        isGenerating.value = false;
        console.error(e);
    }
};

const onPainterSuccess = (tempFilePath: string) => {
    isGenerating.value = false;
    uni.hideLoading();

    // 尝试保存到相册
    uni.saveImageToPhotosAlbum({
        filePath: tempFilePath,
        success: () => {
            uni.showToast({ title: '已保存至相册', icon: 'success' });
        },
        fail: (err) => {
            console.error('Save Album Fail:', err);
            // 失败时，主动去查一下是不是没给权限
            uni.getSetting({
                success(res) {
                    if (!res.authSetting['scope.writePhotosAlbum']) {
                        uni.showModal({
                            title: '保存失败',
                            content: '您拒绝了相册授权，是否前去开启？',
                            success(modalRes) {
                                if (modalRes.confirm) {
                                    uni.openSetting();
                                }
                            }
                        });
                    } else {
                        uni.showToast({ title: '保存失败，请重试', icon: 'none' });
                    }
                }
            });
        }
    });
};

const onPainterFail = (err: any) => {
    uni.hideLoading();
    isGenerating.value = false;
    uni.showToast({ title: '绘制图片错误', icon: 'none' });
    console.error('l-painter Render Fail:', err);
};
</script>

<style lang="scss">
.container {
  min-height: 100vh;
  background-color: #f0f2f5;
  display: flex;
  flex-direction: column;
}

.actions-bar {
  padding: 20rpx 30rpx;
  background: #fff;
  border-bottom: 1px solid #ddd;
  display: flex;
  justify-content: space-between; // Space out left actions and right export button
  align-items: center;
  
  .actions-left {
      display: flex;
      gap: 20rpx;
      
      .btn-rotate {
          background: #f0f2f5;
          color: #333;
          font-size: 28rpx;
          margin: 0;
          border-radius: 8rpx;
          height: 64rpx;
          line-height: 64rpx;
          border: 1px solid #ddd;
          
          &::after {
              border: none;
          }
      }
  }
  
  .btn-export {
      background: #6739b6;
      color: #fff;
      font-size: 28rpx;
      margin: 0 0 0 auto;
      border-radius: 8rpx;
      height: 64rpx;
      line-height: 64rpx;
  }
}

// 模拟纸质单据
.receipt-paper {
  background-color: #fff;
  padding: 50rpx 40rpx;
  border-radius: 4rpx;
  box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.05);
  position: relative;
  
  // 水印质感
  background-image: radial-gradient(#f9f9f9 1px, transparent 1px);
  background-size: 40rpx 40rpx;
}

// Ensure the container handles paper overflow gracefully
.scroll-area {
  flex: 1;
  padding: 30rpx;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: auto;
}

.receipt-header {
  text-align: center;
  margin-bottom: 10rpx;
  padding-bottom: 10rpx;
  
  .receipt-title {
      display: block;
      font-size: 44rpx;
      font-weight: bold;
      color: #c92a2a; // 经典的单据红抬头
      margin: 10rpx 0;
      letter-spacing: 1px;
  }
  
  .receipt-no {
      display: block;
      font-size: 24rpx;
      color: #333;
      font-family: monospace;
  }
}

.meta-info {
    margin-bottom: 40rpx;
    font-size: 26rpx;
    color: #333;
    
    .meta-row {
        display: flex;
        margin-bottom: 16rpx;
        
        .meta-item {
            flex: 1;
        }
    }
}

// 横向平铺合同单布局 
.contract-horizontal-layout {
    font-size: 22rpx;
    margin-bottom: 40rpx;

    .co-header-row {
        display: flex;
        flex-wrap: wrap; // Allow header info to wrap instead of squishing
        color: #333;
        border-top: 1px solid #333;
        border-bottom: 1px solid #333;
        padding: 10rpx 0;
        margin-bottom: 30rpx;
        
        .co-header-cell {
            padding: 10rpx 30rpx;
            white-space: nowrap; // Keep label and value together
        }
    }

    .co-section {
        .co-section-title {
            padding: 8rpx 0;
            margin-bottom: 4rpx;
            color: #333;
        }
    }

    .table-scroll {
        width: 100%;
        white-space: nowrap; // Essential for scroll-x container
    }

    .co-table-h {
        display: inline-flex; // Expand based on content width
        flex-direction: column;
        min-width: 100%;
        border-top: 1px solid #333;
        border-left: 1px solid #333;
        
        .ct-tr {
            display: flex;
            border-bottom: 1px solid #333;
            align-items: stretch;
            text-align: center;
            width: 100%;
            
            &.ct-header {
                font-weight: bold;
            }
        }
        
        .ct-td {
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-right: 1px solid #333;
            flex-shrink: 0; // Prevent squash
        }
        
        .col-prod { width: 160rpx; padding: 8rpx; flex-shrink: 0; }
        .col-qty { width: 160rpx; padding: 8rpx; flex-shrink: 0; }
        .col-mats { 
            display: flex;
            flex-direction: column;
            padding: 0; 
            flex-shrink: 0;
            flex-grow: 1; // Stretch to fill remaining width
            
            .mats-title {
                border-bottom: 1px solid #333;
                padding: 8rpx;
            }
            .mats-row {
                display: flex;
                flex-wrap: nowrap;
                flex: 1;
                
                .mat-cell {
                    flex-shrink: 0;
                    flex-grow: 1; // Grow proportionally if needed
                    padding: 16rpx 20rpx;
                    border-right: 1px solid #333;
                    min-width: 180rpx; // Provide a larger, uniform minimum width
                    width: 180rpx; // Fix the width to ensure alignment between header and body
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    white-space: nowrap; // Force horizontal growth
                    
                    &:last-child {
                        border-right: none;
                    }
                    
                    &.empty-write {
                        min-height: 50rpx;
                    }
                    
                    &.flex-fill {
                        flex-grow: 3; // Take up significantly more remaining space
                        width: auto; // Override the fixed width to allow expansion
                        min-width: 240rpx;
                    }
                }
            }
        }
    }
}

// 表格系统
.table-container {
    border: 1px solid #333;
    border-bottom: none;
    margin-bottom: 20rpx;
    font-size: 24rpx;
}

.table-header {
    display: flex;
    background-color: #f7f7f7;
    font-weight: bold;
    border-bottom: 1px solid #333;
    text-align: center;
}

.table-row {
    display: flex;
    border-bottom: 1px solid #333;
    align-items: stretch;
    min-height: 60rpx;
    
    &.empty-row {
        justify-content: center;
        align-items: center;
        color: #999;
        height: 120rpx;
    }
}

.col-name { flex: 3; padding: 12rpx; border-right: 1px solid #333; display: flex; align-items: center; }
.col-spec { flex: 2; padding: 12rpx; border-right: 1px solid #333; display: flex; align-items: center; justify-content: center; font-size: 22rpx;}
.col-formula { flex: 1.5; padding: 12rpx; border-right: 1px solid #333; display: flex; align-items: center; justify-content: center; }
.col-qty { flex: 2; padding: 12rpx; border-right: 1px solid #333; display: flex; align-items: center; justify-content: flex-end; }
.col-unit { flex: 1.5; padding: 12rpx; display: flex; align-items: center; justify-content: center;}
// Special border right if followed by actual
.table-header .col-unit, .table-row .col-unit {
    border-right: 1px solid #333;
    &:last-child { border-right: none; }
}

.col-actual {
     flex: 2; padding: 12rpx; display: flex; align-items: center; justify-content: center;
     &.line {
         position: relative;
         &::after {
             content: '';
             position: absolute;
             bottom: 12rpx;
             left: 10%;
             width: 80%;
             border-bottom: 1px dashed #666;
         }
     }
}

.num {
    font-family: monospace;
    font-weight: bold;
}

.summary-row {
    font-size: 26rpx;
    text-align: right;
    padding-right: 30rpx;
    margin-bottom: 50rpx;
    
    .highlight {
        font-size: 30rpx;
        color: #c92a2a;
        margin-left: 10rpx;
        font-weight: bold;
    }
}

.signatures {
    display: flex;
    flex-wrap: wrap;
    margin-top: 60rpx;
    font-size: 26rpx;
    gap: 30rpx;
    
    .sign-item {
        width: 45%;
        margin-bottom: 30rpx;
    }
}

.footer-note {
    margin-top: 60rpx;
    font-size: 20rpx;
    color: #999;
    text-align: center;
    border-top: 1px dashed #eee;
    padding-top: 20rpx;
}
</style>
