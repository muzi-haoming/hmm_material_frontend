import { supabase, supabaseUrl } from './supabase';

/**
 * 上传头像到 Supabase Storage
 * @param filePath 本地文件路径
 * @param userId 用户 ID
 * @returns 上传后的公开 URL 或 null (失败时)
 */
export const uploadAvatar = async (filePath: string, userId: string): Promise<string | null> => {
    if (!filePath || (!filePath.startsWith('http://tmp') && !filePath.startsWith('wxfile://'))) {
        // 如果不是临时文件，直接返回原路径 (可能是已有 URL)
        return filePath;
    }

    try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        // Database RLS requires filename to be [userId].[ext]
        const fileName = `${userId}.png`;
        const bucketName = 'avatar';

        const uploadRes = await new Promise<any>((resolve, reject) => {
            uni.uploadFile({
                url: `${supabaseUrl}/storage/v1/object/${bucketName}/${fileName}`,
                filePath: filePath,
                name: 'file',
                header: {
                    'Authorization': `Bearer ${token}`,
                    'x-upsert': 'true'
                },
                success: (res) => resolve(res),
                fail: (err) => reject(err)
            });
        });

        if (uploadRes.statusCode >= 200 && uploadRes.statusCode < 300) {
            // 构造 Public URL with timestamp to bust cache
            return `${supabaseUrl}/storage/v1/object/public/${bucketName}/${fileName}?t=${Date.now()}`;
        } else {
            console.error('Avatar Upload Failed:', uploadRes);
            return null;
        }
    } catch (err) {
        console.error('Avatar Upload Exception:', err);
        return null;
    }
};
