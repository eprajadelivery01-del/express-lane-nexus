const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nptkxlrhrlssdsevpgqe.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5wdGt4bHJocmxzc2RzZXZwZ3FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwNDE4MTQsImV4cCI6MjA5MDYxNzgxNH0.t8Cu-yFnSqOURT4GXCZ_mBghpxucT89nRBFlBNA1vZs'
);

async function fixOrders() {
  const { data: orders } = await supabase.from('orders').select('id, delivery_fee, total, company_id, region_id, delivery_address, items:order_items(quantity, unit_price)').not('status', 'in', '("completed","cancelled")');
  
  if (!orders) return;
  
  for (const order of orders) {
    if (order.delivery_fee <= 6) {
      const { data: company } = await supabase.from('companies').select('delivery_regions_pricing').eq('id', order.company_id).single();
      if (!company || !company.delivery_regions_pricing) continue;
      
      let pricing = company.delivery_regions_pricing;
      if (typeof pricing === 'string') {
        try { pricing = JSON.parse(pricing); } catch(e){}
      }
      
      if (Array.isArray(pricing) && order.region_id) {
        const match = pricing.find(p => p.region_id === order.region_id);
        if (match) {
          const price = Number(String(match.customer_price).replace(',', '.'));
          if (!isNaN(price) && price > 0 && price !== order.delivery_fee) {
            const subtotal = order.items.reduce((acc, curr) => acc + ((curr.unit_price || 0) * curr.quantity), 0);
            const newTotal = subtotal + price;
            
            await supabase.from('orders').update({ delivery_fee: price, total: newTotal }).eq('id', order.id);
            console.log('Fixed order ' + order.id + ': new fee ' + price + ' new total ' + newTotal);
          }
        }
      }
    }
  }
}
fixOrders().then(() => console.log('Done fixOrders'));
