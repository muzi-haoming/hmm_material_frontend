import { supabase } from './supabase';

/**
 * 模拟微信登录 (仅限 H5 开发环境)
 * @param onLoginSuccess 登录成功回调
 * @param onBindRequired 需要绑定回调
 */
export const mockWechatLogin = async (
    onLoginSuccess: (userInfo: any) => void,
    onBindRequired: (openId: string) => void
) => {
    // 模拟获取 ID
    const mockOpenId = 'mock_openid_' + Math.floor(Math.random() * 1000);
    console.log('正在模拟 OpenID:', mockOpenId);

    // 检查数据库
    const { data: user } = await supabase
        .from('user')
        .select('*, user_role:role_id(code, name)')
        .eq('wx_openid', mockOpenId)
        .maybeSingle();

    if (user) {
        uni.showToast({ title: '微信登录成功(Mock)', icon: 'success' });
        const userInfo = {
            ...user,
            role_code: user.user_role?.code,
            role_name: user.user_role?.name
        };
        uni.setStorageSync('userInfo', userInfo);
        if (onLoginSuccess) onLoginSuccess(userInfo);
    } else {
        uni.showToast({ title: '请联系管理员绑定账号(Mock)', icon: 'none' });
        if (onBindRequired) onBindRequired(mockOpenId);
    }
};
