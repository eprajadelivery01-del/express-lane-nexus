const { createClient } = require('@supabase/supabase-js');  
const fs = require('fs');  
const env = fs.readFileSync('c:/Users/antho/.gemini/antigravity-ide/scratch/eprajadelivery01-del/pronto-agora-hub/.env', 'utf8');  
const url = env.match(/VITE_SUPABASE_URL=([\r\n]+)/)[1].replace(/['\"]/g, ''); >> set_active.cjs && echo const key = env.match(/VITE_SUPABASE_SERVICE_ROLE_KEY=([^\r\n]+)/)[1].replace(/['\"]/g, '');  
const supabase = createClient(url, key);  
async function run() {  
  const { error } = await supabase.from('companies').update({ name: 'Loja De Teste', active: true, is_active: true, is_open: true }).eq('id', 'd96dcc95-f348-4975-90ce-fd472d7a0d81');  
  console.log(error ? error : 'Name and status restored!');  
}  
run();  
