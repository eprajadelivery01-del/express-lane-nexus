import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export async function fetchCompanies() {
  // Fetch only companies created by the currently logged-in admin
  const { data: { user } } = await supabase.auth.getUser();
  
  let query = supabase.from("companies").select("*").order("name");
  
  // If we have a logged-in user, scope to their subordinates
  if (user) {
    query = query.eq("created_by_admin_id", user.id);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: fetchCompanies,
  });
}


export async function fetchCompanyByUserId(userId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("user_id", userId);
  
  if (error) throw error;
  if (!data || data.length === 0) return null;
  
  return data.find(c => !c.name.toLowerCase().includes("teste")) || data[0];
}

export function useCompany(userId?: string) {
  return useQuery({
    queryKey: ["company", userId],
    queryFn: () => (userId ? fetchCompanyByUserId(userId) : null),
    enabled: !!userId,
  });
}
