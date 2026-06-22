import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nptkxlrhrlssdsevpgqe.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data: { session }, error: authError } = await supabase.auth.signInWithPassword({
    email: 'admin@eprajadelivery.com', // or the correct admin email
    password: 'admin' // Please provide correct password if this fails
  });

  if (authError) {
    console.log('Auth Error:', authError.message);
    return;
  }

  const { data, error } = await supabase.from('companies').update({
    active: true,
    is_active: true,
    show_in_marketplace: true
  }).eq('id', 'd96dcc95-f348-4975-90ce-fd472d7a0d81').select();

  console.log('Update Error:', error);
  console.log('Update Data:', data);
}

run();
