export const generateContractOutPoster = (receiptData: any, tableData: any[]) => {
    // 基础定义
    const posterWidth = 1000; // 海报宽度 px (横向宽比例)
    const padding = 20;

    const views: any[] = [];

    // --- 1. 标题区 ---
    views.push({
        type: 'text',
        text: '合同出库单',
        css: {
            display: 'block',
            width: `${posterWidth - padding * 2}px`,
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: '#B3261E',
            paddingTop: '20px',
            paddingBottom: '10px'
        }
    });

    views.push({
        type: 'text',
        text: `单号：${receiptData.code || '--'}`,
        css: {
            display: 'block',
            width: `${posterWidth - padding * 2}px`,
            textAlign: 'center',
            fontSize: '14px',
            color: '#333333',
            paddingBottom: '20px',
            borderBottom: '1px solid #333333'
        }
    });

    // --- 2. 基础信息区 ---
    views.push({
        type: 'view',
        css: {
            display: 'flex',
            flexDirection: 'row',
            width: `${posterWidth - padding * 2}px`,
            borderBottom: '1px solid #333333',
            paddingTop: '10px',
            paddingBottom: '10px',
            fontSize: '14px',
            color: '#333333'
        },
        views: [
            { type: 'text', text: `合同编号: ${receiptData?.contract_code || '--'}` },
            { type: 'text', text: `出库厂家: ${receiptData?.manufacturer_name || '--'}`, css: { marginLeft: '20px' } },
            { type: 'text', text: `产品: ${receiptData?.product_name || '--'}`, css: { marginLeft: '20px' } },
            { type: 'text', text: `出库数量: ${receiptData?.quantity || 0}`, css: { marginLeft: '20px' } }
        ]
    });

    // --- 3. 辅助函数: 生成表格行 ---
    const buildTableRow = (columns: any[], isHeader = false) => {
        return {
            type: 'view',
            css: {
                display: 'flex',
                flexDirection: 'row',
                width: `${posterWidth - padding * 2}px`,
                borderBottom: '1px solid #333333',
                minHeight: '40px'
            },
            views: columns.map((col, index) => ({
                type: 'view',
                css: {
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    width: col.width,
                    borderRight: index === columns.length - 1 ? '1px solid #333' : '1px solid #333',
                    borderLeft: index === 0 ? '1px solid #333' : 'none',
                    fontWeight: isHeader ? 'bold' : 'normal',
                    fontSize: '12px'
                },
                views: [{ type: 'text', text: col.text }]
            }))
        };
    };

    const buildTableHeaderTop = () => {
        return {
            type: 'view',
            css: {
                display: 'flex',
                flexDirection: 'row',
                width: `${posterWidth - padding * 2}px`,
                borderTop: '1px solid #333333',
            },
            views: []
        }
    };

    // --- 4. 实际用量 表格逻辑 ---
    views.push({
        type: 'text',
        text: '产品物料实际用量',
        css: {
            display: 'block',
            fontSize: '14px',
            color: '#333333',
            paddingTop: '30px',
            paddingBottom: '5px'
        }
    });

    // 动态列计算
    // 整体宽度 960 => 留出版心不被裁减
    const tableWidth = posterWidth - padding * 2;
    const baseColWidth = 120;
    const matAvailWidth = tableWidth - baseColWidth * 2; // = 720 (960 - 240)

    const dynamicMats = [...tableData];
    // --- 新增：动态自适应列宽计算辅助函数 ---
    const getColWeight = (title: string, val: string) => {
        const calcLen = (str: string) => {
            if (!str) return 0;
            let len = 0;
            for (let i = 0; i < str.length; i++) {
                if (str.charCodeAt(i) > 255) len += 2.2; // 中文大约占前端字宽排版2.2的比例
                else len += 1.1; // 英文数字略宽
            }
            return len;
        };
        // 设一个保底宽度权重 6
        return Math.max(calcLen(title), calcLen(val), 6);
    };

    const getColW = (i: number, isLast: boolean, availW: number, weights: number[]) => {
        const totalW = weights.reduce((a, b) => a + b, 0);
        if (isLast) {
            let used = 0;
            for (let j = 0; j < i; j++) used += Math.floor(availW * (weights[j] / totalW));
            return availW - used;
        }
        return Math.floor(availW * (weights[i] / totalW));
    };

    // 为第一张表计算权重数组
    const matWeights = dynamicMats.map(mat => {
        const valStr = (mat.formula_qty && receiptData.quantity) ? ((mat.formula_qty || 0) * receiptData.quantity).toFixed(2) : '';
        return getColWeight(mat.material_name, valStr);
    });

    // 实际用量表：统一大外框，内容项靠borderBottom/borderRight自行闭合
    views.push({
        type: 'view',
        css: {
            display: 'flex',
            flexDirection: 'column',
            width: `${tableWidth}px`,
            border: '1px solid #333',
            boxSizing: 'border-box'
        },
        views: [
            // 第一行表头
            {
                type: 'view',
                css: { display: 'flex', flexDirection: 'row', width: `${tableWidth}px`, borderBottom: '1px solid #333', boxSizing: 'border-box' },
                views: [
                    {
                        type: 'view', css: { width: `${baseColWidth}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' },
                        views: [{ type: 'text', text: '产品' }]
                    },
                    {
                        type: 'view', css: { width: `${baseColWidth}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' },
                        views: [{ type: 'text', text: '出库数量' }]
                    },
                    {
                        type: 'view',
                        css: { width: `${matAvailWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
                        views: [
                            {
                                type: 'view',
                                css: { height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #333', boxSizing: 'border-box', fontSize: '14px', fontWeight: 'bold' },
                                views: [{ type: 'text', text: '物料明细' }]
                            },
                            {
                                type: 'view',
                                css: { display: 'flex', flexDirection: 'row', height: '36px' },
                                views: dynamicMats.map((mat, i) => ({
                                    type: 'view',
                                    css: { width: `${getColW(i, i === dynamicMats.length - 1, matAvailWidth, matWeights)}px`, borderRight: i === dynamicMats.length - 1 ? 'none' : '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 5px', wordBreak: 'break-all' },
                                    views: [{ type: 'text', text: mat.material_name || '', css: { textAlign: 'center', maxLines: 2 } }]
                                }))
                            }
                        ]
                    }
                ]
            },
            // 数据行
            {
                type: 'view',
                css: { display: 'flex', flexDirection: 'row', width: `${tableWidth}px`, boxSizing: 'border-box' },
                views: [
                    {
                        type: 'view', css: { width: `${baseColWidth}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', minHeight: '50px' },
                        views: [{ type: 'text', text: receiptData.product_name || '--' }]
                    },
                    {
                        type: 'view', css: { width: `${baseColWidth}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px' },
                        views: [{ type: 'text', text: String(receiptData.quantity || 0) }]
                    },
                    {
                        type: 'view',
                        css: { width: `${matAvailWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'row' },
                        views: dynamicMats.map((mat, i) => {
                            const val = (mat.formula_qty && receiptData.quantity) ? ((mat.formula_qty || 0) * receiptData.quantity).toFixed(2) : '';
                            return {
                                type: 'view',
                                css: { width: `${getColW(i, i === dynamicMats.length - 1, matAvailWidth, matWeights)}px`, borderRight: i === dynamicMats.length - 1 ? 'none' : '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', padding: '0 5px' },
                                views: [{ type: 'text', text: val }]
                            };
                        })
                    }
                ]
            }
        ]
    });

    // --- 5. 产品配方 表格逻辑 ---
    views.push({
        type: 'text',
        text: '产品配方',
        css: {
            display: 'block',
            fontSize: '14px',
            color: '#333333',
            paddingTop: '30px',
            paddingBottom: '5px'
        }
    });

    const formulaAvailWidth = tableWidth - baseColWidth; // 左侧仅展示产品一栏
    const formulaMats = [...tableData];

    // 为第二张表计算权重数组
    const formulaWeights = formulaMats.map(mat => {
        const valStr = mat.formula_qty ? Number(mat.formula_qty).toFixed(2) : '';
        return getColWeight(mat.material_name, valStr);
    });

    // 产品配方表：统一大外框，单侧依赖
    views.push({
        type: 'view',
        css: {
            display: 'flex',
            flexDirection: 'column',
            width: `${tableWidth}px`,
            border: '1px solid #333',
            boxSizing: 'border-box'
        },
        views: [
            // 表头
            {
                type: 'view',
                css: { display: 'flex', flexDirection: 'row', width: `${tableWidth}px`, borderBottom: '1px solid #333', boxSizing: 'border-box' },
                views: [
                    {
                        type: 'view', css: { width: `${baseColWidth}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', fontWeight: 'bold' },
                        views: [{ type: 'text', text: '产品' }]
                    },
                    {
                        type: 'view',
                        css: { width: `${formulaAvailWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'column' },
                        views: [
                            {
                                type: 'view',
                                css: { height: '36px', display: 'flex', justifyContent: 'center', alignItems: 'center', borderBottom: '1px solid #333', boxSizing: 'border-box', fontSize: '14px', fontWeight: 'bold' },
                                views: [{ type: 'text', text: '物料明细' }]
                            },
                            {
                                type: 'view',
                                css: { display: 'flex', flexDirection: 'row', height: '36px' },
                                views: formulaMats.map((mat, i) => ({
                                    type: 'view',
                                    css: { width: `${getColW(i, i === formulaMats.length - 1, formulaAvailWidth, formulaWeights)}px`, borderRight: i === formulaMats.length - 1 ? 'none' : '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '12px', fontWeight: 'bold', padding: '0 5px', wordBreak: 'break-all' },
                                    views: [{ type: 'text', text: mat.material_name || '', css: { textAlign: 'center', maxLines: 2 } }]
                                }))
                            }
                        ]
                    }
                ]
            },
            // 数据内容
            {
                type: 'view',
                css: { display: 'flex', flexDirection: 'row', width: `${tableWidth}px`, boxSizing: 'border-box' },
                views: [
                    {
                        type: 'view', css: { width: `${baseColWidth}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', minHeight: '50px' },
                        views: [{ type: 'text', text: receiptData.product_name || '--' }]
                    },
                    {
                        type: 'view',
                        css: { width: `${formulaAvailWidth}px`, boxSizing: 'border-box', display: 'flex', flexDirection: 'row' },
                        views: formulaMats.map((mat, i) => {
                            const val = mat.formula_qty ? Number(mat.formula_qty).toFixed(2) : '';
                            return {
                                type: 'view',
                                css: { width: `${getColW(i, i === formulaMats.length - 1, formulaAvailWidth, formulaWeights)}px`, borderRight: i === formulaMats.length - 1 ? 'none' : '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', padding: '0 5px' },
                                views: [{ type: 'text', text: String(val) }]
                            };
                        })
                    }
                ]
            }
        ]
    });

    // --- 6. 底部制单人 ---
    views.push({
        type: 'text',
        text: `制单人：${receiptData.creator_name || '--'}`,
        css: {
            display: 'block',
            width: `${posterWidth - padding * 2}px`,
            textAlign: 'left',
            fontSize: '14px',
            color: '#333333',
            paddingTop: '30px',
            paddingBottom: '30px'
        }
    });

    return {
        css: {
            width: `${posterWidth}px`,
            backgroundColor: '#ffffff',
            padding: `${padding}px`,
            boxSizing: 'border-box'
        },
        views
    };
};

// --- 通用/非合同类型的凭证海报生成 (General In, General Out, Contract In) ---
export const generateGeneralReceiptPoster = (receiptData: any, tableData: any[], receiptTitle: string, qtyHeader: string) => {
    const posterWidth = 1000;
    const padding = 40;
    const views: any[] = [];

    // 1. 顶部标题
    views.push({
        type: 'text',
        text: receiptTitle,
        css: {
            display: 'block',
            width: `${posterWidth - padding * 2}px`,
            textAlign: 'center',
            fontSize: '44px',
            fontWeight: 'bold',
            color: '#c92a2a', // 红色标题
            paddingBottom: '20px'
        }
    });

    // 单号
    views.push({
        type: 'text',
        text: `单号：${receiptData.code || '--'}`,
        css: {
            display: 'block',
            width: `${posterWidth - padding * 2}px`,
            textAlign: 'center',
            fontSize: '24px',
            color: '#333333',
            fontFamily: 'monospace',
            paddingBottom: '30px',
            borderBottom: '1px solid #333333' // 与明细信息区隔
        }
    });

    // 2. 基础信息
    const metaY = 40;
    const formatDate = (iso: string) => iso ? iso.split('T')[0] : '';
    views.push({
        type: 'view',
        css: {
            display: 'flex',
            flexDirection: 'row',
            width: `${posterWidth - padding * 2}px`,
            paddingTop: `${metaY}px`,
            paddingBottom: `${metaY}px`,
            fontSize: '26px',
            color: '#333333'
        },
        views: [
            { type: 'text', text: `厂家：${receiptData.manufacturer_name || '--'}`, css: { flex: '1' } },
            { type: 'text', text: `日期：${formatDate(receiptData.create_time)}`, css: { flex: '1', textAlign: 'right' } }
        ]
    });

    // 3. 核心表格
    const tableWidth = posterWidth - padding * 2;
    // 表头宽度分配 (flex: 3, 2, 2, 1.5) -> (3, 2, 2, 1.5) = 8.5 total
    // 物料名称 (flex: 3) = 320
    // 规格 (flex: 2) = 220
    // 数量 (flex: 2) = 220
    // 单位 (flex: 1.5) = 160
    const colNameW = 320;
    const colSpecW = 220;
    const colQtyW = 220;
    const colUnitW = tableWidth - colNameW - colSpecW - colQtyW; // 160

    // Table Container
    const tableViews: any[] = [];

    // Table Header
    tableViews.push({
        type: 'view',
        css: {
            display: 'flex',
            flexDirection: 'row',
            width: `${tableWidth}px`,
            backgroundColor: '#f7f7f7',
            borderBottom: '1px solid #333',
            boxSizing: 'border-box'
        },
        views: [
            { type: 'view', css: { width: `${colNameW}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', fontWeight: 'bold', padding: '16px' }, views: [{ type: 'text', text: '物料名称' }] },
            { type: 'view', css: { width: `${colSpecW}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', fontWeight: 'bold', padding: '16px' }, views: [{ type: 'text', text: '规格' }] },
            { type: 'view', css: { width: `${colQtyW}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', fontWeight: 'bold', padding: '16px' }, views: [{ type: 'text', text: qtyHeader }] },
            { type: 'view', css: { width: `${colUnitW}px`, boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', fontWeight: 'bold', padding: '16px' }, views: [{ type: 'text', text: '单位' }] }
        ]
    });

    // Table Rows
    const formatQty = (val: number) => {
        if (val === undefined || isNaN(val)) return '0.00';
        return Number(val).toFixed(2);
    };

    if (tableData.length === 0) {
        tableViews.push({
            type: 'view',
            css: {
                display: 'flex',
                width: `${tableWidth}px`,
                height: '120px',
                justifyContent: 'center',
                alignItems: 'center',
                fontSize: '24px',
                color: '#999999'
            },
            views: [{ type: 'text', text: '无可显示明细' }]
        });
    } else {
        tableData.forEach((item: any, i: number) => {
            const isLast = i === tableData.length - 1;
            tableViews.push({
                type: 'view',
                css: {
                    display: 'flex',
                    flexDirection: 'row',
                    width: `${tableWidth}px`,
                    borderBottom: isLast ? 'none' : '1px solid #333', // 内部行使用bottom，外框统一由外层把控
                    boxSizing: 'border-box',
                    minHeight: '60px'
                },
                views: [
                    { type: 'view', css: { width: `${colNameW}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'flex-start', alignItems: 'center', fontSize: '24px', padding: '12px', wordBreak: 'break-all' }, views: [{ type: 'text', text: item.material_name || '' }] },
                    { type: 'view', css: { width: `${colSpecW}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '22px', padding: '12px' }, views: [{ type: 'text', text: item.spec || '-' }] },
                    { type: 'view', css: { width: `${colQtyW}px`, borderRight: '1px solid #333', boxSizing: 'border-box', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', fontSize: '24px', padding: '12px', fontFamily: 'monospace', fontWeight: 'bold' }, views: [{ type: 'text', text: formatQty(item.calculated_qty || item.quantity) }] },
                    { type: 'view', css: { width: `${colUnitW}px`, boxSizing: 'border-box', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', padding: '12px' }, views: [{ type: 'text', text: item.unit || '-' }] }
                ]
            });
        });
    }

    // 将整个表格用框包住
    views.push({
        type: 'view',
        css: {
            display: 'flex',
            flexDirection: 'column',
            width: `${tableWidth}px`,
            border: '1px solid #333',
            boxSizing: 'border-box'
        },
        views: tableViews
    });

    // 4. 合计总量
    if (tableData.length > 0) {
        const totalQty = tableData.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
        views.push({
            type: 'view',
            css: {
                display: 'flex',
                flexDirection: 'row',
                justifyContent: 'flex-end',
                alignItems: 'baseline',
                width: `${tableWidth}px`,
                paddingTop: '30px',
                paddingBottom: '50px'
            },
            views: [
                { type: 'text', text: '合计总量：', css: { fontSize: '26px' } },
                { type: 'text', text: formatQty(totalQty), css: { fontSize: '30px', color: '#c92a2a', fontWeight: 'bold', marginLeft: '10px' } }
            ]
        });
    }

    // 5. 制单人
    views.push({
        type: 'text',
        text: `制单人：${receiptData.creator_name || '--'}`,
        css: {
            display: 'block',
            width: `${tableWidth}px`,
            fontSize: '26px',
            color: '#333333',
            paddingTop: '60px'
        }
    });

    // 6. 底部 Footer Note
    const currentTime = new Date().toLocaleString('zh-CN', { hour12: false });
    views.push({
        type: 'view',
        css: {
            display: 'flex',
            flexDirection: 'column',
            width: `${tableWidth}px`,
            marginTop: '60px',
            borderTop: '1px dashed #cccccc',
            paddingTop: '20px'
        },
        views: [
            { type: 'text', text: `生成时间：${currentTime} · 内部单据，请妥善保管`, css: { textAlign: 'center', fontSize: '20px', color: '#999999' } }
        ]
    });

    return {
        css: {
            width: `${posterWidth}px`,
            backgroundColor: '#ffffff',
            padding: `${padding}px`,
            boxSizing: 'border-box'
        },
        views
    };
};
