const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({path: './express-lane-nexus/.env'});

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  const { data, error } = await supabase.rpc('get_table_schema', { table_name: 'reviews' });
  if (error) {
    console.error('Error fetching table schema via RPC:', error.message);
  } else {
    console.log('Schema:', data);
  }
}

checkSchema();
