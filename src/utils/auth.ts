import { supabase, supabaseUrl, supabaseAnonKey } from './supabase';

/**
 * 使用微信 Code 进行登录
 * 1. 调用 Edge Function 获取 OpenID/Session
 * 2. 使用 Supabase SDK 设置 Session
 * @param code 微信登录 Code
 * @returns 登录回包数据 (data.session, data.user)
 */
export const loginWithWechatCode = async (code: string) => {
    const functionUrl = `${supabaseUrl}/functions/v1/wechat-auth`;

    // 1. 调用 Edge Function
    const response = await new Promise<any>((resolve, reject) => {
        uni.request({
            url: functionUrl,
            method: 'POST',
            data: { code },
            header: {
                'Authorization': `Bearer ${supabaseAnonKey}`,
                'apikey': supabaseAnonKey,
                'Content-Type': 'application/json'
            },
            success: (res) => resolve(res),
            fail: (err) => reject(new Error('Network request failed: ' + (err.errMsg || JSON.stringify(err))))
        });
    });

    if (response.statusCode < 200 || response.statusCode >= 300) {
        throw new Error(`Edge Function failed (${response.statusCode}): ` + JSON.stringify(response.data));
    }

    const { data } = response;
    if (!data || !data.session) {
        throw new Error('Invalid response structure: Missing session');
    }

    // 2. 设置 Supabase Session
    const { error: sessionError } = await supabase.auth.setSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
    });

    if (sessionError) throw sessionError;

    return data;
};
