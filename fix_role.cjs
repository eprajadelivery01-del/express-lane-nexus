const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env', 'utf8');
const urlMatch = env.match(/VITE_SUPABASE_URL="?([^"\n]+)"?/);
const keyMatch = env.match(/VITE_SUPABASE_PUBLISHABLE_KEY="?([^"\n]+)"?/);

if (!urlMatch || !keyMatch) {
  console.error("Missing env vars");
  process.exit(1);
}

const supabase = createClient(urlMatch[1], keyMatch[1]);
const userId = 'f8fd8fd7-c04f-4a2a-b229-4c1c95e705cc';

async function fix() {
  const { data: roles, error } = await supabase.from('user_roles').select('*').eq('user_id', userId);
  console.log('Roles:', roles, error);
  if (roles && roles.length === 0) {
    const { data: ins, error: insErr } = await supabase.from('user_roles').insert({ user_id: userId, role: 'company' }).select();
    console.log('Insert:', ins, insErr);
  }
}

fix();
