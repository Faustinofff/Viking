import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "viking.admin.fit@gmail.com";

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getServiceClient() {
  if (supabaseServiceKey) return createClient(supabaseUrl, supabaseServiceKey);
  return createClient(supabaseUrl, supabaseAnonKey);
}

export async function requireAdmin(req: Request): Promise<{ id: string; email: string }> {
  const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
  if (!authHeader) throw new Error("No token");

  const anonClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user }, error } = await anonClient.auth.getUser(authHeader);
  if (error || !user) throw new Error("Invalid token");
  if (!isAdmin(user.email)) throw new Error("Unauthorized");
  return { id: user.id, email: user.email! };
}

export function getProfilesClient() {
  return getServiceClient();
}
