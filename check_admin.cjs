const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL="?([^"\n]+)"?/);
const keyMatch = env.match(/SUPABASE_SERVICE_ROLE_KEY="?([^"\n]+)"?/);
if (!keyMatch) { console.log("NO SERVICE ROLE KEY"); process.exit(1); }
const supabase = createClient(urlMatch[1], keyMatch[1]);

async function run() {
  const { data, error } = await supabase.from('deliveries').select('id, order_id, status').order('created_at', { ascending: false }).limit(5);
  console.log("Deliveries:", data, error);
}
run();
