const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);
async function run() {
  const { data } = await supabase.from('companies').select('name, delivery_mode, delivery_fee, delivery_regions_pricing').ilike('name', '%DROGARIA PAULISTA%');
  console.log('DROGARIA PAULISTA:', JSON.stringify(data, null, 2));
  
  const { data: rData } = await supabase.from('regions').select('*');
  console.log('REGIONS:', JSON.stringify(rData, null, 2));
}
run();
