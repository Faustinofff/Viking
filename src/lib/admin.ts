import { createClient } from "@supabase/supabase-js";

export const ADMIN_EMAIL = "viking.admin.fit@gmail.com";

export function isAdmin(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase() === ADMIN_EMAIL.toLowerCase();
}

const SUPABASE_URL = "https://xybyaiumxzwtrhggzwon.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inh5YnlhaXVteHp3dHJoZ2d6d29uIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3OTQ2NTIyNCwiZXhwIjoyMDk1MDQxMjI0fQ.ydVpccVx-yniIg_-T8FYSrLE5aB8zBXsUmKJ-I6cI28";

export function getAdminClient() {
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
}
