const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);
async function run() {
  const { data: companies } = await supabase.from('companies').select('id, delivery_regions_pricing');
  if (companies) {
    for (const company of companies) {
      if (company.delivery_regions_pricing && Array.isArray(company.delivery_regions_pricing)) {
        let changed = false;
        const newPricing = company.delivery_regions_pricing.map(p => {
          let updated = { ...p };
          if (updated.customer_price === '5,00' || updated.customer_price === '5') {
            updated.customer_price = '6,00';
            changed = true;
          }
          if (updated.merchant_price === 5 || updated.merchant_price === '5') {
            updated.merchant_price = 6;
            changed = true;
          }
          return updated;
        });
        
        if (changed) {
          await supabase.from('companies').update({ delivery_regions_pricing: newPricing }).eq('id', company.id);
          console.log('Updated company:', company.id);
        }
      }
    }
  }
  console.log('Done fixing company JSON pricing.');
}
run();
