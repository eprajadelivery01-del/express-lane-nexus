const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);

function isFive(val) {
  if (val === 5 || val === '5' || val === '5,00' || val === '5.00') return true;
  if (typeof val === 'string') {
    const num = Number(val.replace(',', '.'));
    return num === 5;
  }
  return false;
}

async function run() {
  const { data: companies } = await supabase.from('companies').select('id, name, delivery_regions_pricing');
  if (companies) {
    for (const company of companies) {
      if (company.delivery_regions_pricing && Array.isArray(company.delivery_regions_pricing)) {
        let changed = false;
        const newPricing = company.delivery_regions_pricing.map(p => {
          let updated = { ...p };
          if (isFive(updated.customer_price)) {
            updated.customer_price = '6,00';
            changed = true;
          }
          if (isFive(updated.merchant_price)) {
            updated.merchant_price = 6;
            changed = true;
          }
          return updated;
        });
        
        if (changed) {
          await supabase.from('companies').update({ delivery_regions_pricing: newPricing }).eq('id', company.id);
          console.log('Updated company:', company.name);
        }
      }
    }
  }
  console.log('Done deep fixing company JSON pricing.');
}
run();
