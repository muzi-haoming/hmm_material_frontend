const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://lvwekunqmtbzdazhvegh.supabase.co';
const supabaseAnonKey = 'sb_publishable_6yEF2thMwvnaapqZxkVOCw_gAjLhPZE';
const tb = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
    console.log('--- TEST: user_role:role(name) ---');
    const { data: p5, error: e5 } = await tb.from('profile').select('*, user_role:role(name)').limit(1);
    console.log('user_role:role result:', e5 ? e5.message : 'Success');

    console.log('--- TEST: role(name) ---');
    const { data: p6, error: e6 } = await tb.from('profile').select('*, role(name)').limit(1);
    console.log('role result:', e6 ? e6.message : 'Success');
}

run();
