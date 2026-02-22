<template>
  <view class="container">
    <!-- Header Background -->
    <view class="header-bg"></view>
    
    <!-- Dashboard Content -->
    <view class="dashboard-content">
      <!-- Top Stats -->
      <view class="stats-section">
         <view class="stat-card glass">
             <view class="stat-icon-wrapper blue">
                 <text class="iconfont icon-kucun"></text>
             </view>
             <view class="stat-info">
                 <text class="stat-value">{{ totalStock }}</text>
                 <text class="stat-label">库存总量</text>
             </view>
         </view>
         <view class="stat-card glass">
             <view class="stat-icon-wrapper red">
                 <text class="iconfont icon-warning"></text>
             </view>
             <view class="stat-info">
                 <text class="stat-value">{{ lowStockCount }}</text>
                 <text class="stat-label">库存预警</text>
             </view>
         </view>
      </view>

      <!-- Quick Actions (Grid) -->
      <view class="action-grid">
          <view class="action-item" @click="navTo('/pages/purchase/list')">
              <view class="action-icon purple-gradient">
                  <text class="iconfont icon-order"></text>
              </view>
              <text class="action-text">采购管理</text>
          </view>
          <view class="action-item" @click="navTo('/pages/stock-out/list')">
              <view class="action-icon orange-gradient">
                  <text class="iconfont icon-out"></text>
              </view>
              <text class="action-text">出库管理</text>
          </view>
          <view class="action-item" @click="navTo('/pages/stock-in/list')">
              <view class="action-icon blue-gradient">
                  <text class="iconfont icon-in"></text>
              </view>
              <text class="action-text">入库管理</text>
          </view>
      </view>

      <!-- Search Bar -->
      <view class="search-section">
        <view class="search-box">
          <text class="iconfont icon-search"></text>
          <input 
            class="search-input" 
            type="text" 
            v-model="keyword" 
            placeholder="搜索物料名称..." 
            placeholder-style="color: #999;"
            @confirm="handleSearch"
          />
          <view v-if="keyword" class="clear-btn" @click="clearSearch">
              <text class="iconfont icon-close"></text>
          </view>
        </view>
      </view>

      <!-- Stock List -->
      <view class="section-title">
          <text>当前库存</text>
          <text class="count" v-if="stockList.length">({{ stockList.length }})</text>
      </view>
      
      <view class="list-container">
        <view 
          class="stock-card" 
          v-for="(item, index) in stockList" 
          :key="item.id"
          @click="showDetail(item)"
        >
          <view class="card-left">
              <view class="item-icon">
                  <text class="char">{{ item.material_name.charAt(0) }}</text>
              </view>
              <view class="item-info">
                  <text class="name">{{ item.material_name }}</text>
                  <text class="sub-info">{{ item.manufacturer_name }} | {{ item.spec || '无规格' }}</text>
              </view>
          </view>
          <view class="card-right">
              <text class="qty" :class="{ 'low': item.quantity < 10 }">{{ item.quantity }}</text>
              <text class="unit">{{ item.unit }}</text>
          </view>
          
          <!-- Low Stock Tag -->
          <view class="tag-low" v-if="item.quantity < 10">补货</view>
        </view>
        
        <view v-if="stockList.length === 0 && !loading" class="empty-state">
          <image src="/static/empty.png" mode="aspectFit" class="empty-img"></image>
          <text>暂无库存数据</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { supabase } from '@/utils/supabase';
import { onShow } from '@dcloudio/uni-app';

interface StockItem {
    id: string;
    material_name: string;
    spec: string;
    unit: string;
    manufacturer_name: string;
    quantity: number;
}

const stockList = ref<StockItem[]>([]);
const keyword = ref('');
const loading = ref(false);

const totalStock = computed(() => {
    return stockList.value.reduce((sum, item) => sum + Number(item.quantity), 0);
});

const lowStockCount = computed(() => {
    return stockList.value.filter(item => item.quantity < 10).length;
});

const fetchData = async () => {
    loading.value = true;
    
    let query = supabase
        .from('stock')
        .select(`
            id, quantity,
            material:material_id(name, unit),
            manufacturer:manufacturer_id(name)
        `)
        .order('quantity', { ascending: true }); // Low stock first

    // Note: Search on joined table fields is tricky in Supabase basic client without views/RPC or intricate filtering.
    // We'll filter client-side for simple keyword matching if dataset is small.
    
    const { data, error } = await query;
    
    if (error) {
        console.error('Error fetching stock:', error);
        loading.value = false;
        return;
    }
    
    // Transform
    const rawList = data.map(item => ({
        id: item.id,
        // @ts-ignore
        material_name: item.material?.name || '未知物料',
        // @ts-ignore
        spec: '', // Spec might not be in material table directly
        // @ts-ignore
        unit: item.material?.unit || '个',
        // @ts-ignore
        manufacturer_name: item.manufacturer?.name || '未知厂家',
        quantity: item.quantity
    }));

    // Client-side Filter
    if (keyword.value) {
        stockList.value = rawList.filter(item => item.material_name.includes(keyword.value));
    } else {
        stockList.value = rawList;
    }
    
    loading.value = false;
};

const handleSearch = () => {
    fetchData();
};

const clearSearch = () => {
    keyword.value = '';
    fetchData();
};

const navTo = (url: string) => {
    uni.navigateTo({ url });
};

const showDetail = (item: StockItem) => {
    // Future: navigate to detail or show popup
    console.log('Stock Detail:', item);
};

onShow(async () => {
    uni.showLoading({ title: '加载中...', mask: true });
    try {
        await fetchData();
    } finally {
        uni.hideLoading();
    }
});
</script>

<style lang="scss">
page {
    background-color: #f5f7fa;
}

.container {
  min-height: 100vh;
  position: relative;
  padding-bottom: 30px;
}

.header-bg {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 220px;
    background: linear-gradient(135deg, #6739b6 0%, #8e5ce6 100%);
    border-bottom-left-radius: 30px;
    border-bottom-right-radius: 30px;
    z-index: 0;
}

.dashboard-content {
    position: relative;
    z-index: 1;
    padding: 20px;
}

/* Stats Section */
.stats-section {
    display: flex;
    justify-content: space-between;
    margin-top: 10px;
    margin-bottom: 25px;
    gap: 15px;
}

.stat-card {
    flex: 1;
    border-radius: 16px;
    padding: 16px;
    display: flex;
    align-items: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    
    &.glass {
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
    }

    .stat-icon-wrapper {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 12px;
        
        &.blue { background: rgba(24, 144, 255, 0.1); color: #1890ff; }
        &.red { background: rgba(255, 77, 79, 0.1); color: #ff4d4f; }
        
        .iconfont { font-size: 22px; }
    }
    
    .stat-info {
        display: flex;
        flex-direction: column;
    }
    
    .stat-value {
        font-size: 20px;
        font-weight: 700;
        color: #333;
        line-height: 1.2;
    }
    
    .stat-label {
        font-size: 12px;
        color: #666;
        margin-top: 2px;
    }
}

/* Action Grid */
.action-grid {
    display: flex;
    justify-content: space-between;
    background: #fff;
    padding: 20px 10px;
    border-radius: 16px;
    margin-bottom: 25px;
    box-shadow: 0 4px 20px rgba(0,0,0,0.04);
}

.action-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    flex: 1;
    
    .action-icon {
        width: 48px;
        height: 48px;
        border-radius: 14px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 8px;
        box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        
        .iconfont { 
            font-size: 24px; 
            color: #fff;
        }
        
        &.purple-gradient { background: linear-gradient(135deg, #b37feb, #722ed1); }
        &.orange-gradient { background: linear-gradient(135deg, #ffa940, #fa8c16); }
        &.blue-gradient { background: linear-gradient(135deg, #69c0ff, #1890ff); }
        &.green-gradient { background: linear-gradient(135deg, #95de64, #52c41a); }
    }
    
    .action-text {
        font-size: 12px;
        color: #333;
        font-weight: 500;
    }
    
    &:active { opacity: 0.8; transform: scale(0.98); }
}

/* Search */
.search-section {
    margin-bottom: 20px;
}

.search-box {
    background: #fff;
    height: 46px;
    border-radius: 23px;
    display: flex;
    align-items: center;
    padding: 0 15px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    border: 1px solid rgba(0,0,0,0.02);
    
    .iconfont {
        color: #999;
        font-size: 18px;
        margin-right: 8px;
    }
    
    .search-input {
        flex: 1;
        font-size: 14px;
        height: 100%;
    }
    
    .clear-btn {
        padding: 5px;
        .iconfont { margin-right: 0; font-size: 16px; color: #ccc; }
    }
}

/* Stock List */
.section-title {
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 12px;
    display: flex;
    align-items: center;
    
    .count {
        font-size: 14px;
        color: #999;
        font-weight: normal;
        margin-left: 6px;
    }
}

.list-container {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.stock-card {
    background: #fff;
    border-radius: 12px;
    padding: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    position: relative;
    overflow: hidden;
    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
    transition: all 0.2s;
    
    &:active {
        background-color: #fafafa;
    }

    .card-left {
        display: flex;
        align-items: center;
        flex: 1;
        
        .item-icon {
            width: 40px;
            height: 40px;
            background: #f0f0f0;
            border-radius: 10px;
            display: flex;
            justify-content: center;
            align-items: center;
            margin-right: 12px;
            
            .char {
                font-size: 18px;
                font-weight: bold;
                color: #666;
            }
        }
        
        .item-info {
            display: flex;
            flex-direction: column;
            
            .name {
                font-size: 15px;
                font-weight: 600;
                color: #333;
                margin-bottom: 4px;
            }
            .sub-info {
                font-size: 12px;
                color: #999;
            }
        }
    }
    
    .card-right {
        text-align: right;
        min-width: 60px;
        
        .qty {
            display: block;
            font-size: 18px;
            font-weight: bold;
            color: #333;
            
            &.low { color: #ff4d4f; }
        }
        .unit {
            font-size: 12px;
            color: #999;
        }
    }
    
    .tag-low {
        position: absolute;
        top: 0;
        right: 0;
        background: #ff4d4f;
        color: #fff;
        font-size: 10px;
        padding: 2px 6px;
        border-bottom-left-radius: 8px;
    }
}

.empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 0;
    
    .empty-img {
        width: 120px;
        height: 120px;
        margin-bottom: 15px;
        opacity: 0.5;
    }
    
    text {
        color: #999;
        font-size: 14px;
    }
}
</style>
