import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: deliveries, error: delErr } = await supabase
      .from("deliveries")
      .select("id, company_id")
      .ilike("customer_name", "%MARCI%");

    if (delErr) throw delErr;

    const updated = [];
    const companies = {};

    for (const d of deliveries || []) {
      if (!companies[d.company_id]) {
        const { data: comp } = await supabase
          .from("companies")
          .select("delivery_fee, delivery_mode, pricing_table_id, region_id")
          .eq("id", d.company_id)
          .single();
        companies[d.company_id] = comp;
      }

      const comp = companies[d.company_id];
      if (comp) {
        let newFee = Number(comp.delivery_fee || 0);
        let newValue = 0;
        
        if (comp.delivery_mode === "fixed_fee") {
          newValue = newFee;
        } else if (comp.delivery_mode === "percentage") {
          newValue = newFee * (comp.delivery_fee / 100);
        } else if (comp.delivery_mode === "pricing_table" && comp.pricing_table_id) {
            // Find the delivery's region_id
            const { data: dData } = await supabase.from('deliveries').select('region_id').eq('id', d.id).single();
            if (dData && dData.region_id) {
               const { data: rule } = await supabase
                  .from('pricing_rules')
                  .select('base_value')
                  .eq('pricing_table_id', comp.pricing_table_id)
                  .eq('origin_region_id', comp.region_id)
                  .eq('destination_region_id', dData.region_id)
                  .maybeSingle();
               if (rule && rule.base_value) {
                   newValue = Number(rule.base_value);
                   newFee = newValue;
               } else {
                   newValue = 6; // fallback
                   newFee = 6;
               }
            } else {
               newValue = 6; // fallback
               newFee = 6;
            }
        } else {
          newValue = newFee > 0 ? newFee : 6;
          newFee = newValue;
        }

        if (newValue > 0) {
          await supabase.from("deliveries").update({ value: newValue, price: newFee }).eq("id", d.id);
          updated.push(d.id);
        }
      }
    }

    const { error: cancelErr } = await supabase
      .from("deliveries")
      .update({ status: "cancelled" })
      .in("status", ["pending", "broadcasted"])
      .eq("customer_name", "Cliente");

    return new Response(JSON.stringify({ 
      success: true, 
      updated_values: updated.length,
      ghost_deliveries_cancelled: !cancelErr
    }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
