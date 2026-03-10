import { supabase } from '@/utils/supabase';

export interface SlipData {
    code?: string;
    create_time?: string;
    manufacturer_name?: string;
    creator_name?: string;
    quantity?: string | number;
    product_name?: string;
    product_unit?: string;
    contract_code?: string;
}

export interface SlipTableItem {
    material_name?: string;
    spec?: string;
    unit?: string;
    formula_qty?: number | string;
    calculated_qty?: number | string;
    quantity?: number | string;
}

/**
 * 获取 合同订单出库单 打印凭证数据
 * @param receiptId 单据ID
 */
export const fetchContractOutboundSlip = async (receiptId: string): Promise<{ receipt: SlipData, items: SlipTableItem[] }> => {
    const { data: outData, error } = await supabase
        .from('contract_order_stock_out')
        .select(`
           *,
           manufacturer:manufacturer_id(name),
           creator_profile:creator(full_name),
           contract_order:contract_order_id(code, product_id, product:product_id(name, unit))
       `)
        .eq('id', receiptId)
        .single();

    if (error) throw error;

    const qty = outData.quantity;
    const productId = outData.contract_order.product_id;

    const receipt: SlipData = {
        code: outData.code,
        create_time: outData.create_time,
        manufacturer_name: outData.manufacturer?.name,
        creator_name: outData.creator_profile?.full_name,
        quantity: qty,
        product_name: outData.contract_order.product?.name,
        product_unit: outData.contract_order.product?.unit,
        contract_code: outData.contract_order.code,
    };

    let items: SlipTableItem[] = [];
    const { data: formulaData, error: formulaError } = await supabase
        .from('product_material_rela')
        .select(`
            quantity,
            material:material_id(name, spec, unit)
        `)
        .eq('product_id', productId);

    if (formulaError) {
        console.error('Error fetching formula:', formulaError);
    } else if (formulaData) {
        items = formulaData.map(f => {
            const mData = f.material as any;
            const m = Array.isArray(mData) ? mData[0] : mData;
            return {
                material_name: m?.name,
                spec: m?.spec,
                unit: m?.unit,
                formula_qty: f.quantity,
                calculated_qty: Number(f.quantity) * Number(qty)
            };
        });
    }

    return { receipt, items };
};

/**
 * 获取 通用出库单 打印凭证数据
 * @param receiptId 单据ID
 */
export const fetchGeneralOutboundSlip = async (receiptId: string): Promise<{ receipt: SlipData, items: SlipTableItem[] }> => {
    const { data: outData, error } = await supabase
        .from('general_stock_out')
        .select(`
            *,
            general_purchase:general_purchase_id(
                payee_manufacturer_id,
                payee:payee_manufacturer_id(name),
                material:material_id(name, unit, spec)
            ),
            creator_profile:creator(full_name)
        `)
        .eq('id', receiptId)
        .single();

    if (error) throw error;

    let mfrName = '';
    const payeeData = (outData.general_purchase as any)?.payee;
    if (payeeData) {
        mfrName = Array.isArray(payeeData) ? payeeData[0]?.name : payeeData?.name;
    }

    const receipt: SlipData = {
        code: outData.code,
        create_time: outData.create_time,
        manufacturer_name: mfrName,
        creator_name: outData.creator_profile?.full_name
    };

    let items: SlipTableItem[] = [];
    // Use the single general purchase item as the only row
    if (outData.general_purchase) {

        let mData = (outData.general_purchase as any).material;
        let material = Array.isArray(mData) ? mData[0] : mData;

        items.push({
            material_name: material?.name || '--',
            unit: material?.unit || '--',
            spec: material?.spec || '--',
            quantity: String(outData.quantity)
        });
    }

    return { receipt, items };
};

/**
 * 获取 通用入库单 打印凭证数据
 * @param receiptId 单据ID
 */
export const fetchGeneralInboundSlip = async (receiptId: string): Promise<{ receipt: SlipData, items: SlipTableItem[] }> => {
    const { data: inData, error } = await supabase
        .from('general_stock_in')
        .select(`
            *,
            general_purchase:general_purchase_id(
                payer_manufacturer_id,
                payer:payer_manufacturer_id(name),
                material:material_id(name, unit, spec)
            ),
            creator_profile:creator(full_name)
        `)
        .eq('id', receiptId)
        .single();

    if (error) throw error;

    let mfrName = '';
    const payerData = (inData.general_purchase as any)?.payer;
    if (payerData) {
        mfrName = Array.isArray(payerData) ? payerData[0]?.name : payerData?.name;
    }

    const receipt: SlipData = {
        code: inData.code,
        create_time: inData.create_time,
        manufacturer_name: mfrName,
        creator_name: inData.creator_profile?.full_name
    };

    let items: SlipTableItem[] = [];

    // Use the single general purchase item as the only row
    if (inData.general_purchase) {
        let mData = (inData.general_purchase as any).material;
        let material = Array.isArray(mData) ? mData[0] : mData;

        items.push({
            material_name: material?.name || '--',
            unit: material?.unit || '--',
            spec: material?.spec || '--',
            quantity: String(inData.quantity)
        });
    }

    return { receipt, items };
};

export const fetchContractInboundSlip = async (id: string) => {
    const { data: inData, error } = await supabase
        .from('contract_order_stock_in')
        .select(`
            id, code, quantity, create_time,
            manufacturer:manufacturer_id (name),
            contract_order:contract_order_id (
                product:product_id (name, unit, spec)
            ),
            creator_profile:creator(full_name)
        `)
        .eq('id', id)
        .single();

    if (error) throw error;

    let mfrName = '';
    const mfrData = inData.manufacturer as any;
    if (mfrData) {
        mfrName = Array.isArray(mfrData) ? mfrData[0]?.name : mfrData?.name;
    }

    const creator = Array.isArray(inData.creator_profile) ? inData.creator_profile[0] : inData.creator_profile;

    const receipt: SlipData = {
        code: inData.code,
        create_time: inData.create_time,
        manufacturer_name: mfrName, // Source manufacturer
        creator_name: (creator as any)?.full_name
    };

    let items: SlipTableItem[] = [];

    const co = Array.isArray(inData.contract_order) ? inData.contract_order[0] : inData.contract_order;
    if (co && (co as any).product) {
        const productData = (co as any).product;
        const product = Array.isArray(productData) ? productData[0] : productData;
        items.push({
            material_name: product?.name || '--',
            spec: product?.spec || '--',
            unit: product?.unit || '--',
            quantity: String(inData.quantity)
        });
    }

    return { receipt, items };
};
