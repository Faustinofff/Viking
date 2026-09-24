import { supabase } from "./supabase";

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${window.location.origin}/login` },
  });
  if (error) throw error;
  return data;
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export function onAuthStateChange(callback: (event: string, session: any) => void) {
  return supabase.auth.onAuthStateChange(callback);
}

/** Cookie para que el servidor (SSR) renderice el branding PWA del usuario. */
export function setUidCookie(uid: string) {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `viking_uid=${encodeURIComponent(uid)}; path=/; max-age=2592000; SameSite=Lax`;
  } catch {}
}

export function clearUidCookie() {
  if (typeof document === "undefined") return;
  try {
    document.cookie = "viking_uid=; path=/; max-age=0";
  } catch {}
}
