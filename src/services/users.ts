import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

export type ProfileRow = Tables<"profiles">;
export type InvitationRow = Tables<"invitations">;

export async function fetchProfiles() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*, user_roles(role)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateProfile(userId: string, updates: { full_name?: string; phone?: string; document?: string; avatar_url?: string }) {
  const { data, error } = await supabase
    .from("profiles")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function uploadAvatar(userId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${userId}/avatar.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
  
  await updateProfile(userId, { avatar_url: urlData.publicUrl });
  return urlData.publicUrl;
}

export async function createInvitation(email: string, role: "admin" | "company" | "driver" | "customer", invitedBy: string) {
  const { data, error } = await supabase
    .from("invitations")
    .insert({ email, role, invited_by: invitedBy })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchInvitations() {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function validateInvitation(token: string) {
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("token", token)
    .eq("status", "pending")
    .single();
  if (error) throw error;
  if (!data) throw new Error("Convite não encontrado");
  if (new Date(data.expires_at) < new Date()) throw new Error("Convite expirado");
  return data;
}

export async function acceptInvitation(token: string, userData: { email: string; password: string; fullName: string; phone: string; document: string }) {
  // Validate invitation
  const invitation = await validateInvitation(token);

  // Sign up
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password,
    options: { data: { full_name: userData.fullName } },
  });
  if (authError) throw authError;
  if (!authData.user) throw new Error("Erro ao criar conta");

  // Update profile
  await supabase
    .from("profiles")
    .update({
      full_name: userData.fullName,
      phone: userData.phone,
      document: userData.document,
    })
    .eq("user_id", authData.user.id);

  // Assign role
  await supabase.from("user_roles").insert({
    user_id: authData.user.id,
    role: invitation.role,
  });

  // If driver role, create delivery_drivers record
  if (invitation.role === "driver") {
    await supabase.from("delivery_drivers").insert({
      user_id: authData.user.id,
    });
  }

  // If company role, create companies record
  if (invitation.role === "company") {
    await supabase.from("companies").insert({
      user_id: authData.user.id,
      name: userData.fullName,
    });
  }

  // Mark invitation accepted
  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("token", token);

  return authData;
}

export function useProfiles() {
  return useQuery({
    queryKey: ["profiles"],
    queryFn: fetchProfiles,
  });
}

export function useInvitations() {
  return useQuery({
    queryKey: ["invitations"],
    queryFn: fetchInvitations,
  });
}

export function useCreateInvitation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role, invitedBy }: { email: string; role: "admin" | "company" | "driver" | "customer"; invitedBy: string }) =>
      createInvitation(email, role, invitedBy),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invitations"] }),
  });
}
