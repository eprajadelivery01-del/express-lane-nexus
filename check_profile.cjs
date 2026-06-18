const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();
const db = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function run() {
  const {data} = await db.from('profiles').select('*').eq('id', 'c10198da-6c02-42bf-b46a-f25ef07b85b4');
  console.log('Profile:', data);
}
run();
