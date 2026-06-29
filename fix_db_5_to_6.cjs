const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);
async function run() {
  // Update regions
  await supabase.from('regions').update({ price: 6 }).eq('price', 5);
  await supabase.from('regions').update({ delivery_fee: 6 }).eq('delivery_fee', 5);
  
  // Update deliveries
  await supabase.from('deliveries').update({ value: 6 }).eq('value', 5);
  await supabase.from('deliveries').update({ price: 6 }).eq('price', 5);
  
  // Update orders
  await supabase.from('orders').update({ delivery_fee: 6 }).eq('delivery_fee', 5);

  console.log('Done replacing 5 with 6 in the database.');
}
run();
