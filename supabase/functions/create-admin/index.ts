import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { email, password } = await req.json();

  // Create user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError) return new Response(JSON.stringify({ error: authError.message }), { status: 400 });

  const userId = authData.user.id;

  // Create profile
  await supabase.from("profiles").upsert({
    user_id: userId,
    full_name: "Admin É Pra Já",
  });

  // Assign admin role
  await supabase.from("user_roles").insert({
    user_id: userId,
    role: "admin",
  });

  return new Response(JSON.stringify({ success: true, userId }), {
    headers: { "Content-Type": "application/json" },
  });
});
