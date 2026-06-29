require('dotenv').config({ path: 'C:/Users/antho/.gemini/antigravity-ide/scratch/eprajadelivery01-del/express-lane-nexus/.env' });
const { createClient } = require('@supabase/supabase-js');
const s = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
s.from('deliveries').select('id, price, value, delivery_fee, orders(id, total, delivery_fee)').limit(3).then(r => console.log(JSON.stringify(r.data, null, 2)));
