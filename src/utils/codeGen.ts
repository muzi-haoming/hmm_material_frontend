// import { supabase } from './supabase'; // No longer needed

/**
 * 自动生成业务编码
 * 格式: 前缀 + YYYYMMDD + '-' + 4位流水号
 * 示例: TYCG20260219-0001
 * 
 * @param tableName Supabase 表名
 * @param prefix 编码前缀
 * @returns 生成的编码字符串
 */
export async function generateCode(tableName: string, prefix: string): Promise<string> {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const dateStr = `${y}${m}${d}`;

    // 生成时间戳部分 (HHmmss)
    // 去掉毫秒，因为加上毫秒会导致长度超过数据库限制 (通常为20字符)
    // TYCG(4) + 20260219(8) + -(1) + 195906(6) = 19字符
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    const timeStr = `${hh}${mm}${ss}`;

    // 格式: 前缀 + YYYYMMDD + '-' + HHmmss
    // 示例: TYCG20260219-195906
    return `${prefix}${dateStr}-${timeStr}`;
}
