import { supabase } from './supabase';

export interface UserInfo {
    id: string;
    role_code: string;
    role_name: string;
    name: string;
    nickname?: string;
    avatar_url?: string;
    site_permissions: string[]; // List of site_ids
    manufacturer_permissions: string[]; // List of manufacturer_ids
    is_admin: boolean;
}

const STORAGE_KEY = 'userInfo';

/**
 * 获取当前登录用户信息
 */
export const getCurrentUser = (): UserInfo | null => {
    return uni.getStorageSync(STORAGE_KEY) || null;
};

/**
 * 刷新并缓存用户及其权限信息
 * @param userId 用户ID (可选，不传则使用当前session用户)
 */
export const refreshUserPermissions = async (userId?: string): Promise<UserInfo> => {
    if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        userId = user.id;
    }

    // 1. 获取基础 Profile 和 Role
    const { data: profile, error: profileError } = await supabase
        .from('profile')
        .select('*, user_role:role_id(code, name)')
        .eq('id', userId)
        .single();

    if (profileError || !profile) throw new Error('Failed to fetch profile');

    const roleCode = profile.user_role?.code;
    const isAdmin = roleCode === 'admin';
    let siteIds: string[] = [];
    let manufacturerIds: string[] = [];

    // 2. 根据角色获取对应的权限关联
    // 注意：Admin 即使没有关联表也能看到所有，但在前端为了逻辑统一，isAdmin 标志位更重要

    // 获取工地权限 (Role -> Site)
    const { data: siteRela } = await supabase
        .from('role_site_rela')
        .select('site_id')
        .eq('role_id', profile.role_id);

    if (siteRela) {
        siteIds = siteRela.map((r: any) => r.site_id);
    }

    // 获取厂家权限 (Role -> Manufacturer)
    const { data: mfrRela } = await supabase
        .from('role_manufacturer_rela')
        .select('manufacturer_id')
        .eq('role_id', profile.role_id);

    if (mfrRela) {
        manufacturerIds = mfrRela.map((r: any) => r.manufacturer_id);
    }

    // 3. 构造并保存 UserInfo
    const userInfo: UserInfo = {
        id: profile.id,
        role_code: roleCode,
        role_name: profile.user_role?.name,
        name: profile.full_name || profile.nickname || '未设置姓名',
        nickname: profile.nickname,
        avatar_url: profile.avatar_url,
        site_permissions: siteIds,
        manufacturer_permissions: manufacturerIds,
        is_admin: isAdmin
    };

    uni.setStorageSync(STORAGE_KEY, userInfo);
    return userInfo;
};

/**
 * 检查是否有权访问某资源
 * @param type 资源类型 'site' | 'manufacturer'
 * @param id 资源ID
 */
export const hasPermission = (type: 'site' | 'manufacturer', id: string): boolean => {
    const user = getCurrentUser();
    if (!user) return false;
    if (user.is_admin) return true;

    if (type === 'site') {
        return user.site_permissions.includes(id);
    } else if (type === 'manufacturer') {
        return user.manufacturer_permissions.includes(id);
    }
    return false;
};

/**
 * 检查是否有权执行某操作 (基于状态和角色)
 * 用于按钮显示的判断
 */
export const canDo = (action: 'confirm' | 'complete' | 'edit' | 'delete', record: any): boolean => {
    const user = getCurrentUser();
    if (!user) return false;

    // 通用逻辑：已完成的单据，除查看外均不可操作 (除非是反确认逻辑，暂不涉及)
    if (record.is_completed) return false;

    // 已确认的单据，通常不可编辑/删除
    if (record.is_confirmed && (action === 'edit' || action === 'delete')) {
        return false;
    }

    // Admin 一切皆可 (在状态允许的前提下)
    if (user.is_admin) return true;

    // 创建人通常有权操作自己的未确认单据
    if (record.creator === user.id) return true;

    return false;
    // TODO: 根据具体业务细化，比如 代理人 可以操作 负责工地的合同
};
