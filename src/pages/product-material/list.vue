<template>
  <view class="container">
    <view class="sidebar">
        <view 
            class="product-item" 
            :class="{ active: currentProductId === item.id }"
            v-for="item in productList" 
            :key="item.id"
            @click="handleProductSelect(item)"
        >
            <text>{{ item.name }}</text>
        </view>
    </view>
    
    <view class="main-content">
        <view class="header" v-if="currentProduct">
            <text class="title">{{ currentProduct.name }} - 配方</text>
            <view class="actions">
                <button class="btn-save" @click="handleSave" :disabled="loading">保存配方</button>
            </view>
        </view>
        <view class="empty-tip" v-else>
            请选择左侧产品进行配方配置
        </view>
        
        <scroll-view scroll-y class="list-area" v-if="currentProduct">
             <view class="list-item" v-for="m in materialList" :key="m.id">
                 <view class="item-left" @click="toggle(m.id)">
                     <checkbox :value="m.id" :checked="isChecked(m.id)" color="#6739b6" />
                     <view class="item-info">
                         <text class="item-name">{{ m.name }}</text>
                         <text class="item-spec" v-if="m.spec">{{ m.spec }}</text>
                     </view>
                 </view>
                 <view class="item-right" v-if="isChecked(m.id)">
                     <input 
                         class="qty-input" 
                         type="digit" 
                         :value="getQuantity(m.id)"
                         @input="setQuantity(m.id, $event)"
                         placeholder="用量"
                     />
                     <text class="unit">{{ m.unit || '' }}</text>
                 </view>
             </view>
        </scroll-view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { supabase } from '@/utils/supabase';

interface ProductItem {
    id: string;
    name: string;
    code: string;
    unit: string;
}

interface MaterialItem {
    id: string;
    name: string;
    code: string;
    unit?: string;
    spec?: string;
}

interface RelaItem {
    material_id: string;
    quantity: string;
}

const productList = ref<ProductItem[]>([]);
const materialList = ref<MaterialItem[]>([]);
const currentProduct = ref<ProductItem | null>(null);
const currentProductId = ref('');
// Map: material_id -> quantity string
const selectedMap = ref<Map<string, string>>(new Map());
const loading = ref(false);

onShow(() => {
    loadProducts();
    loadMaterials();
});

const loadProducts = async () => {
    const { data } = await supabase.from('product').select('id, name, code, unit').order('create_time');
    if (data) productList.value = data;
};

const loadMaterials = async () => {
    const { data } = await supabase.from('material').select('id, name, code, unit, spec').order('create_time');
    if (data) materialList.value = data;
};

const handleProductSelect = async (product: ProductItem) => {
    if (currentProductId.value === product.id) return;
    currentProductId.value = product.id;
    currentProduct.value = product;
    await loadRelations(product.id);
};

const loadRelations = async (productId: string) => {
    uni.showLoading({ title: '加载中' });
    const { data } = await supabase
        .from('product_material_rela')
        .select('material_id, quantity')
        .eq('product_id', productId);
        
    uni.hideLoading();
    
    const map = new Map<string, string>();
    if (data) {
        data.forEach((item: RelaItem) => {
            map.set(item.material_id, String(item.quantity));
        });
    }
    selectedMap.value = map;
};

const isChecked = (materialId: string) => {
    return selectedMap.value.has(materialId);
};

const toggle = (materialId: string) => {
    const newMap = new Map(selectedMap.value);
    if (newMap.has(materialId)) {
        newMap.delete(materialId);
    } else {
        newMap.set(materialId, '1'); // 默认用量 1
    }
    selectedMap.value = newMap;
};

const getQuantity = (materialId: string) => {
    return selectedMap.value.get(materialId) || '';
};

const setQuantity = (materialId: string, e: any) => {
    const newMap = new Map(selectedMap.value);
    newMap.set(materialId, e.detail.value);
    selectedMap.value = newMap;
};

const handleSave = async () => {
    if (!currentProductId.value) return;

    // 校验用量
    for (const [mid, qty] of selectedMap.value.entries()) {
        if (!qty || parseFloat(qty) <= 0) {
            const mat = materialList.value.find(m => m.id === mid);
            return uni.showToast({ title: `请输入 ${mat?.name || '物料'} 的有效用量`, icon: 'none' });
        }
    }
    
    loading.value = true;
    uni.showLoading({ title: '保存中' });
    
    // 1. Delete existing relations
    const { error: delError } = await supabase
        .from('product_material_rela')
        .delete()
        .eq('product_id', currentProductId.value);
        
    if (delError) {
        uni.hideLoading();
        loading.value = false;
        return uni.showToast({ title: '保存失败: ' + delError.message, icon: 'none' });
    }
    
    // 2. Insert new relations
    if (selectedMap.value.size > 0) {
        const rows = Array.from(selectedMap.value.entries()).map(([mid, qty]) => ({
            product_id: currentProductId.value,
            material_id: mid,
            quantity: parseFloat(qty)
        }));
        
        const { error: insError } = await supabase
            .from('product_material_rela')
            .insert(rows);
            
        if (insError) {
             uni.hideLoading();
             loading.value = false;
             return uni.showToast({ title: '保存失败: ' + insError.message, icon: 'none' });
        }
    }
    
    uni.hideLoading();
    loading.value = false;
    uni.showToast({ title: '保存成功', icon: 'success' });
};
</script>

<style lang="scss">
.container {
  height: 100vh;
  display: flex;
  background-color: #f5f7fa;
}

.sidebar {
    width: 100px;
    background: #fff;
    border-right: 1px solid #eee;
    height: 100%;
    overflow-y: auto;
    
    .product-item {
        padding: 15px 10px;
        text-align: center;
        font-size: 14px;
        color: #333;
        border-bottom: 1px solid #f9f9f9;
        
        &.active {
            background-color: #f0ebfa;
            color: #6739b6;
            border-left: 3px solid #6739b6;
            font-weight: bold;
        }
    }
}

.main-content {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    
    .header {
        padding: 15px;
        background: #fff;
        border-bottom: 1px solid #eee;
        display: flex;
        justify-content: space-between;
        align-items: center;
        
        .title { font-weight: bold; font-size: 16px; }
        
        .btn-save {
            font-size: 12px;
            background: #6739b6;
            color: #fff;
            padding: 0 15px;
            height: 30px;
            line-height: 30px;
        }
    }
    
    .empty-tip {
        flex: 1;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #999;
    }
    
    .list-area {
        flex: 1;
        overflow-y: auto;
        padding: 15px;
        
        .list-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #fff;
            padding: 12px 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            
            .item-left {
                display: flex;
                align-items: center;
                flex: 1;
                
                .item-info {
                    margin-left: 10px;
                    
                    .item-name {
                        font-size: 15px;
                        color: #333;
                        display: block;
                    }
                    .item-spec {
                        font-size: 12px;
                        color: #999;
                        margin-top: 2px;
                        display: block;
                    }
                }
            }
            
            .item-right {
                display: flex;
                align-items: center;
                
                .qty-input {
                    width: 70px;
                    height: 32px;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    text-align: center;
                    font-size: 14px;
                    color: #333;
                }
                
                .unit {
                    margin-left: 5px;
                    font-size: 12px;
                    color: #999;
                    min-width: 20px;
                }
            }
        }
    }
}
</style>
