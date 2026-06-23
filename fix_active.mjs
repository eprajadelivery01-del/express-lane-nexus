import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_PUBLISHABLE_KEY);

async function fix() {
  console.log("Fixing companies active status...");
  // We just set all to true to restore marketplace immediately
  const { error } = await supabase.from('companies').update({ active: true, is_active: true }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (error) {
    console.error("Error updating:", error);
  } else {
    console.log("Successfully set all companies to active=true and is_active=true.");
  }
}

fix();
