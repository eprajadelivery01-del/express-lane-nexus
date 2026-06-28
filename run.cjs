const { createClient } = require('@supabase/supabase-js');  
const supabase = createClient('https://nptkxlrhrlssdsevpgqe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs');  
async function run() {  
  const { data } = await supabase.from('companies').select('id, name, is_open, active, is_active, show_in_marketplace').eq('id', 'd96dcc95-f348-4975-90ce-fd472d7a0d81');  
  console.log('COMPANY STATE:', data);  
}  
run();  
