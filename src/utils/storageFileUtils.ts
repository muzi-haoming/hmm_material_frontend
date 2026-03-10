
import { supabase } from '@/utils/supabase';

/**
 * Safely deletes a database record and its associated file from storage.
 * Strategy:
 * 1. Get the file URL from the record (if not provided).
 * 2. Delete the database record FIRST.
 * 3. If DB delete succeeds, attempt to delete the file from storage.
 * 
 * @param tableName The table name (e.g., 'general_stock_in', 'general_stock_out'). 
 *                  Assumes the Storage Bucket name is the SAME as the table name.
 * @param id Record ID
 * @param fileUrl (Optional) If already known, pass it to save a fetch.
 */
export const safeDeleteRecordWithFile = async (
    tableName: string,
    id: string,
    fileUrl?: string
): Promise<{ success: boolean; error?: any }> => {

    // 0. If fileUrl is not provided, fetch it first (to ensure we can clean up)
    let targetFileUrl = fileUrl;
    if (targetFileUrl === undefined) {
        const { data } = await supabase.from(tableName).select('file_url').eq('id', id).single();
        if (data) {
            targetFileUrl = data.file_url;
        }
    }

    // 1. Delete Database Record
    const { error: dbError } = await supabase.from(tableName).delete().eq('id', id);

    if (dbError) {
        // Enhance error message for common constraints
        if (dbError.message && dbError.message.includes('ck_stock_quantity_non_negative')) {
            // Mutate error message to be more user-friendly
            // We return the original error object but with a modified message property if possible, 
            // or just create a new error object.
            return {
                success: false,
                error: {
                    ...dbError,
                    message: '删除失败：库存不足。该入库单对应的库存已被由后续的出库单消耗，请先删除相关的出库记录。'
                }
            };
        }
        return { success: false, error: dbError };
    }

    // 2. Delete File (Fire and Forget / Log Error)
    if (targetFileUrl) {
        try {
            const fileName = targetFileUrl.split('/').pop();
            if (fileName) {
                // Assumption: Bucket name matches table name
                const { error: storageError } = await supabase.storage
                    .from(tableName)
                    .remove([fileName]);

                if (storageError) {
                    console.error(`[SafeDelete] Failed to delete file ${fileName} from ${tableName}:`, storageError);
                } else {
                    console.log(`[SafeDelete] Successfully deleted file ${fileName}`);
                }
            }
        } catch (err) {
            console.error('[SafeDelete] Error parsing URL or deleting file:', err);
        }
    }

    return { success: true };
};
