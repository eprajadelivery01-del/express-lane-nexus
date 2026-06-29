import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://nptkxlrhrlssdsevpgqe.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs');

async function run() {
  const { data, error: signInErr } = await supabase.auth.signInWithPassword({
    email: 'davinyn@admin.com', // wait, do I know their email? I can just use a query for Davinyn Silva? Or I can just check the RLS policy!
    password: 'password'
  });
}
run();
