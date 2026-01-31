import { createClient } from 'supabase-wechat-stable-v2'

export const supabaseUrl = 'https://lvwekunqmtbzdazhvegh.supabase.co'
export const supabaseAnonKey = 'sb_publishable_6yEF2thMwvnaapqZxkVOCw_gAjLhPZE'

// Custom storage adapter for UniApp/WeChat
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
        detectSessionInUrl: false // Disable URL detection for MiniProgram
    },
    global: {
        // Some versions of supabase-js need this to avoid detecting browser environment incorrectly
        // headers: { 'X-Client-Info': 'supabase-uniapp' } 
    }
})
