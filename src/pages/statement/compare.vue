<template>
  <view class="container">
    <view class="header-section">
      <view class="title">对账与入库比对</view>
      <view class="subtitle">请核对所有该时段内的产品的数量是否平衡</view>
    </view>

    <view v-if="loading" class="loading-state">
      <text>加载比对数据中...</text>
    </view>
    
    <view v-else class="comparison-list">
      <view v-for="item in comparisonData" :key="item.productId" class="compare-card">
        <view class="card-header">
          <text class="product-name">{{ item.productName }}</text>
          <text class="status-badge" :class="item.diff === 0 ? 'success' : 'error'">
            {{ item.diff === 0 ? '平衡' : '有差异' }}
          </text>
        </view>
        <view class="card-content">
          <view class="col">
            <text class="label">对账单需结算</text>
            <text class="value">{{ item.statementQty }}</text>
          </view>
          <view class="vs">VS</view>
          <view class="col">
            <text class="label">实际已入库</text>
            <text class="value">{{ item.stockInQty }}</text>
          </view>
        </view>
        <view class="card-footer" v-if="item.diff !== 0">
          <text class="diff-text">差额: {{ item.diff > 0 ? '+' : '' }}{{ item.diff }} {{ item.unit }}</text>
        </view>
      </view>
      
      <view v-if="comparisonData.length === 0" class="empty-state">
        暂无明细数据可比对
      </view>
    </view>

    <view class="action-footer">
      <button class="btn btn-secondary" @click="goBack">返回修改</button>
      <button class="btn btn-primary" :disabled="hasDiff || isConfirming || loading" @click="confirmStatement">
        确认无误
      </button>
    </view>
    
    <view v-if="hasDiff" class="error-tip">
      存在未平衡的物资明细被拦截。<br/>请返回对账单或前往补录对应的入库单解决差值后再试。
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onLoad } from '@dcloudio/uni-app';

const statementId = ref('');
const loading = ref(true);
const isConfirming = ref(false);

interface CompareItem {
  productId: string;
  productName: string;
  unit: string;
  statementQty: number;
  stockInQty: number;
  diff: number;
}

const comparisonData = ref<CompareItem[]>([]);

onLoad(async (options: any) => {
  if (options.id) {
    statementId.value = options.id;
    await fetchData();
  }
});

const fetchData = async () => {
  loading.value = true;
  try {
    // 1. 获取对账单信息
    const { data: statement, error: stmtError } = await supabase
      .from('statement')
      .select('*')
      .eq('id', statementId.value)
      .single();
      
    if (stmtError || !statement) throw new Error('无法获取对账单数据');

    // 2. 获取对账单物资明细要求列表
    const { data: materials } = await supabase
      .from('statement_material_detail')
      .select('product_id, quantity, product:product_id(name, unit)')
      .eq('statement_id', statementId.value);

    // 3. 获取对应的该周期合同订单入库记录
    const { data: stockIns, error: stockInErr } = await supabase
      .from('contract_order_stock_in')
      .select('quantity, contract_order!inner(contract_id, product_id)')
      .eq('contract_order.contract_id', statement.contract_id)
      .gte('inbound_date', statement.start_time)
      .lte('inbound_date', statement.end_time);

    if (stockInErr) console.error('fetch stock-in failed', stockInErr);

    // 4. 数据聚合对决
    const map = new Map<string, CompareItem>();

    // 取对账单要求数量
    if (materials) {
      materials.forEach(m => {
        const pId = m.product_id;
        const pObj = m.product as any;
        if (!map.has(pId)) {
          map.set(pId, {
            productId: pId,
            productName: pObj?.name || '未知产品',
            unit: pObj?.unit || '',
            statementQty: 0,
            stockInQty: 0,
            diff: 0
          });
        }
        map.get(pId)!.statementQty += Number(m.quantity || 0);
      });
    }

    // 取实际入库数量
    if (stockIns) {
      stockIns.forEach(s => {
        const co = s.contract_order as any;
        const pId = co.product_id;
        if (map.has(pId)) {
          map.get(pId)!.stockInQty += Number(s.quantity || 0);
        } else {
            // 在实际入库中存在，但并未放入对账单结算？
            // 我们也要作为不平衡项抛出来，防止漏记。但这需要额外知道 Product 的名字。
            // 严谨起见，直接在上面把所有的产品加入 mapping 中更稳。
            // 这里为了简化，我们仅把它注册为空白产品。
             map.set(pId, {
               productId: pId,
               productName: '漏填产品',
               unit: '',
               statementQty: 0,
               stockInQty: Number(s.quantity || 0),
               diff: 0
             });
        }
      });
    }

    // 第二段补全未查出名讳的产品的名字 (如果有漏记的情况)
    const missingProductIds = Array.from(map.values()).filter(x => x.productName === '漏填产品').map(x => x.productId);
    if (missingProductIds.length > 0) {
        const { data: pbData } = await supabase.from('product').select('id, name, unit').in('id', missingProductIds);
        if (pbData) {
            pbData.forEach(pb => {
               if(map.has(pb.id)) {
                  map.get(pb.id)!.productName = pb.name + ' (漏填对账)';
                  map.get(pb.id)!.unit = pb.unit;
               }
            });
        }
    }

    // 计算汇总差异
    const results: CompareItem[] = [];
    map.forEach(item => {
      // 差异为: 要求结算 - 实际收货。如果是 >0 代表多算钱了，<0 代表少记录了。
      item.diff = Number((item.statementQty - item.stockInQty).toFixed(4));
      results.push(item);
    });

    comparisonData.value = results;

  } catch (e: any) {
    uni.showToast({ title: e.message || '加载比对数据失败', icon: 'none' });
  } finally {
    loading.value = false;
  }
};

const hasDiff = computed(() => {
  return comparisonData.value.some(item => item.diff !== 0);
});

const goBack = () => {
  uni.navigateBack();
};

const confirmStatement = async () => {
    if (hasDiff.value) return;
    
    isConfirming.value = true;
    const { error } = await supabase.from('statement').update({ is_confirmed: true }).eq('id', statementId.value);
    isConfirming.value = false;
    
    if (!error) {
        uni.showToast({ title: '已确认通过', icon: 'success' });
        setTimeout(() => {
            // 返回上级详细页面之后，触发刷新
            uni.navigateBack();
        }, 1500);
    } else {
        const errMsg = error?.message || error?.details || (error as any)?.msg || '未知错误';
        uni.showToast({ title: '系统拦截或失败: ' + errMsg, icon: 'none' });
    }
};
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f7f8fA;
  padding: 30rpx;
  display: flex;
  flex-direction: column;
}

.header-section {
  margin-bottom: 40rpx;
  .title {
    font-size: 44rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 12rpx;
  }
  .subtitle {
    font-size: 28rpx;
    color: #999;
  }
}

.loading-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;
  color: #999;
  font-size: 28rpx;
}

.comparison-list {
  flex: 1;
}

.compare-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.04);
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 30rpx;
    padding-bottom: 20rpx;
    border-bottom: 1rpx solid #f5f5f5;
    
    .product-name {
      font-size: 32rpx;
      font-weight: 600;
      color: #333;
    }
    
    .status-badge {
      font-size: 24rpx;
      padding: 6rpx 16rpx;
      border-radius: 8rpx;
      font-weight: 500;
      
      &.success {
        background: rgba(#52c41a, 0.1);
        color: #52c41a;
      }
      
      &.error {
        background: rgba(#ff4d4f, 0.1);
        color: #ff4d4f;
      }
    }
  }
  
  .card-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    
    .col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      background: #fafafa;
      padding: 20rpx 0;
      border-radius: 12rpx;
      
      .label {
        font-size: 24rpx;
        color: #999;
        margin-bottom: 8rpx;
      }
      .value {
        font-size: 40rpx;
        font-weight: bold;
        color: #333;
      }
    }
    
    .vs {
      font-size: 28rpx;
      color: #d9d9d9;
      font-style: italic;
      font-weight: bold;
      margin: 0 20rpx;
    }
  }
  
  .card-footer {
    margin-top: 24rpx;
    padding-top: 24rpx;
    border-top: 1rpx dashed #f0f0f0;
    text-align: right;
    
    .diff-text {
      font-size: 28rpx;
      color: #ff4d4f;
      font-weight: bold;
    }
  }
}

.action-footer {
  margin-top: 40rpx;
  display: flex;
  gap: 20rpx;
  padding-bottom: env(safe-area-inset-bottom);
  
  .btn {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    font-size: 32rpx;
    border-radius: 44rpx;
    margin: 0;
    
    &::after {
      border: none;
    }
    
    &.btn-secondary {
      background: #f5f5f5;
      color: #666;
    }
    
    &.btn-primary {
      background: #7A51FA;
      color: #fff;
      font-weight: 500;
      
      &[disabled] {
        background: #e0e0e0;
        color: #fff;
      }
    }
  }
}

.error-tip {
  text-align: center;
  color: #ff4d4f;
  font-size: 24rpx;
  line-height: 1.5;
  margin-top: 20rpx;
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
