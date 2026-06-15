const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nptkxlrhrlssdsevpgqe.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

async function test() {
  console.log("Testing profiles...");
  const { data: profile, error: err1 } = await supabase.from("profiles").select("id").limit(1);
  console.log("Profile Err:", err1);

  console.log("Testing deliveries...");
  const { data: deliveries, error: err2 } = await supabase.from("deliveries").select("id").limit(1);
  console.log("Deliveries Err:", err2);

  console.log("Testing companies...");
  const { data: companies, error: err3 } = await supabase.from("companies").select("id").limit(1);
  console.log("Companies Err:", err3);
}

test();
