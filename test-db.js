import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://nptkxlrhrlssdsevpgqe.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function testAuth() {
  console.log("Logging in...");
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'testedelivery@gmail.com',
    password: 'password_placeholder' // I don't know the password
  });

  if (authError) {
    console.error("Login failed:", authError.message);
    // Let's just check the DB as anonymous if RLS allows? Probably not.
  } else {
    console.log("Login success! User ID:", authData.user?.id);
    
    console.log("Fetching user_roles...");
    const { data: roles, error: rolesError } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', authData.user?.id);
      
    console.log("Roles:", roles, "Error:", rolesError);

    console.log("Fetching profiles...");
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', authData.user?.id);
      
    console.log("Profile:", profile, "Error:", profileError);
  }
}

testAuth();
