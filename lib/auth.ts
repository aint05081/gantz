import { supabase } from "./supabaseClient";

export async function getCurrentEmail(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.email ?? null;
}

export async function isAdmin(): Promise<boolean> {
  const email = await getCurrentEmail();
  return email === "2601@gantz.com";
}

export async function logout(): Promise<void> {
  await supabase.auth.signOut();
}
