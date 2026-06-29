import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const env = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
const envVars = env.split('\n').reduce((acc, line) => {
  const [key, value] = line.split('=');
  if (key && value) acc[key.trim()] = value.trim();
  return acc;
}, {});

const supabaseUrl = envVars.VITE_SUPABASE_URL || '';
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('deliveries').select(`
          id, 
          company_id, 
          driver_id, 
          customer_name, 
          address, 
          value, 
          price,
          status, 
          created_at, 
          updated_at, 
          region_id,
          notes,
          estimated_value,
          orders(
            total,
            delivery_fee,
            order_items(quantity, price, products(name))
          ),
          companies(name, phone, city_id),
          delivery_drivers(id, user_id, full_name, phone, vehicle_type, vehicle_plate, city_id)
  `).limit(1);
  console.log('Error:', error);
  console.log('Data:', data);
}
run();
