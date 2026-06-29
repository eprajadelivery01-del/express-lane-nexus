import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import * as postgres from "https://deno.land/x/postgres@v0.17.0/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET, PUT, DELETE',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json();
    const sql = body.sql;
    
    if (!sql) {
      return new Response(JSON.stringify({ error: 'Missing sql field' }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const databaseUrl = Deno.env.get('SUPABASE_DB_URL')!;
    const pool = new postgres.Pool(databaseUrl, 1, true);
    const connection = await pool.connect();
    try {
      const result = await connection.queryObject(sql);
      return new Response(JSON.stringify({ success: true, rows: result.rows }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } finally {
      connection.release();
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 });
  }
})
