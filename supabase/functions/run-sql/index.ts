import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts"

serve(async (req) => {
  try {
    const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!;
    const pool = new postgres.Pool(databaseUrl, 1, true);
    const connection = await pool.connect();
    try {
      const sql = `
        -- Grants are required for anon to use the table at all
        GRANT SELECT ON public.companies TO anon, authenticated;
        GRANT SELECT ON public.products TO anon, authenticated;
        
        -- Policies
        DROP POLICY IF EXISTS "companies_select_anon" ON public.companies;
        CREATE POLICY "companies_select_anon" ON public.companies FOR SELECT TO anon USING (true);
        
        DROP POLICY IF EXISTS "products_select_anon" ON public.products;
        CREATE POLICY "products_select_anon" ON public.products FOR SELECT TO anon USING (true);
      `;
      const result = await connection.queryObject(sql);
      
      return new Response(JSON.stringify({ success: true, result }), { headers: { "Content-Type": "application/json" } });
    } finally {
      connection.release();
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { "Content-Type": "application/json" }, status: 500 });
  }
})
