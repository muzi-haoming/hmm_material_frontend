// 数据库表类型定义

// ==================== 基础实体 ====================

/**
 * 角色表
 */
export interface Role {
    id: string;
    code: string;
    name: string;
    create_time: string;
    modify_time: string;
}

/**
 * 档案表 (用户信息)
 */
export interface Profile {
    id: string;
    create_time: string;
    modify_time: string;
    role_id: string;
    nickname?: string;
    full_name?: string;
    phone?: string;
    email?: string;
    avatar_url?: string;
}

/**
 * 工地表
 */
export interface Site {
    id: string;
    code: string;
    name: string;
    create_time: string;
    modify_time: string;
}

/**
 * 产品表
 */
export interface Product {
    id: string;
    code: string;
    name: string;
    create_time: string;
    modify_time: string;
    unit: string;
    price: string; // decimal in DB
}

/**
 * 物料表
 */
export interface Material {
    id: string;
    code: string;
    name: string;
    create_time: string;
    modify_time: string;
    unit?: string;
    spec?: string;
}

/**
 * 产品-物料关系表 (BOM配方表)
 */
export interface ProductMaterialRela {
    id: string;
    create_time: string;
    modify_time: string;
    product_id: string;
    material_id: string;
    quantity: string; // decimal in DB
}

/**
 * 厂家表
 */
export interface Manufacturer {
    id: string;
    code: string;
    name: string;
    create_time: string;
    modify_time: string;
    is_manage_stock: boolean;
}

// ==================== 关系表 ====================

/**
 * 角色-厂家关系表
 */
export interface RoleManufacturerRela {
    id: string;
    create_time: string;
    modify_time: string;
    role_id: string;
    manufacturer_id: string;
}

/**
 * 角色-工地关系表
 */
export interface RoleSiteRela {
    id: string;
    create_time: string;
    modify_time: string;
    role_id: string;
    site_id: string;
}

// ==================== 库存 ====================

/**
 * 库存表
 */
export interface Stock {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    manufacturer_id: string;
    material_id: string;
    quantity: string; // decimal in DB
}

// ==================== 合同相关 ====================

/**
 * 合同表
 */
export interface Contract {
    id: string;
    code: string;
    name: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    site_id: string;
    agent_id: string;
    is_confirmed: boolean;
    is_completed: boolean;
}

/**
 * 合同-厂家关系表
 */
export interface ContractManufacturerRela {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    contract_id: string;
    manufacturer_id: string;
}

/**
 * 合同订单表
 */
export interface ContractOrder {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    contract_id: string;
    product_id: string;
    quantity: string; // decimal in DB
    is_confirmed: boolean;
    is_completed: boolean;
}

/**
 * 合同订单出库单
 */
export interface ContractOrderStockOut {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    contract_order_id: string;
    manufacturer_id: string;
    quantity: string; // decimal in DB
    file_url?: string;
}

/**
 * 合同订单入库单
 */
export interface ContractOrderStockIn {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    contract_order_id: string;
    manufacturer_id: string;
    quantity: string; // decimal in DB
    file_url?: string;
}

/**
 * 合同订单采购单
 */
export interface ContractOrderPurchase {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    contract_order_id: string;
    payer_manufacturer_id: string;
    payee_manufacturer_id: string;
    product_id: string;
    quantity: string; // decimal in DB
}

// ==================== 通用采购 ====================

/**
 * 通用采购单
 */
export interface GeneralPurchase {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    payer_manufacturer_id: string;
    payee_manufacturer_id: string;
    material_id: string;
    quantity: string; // decimal in DB
    is_confirmed: boolean;
    is_completed: boolean;
}

/**
 * 通用出库单
 */
export interface GeneralStockOut {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    general_purchase_id: string;
    quantity: string; // decimal in DB
    file_url?: string;
}

/**
 * 通用入库单
 */
export interface GeneralStockIn {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    general_purchase_id: string;
    quantity: string; // decimal in DB
    file_url?: string;
}

// ==================== 对账单 ====================

/**
 * 对账单表
 */
export interface Statement {
    id: string;
    code: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    contract_id: string;
    start_time: string;
    end_time: string;
    file_url?: string;
    is_confirmed: boolean;
    is_completed: boolean;
}

/**
 * 对账单_产品详情表
 */
export interface StatementMaterialDetail {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    statement_id: string;
    product_id: string;
    quantity: string; // decimal in DB
    amount: string; // decimal in DB
}

/**
 * 对账单_其他费用项
 */
export interface StatementOtherExpensesItem {
    id: string;
    code: string;
    name: string;
    create_time: string;
    modify_time: string;
}

/**
 * 对账单_其他费用项详情
 */
export interface StatementOtherExpensesDetail {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    statement_id: string;
    item_id: string;
    amount: string; // decimal in DB
}

// ==================== 发票 ====================

/**
 * 发票表
 */
export interface Invoice {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    invoice_no: string;
    invoice_title: string;
    tax_no: string;
    amount: string; // decimal in DB
    tax_amount: string; // decimal in DB
    issued_time: string;
    file_url?: string;
}

/**
 * 发票详情表
 */
export interface InvoiceDetail {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    invoice_id: string;
    item_name: string;
    spec?: string;
    quantity: string; // decimal in DB
    price: string; // decimal in DB
    tax_rate: string; // decimal in DB
    amount: string; // decimal in DB
}

/**
 * 对账单_发票关系表
 */
export interface StatementInvoiceRela {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    statement_id: string;
    invoice_id: string;
}

// ==================== 待办 ====================

/**
 * 待办表
 */
export interface Todo {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    todo_title: string;
    todo_content?: string;
    todo_type?: string;
    todo_id?: string;
    todo_path?: string;
    todo_ext_params?: Record<string, any>;
    todo_due_time?: string;
    is_completed: boolean;
}

/**
 * 角色-待办关系表
 */
export interface RoleTodoRela {
    id: string;
    creator: string;
    modifier: string;
    create_time: string;
    modify_time: string;
    role_id: string;
    todo_id: string;
}

// ==================== 表单类型 ====================

/**
 * 合同表单
 */
export interface ContractForm {
    id?: string;
    code: string;
    name: string;
    site_id: string;
    agent_id: string;
    is_confirmed?: boolean;
    is_completed?: boolean;
    manufacturer_ids: string[]; // 关联的厂家ID列表
}

/**
 * 合同订单表单
 */
export interface ContractOrderForm {
    id?: string;
    code: string;
    contract_id: string;
    product_id: string;
    quantity: string;
    is_confirmed?: boolean;
    is_completed?: boolean;
}

/**
 * 通用采购单表单
 */
export interface GeneralPurchaseForm {
    id?: string;
    code: string;
    payer_manufacturer_id: string;
    payee_manufacturer_id: string;
    material_id: string;
    quantity: string;
    is_confirmed?: boolean;
    is_completed?: boolean;
}

/**
 * 对账单表单
 */
export interface StatementForm {
    id?: string;
    code: string;
    contract_id: string;
    start_time: string;
    end_time: string;
    file_url?: string;
    is_confirmed?: boolean;
    is_completed?: boolean;
    material_details: Array<{
        product_id: string;
        quantity: string;
        amount: string;
    }>;
    expense_details: Array<{
        item_id: string;
        amount: string;
    }>;
}

// ==================== 业务类型 ====================

/**
 * 单据状态
 */
export enum BillStatus {
    UNCONFIRMED = 'unconfirmed', // 未确认
    CONFIRMED = 'confirmed', // 已确认
    COMPLETED = 'completed', // 已完成
}

/**
 * 获取单据状态
 */
export function getBillStatus(is_confirmed: boolean, is_completed: boolean): BillStatus {
    if (is_completed) return BillStatus.COMPLETED;
    if (is_confirmed) return BillStatus.CONFIRMED;
    return BillStatus.UNCONFIRMED;
}

/**
 * 单据状态文本
 */
export const BillStatusText: Record<BillStatus, string> = {
    [BillStatus.UNCONFIRMED]: '未确认',
    [BillStatus.CONFIRMED]: '已确认',
    [BillStatus.COMPLETED]: '已完成',
};

/**
 * 选择器选项
 */
export interface PickerOption {
    id: string;
    name: string;
    nickname?: string;
    full_name?: string;
}

/**
 * 列表查询参数
 */
export interface ListQueryParams {
    page?: number;
    pageSize?: number;
    keyword?: string;
    [key: string]: any;
}

/**
 * 分页数据
 */
export interface PageData<T> {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
}
