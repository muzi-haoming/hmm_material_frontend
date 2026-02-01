import { createClient } from 'supabase-wechat-stable-v2'

export const supabaseUrl = 'https://lvwekunqmtbzdazhvegh.supabase.co'
export const supabaseAnonKey = 'sb_publishable_6yEF2thMwvnaapqZxkVOCw_gAjLhPZE'

// 适用于 UniApp/WeChat 的自定义存储适配器
const customStorage = {
    getItem: (key: string) => {
        return uni.getStorageSync(key)
    },
    setItem: (key: string, value: string) => {
        uni.setStorageSync(key, value)
    },
    removeItem: (key: string) => {
        uni.removeStorageSync(key)
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false // 禁用小程序的 URL 检测
    },
    global: {
        // 某些版本的 supabase-js 需要此设置以避免错误检测浏览器环境
        // headers: { 'X-Client-Info': 'supabase-uniapp' } 
    }
})
