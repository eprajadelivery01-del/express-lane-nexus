const fs = require('fs');
const dotenv = fs.readFileSync('.env', 'utf8');
const envVars = dotenv.split('\n').reduce((acc, line) => {
  const [key, ...value] = line.split('=');
  if(key && value.length > 0) acc[key.trim()] = value.join('=').trim().replace(/['"]/g, '');
  return acc;
}, {});

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(envVars['VITE_SUPABASE_URL'], envVars['VITE_SUPABASE_ANON_KEY']);

async function run() {
  const { data } = await supabase.from('companies').select('name, delivery_mode, delivery_fee, delivery_regions_pricing').ilike('name', '%DROGARIA PAULISTA%');
  console.log(JSON.stringify(data, null, 2));
}
run();
