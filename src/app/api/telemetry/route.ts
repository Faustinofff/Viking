import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { ActivityType } from "@/lib/admin-types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const VALID_TYPES = new Set<ActivityType>([
  "login", "register", "student_added", "student_removed", "student_updated",
  "routine_created", "routine_assigned", "routine_deleted",
  "nutrition_created", "nutrition_assigned", "nutrition_deleted",
  "session_created", "exercise_created", "red_created",
  "weight_updated", "ai_used", "export", "settings", "other",
]);

const ACTIVITY_CAP = 200;

function extractBlob(profile: any): { blob: Record<string, any>; originalUrl: string } {
  let blob: Record<string, any> = {};
  let originalUrl = "";
  if (profile?.avatar_url) {
    try {
      const parsed = JSON.parse(profile.avatar_url);
      if (typeof parsed === "object" && !Array.isArray(parsed)) {
        blob = parsed;
        originalUrl = blob._url ?? "";
      }
    } catch {
      originalUrl = profile.avatar_url;
    }
  }
  return { blob, originalUrl };
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const publicClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await publicClient.auth.getUser(authHeader);
    if (userError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { type, message, meta } = await req.json();
    if (!VALID_TYPES.has(type) || typeof message !== "string" || !message.trim()) {
      return NextResponse.json({ error: "Evento inválido" }, { status: 400 });
    }

    if (!supabaseServiceKey) {
      return NextResponse.json({ error: "Telemetría no disponible" }, { status: 500 });
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const { blob, originalUrl } = extractBlob(profile);
    const now = new Date().toISOString();

    const activities = Array.isArray(blob.adminActivity) ? blob.adminActivity : [];
    activities.unshift({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ts: now,
      type,
      message,
      meta: meta && typeof meta === "object" ? meta : undefined,
    });
    if (activities.length > ACTIVITY_CAP) activities.length = ACTIVITY_CAP;
    blob.adminActivity = activities;

    if (type === "login") blob.lastLoginAt = now;
    blob.lastActivityAt = now;

    if (originalUrl) blob._url = originalUrl;

    await serviceClient
      .from("profiles")
      .update({ avatar_url: JSON.stringify(blob) })
      .eq("id", user.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
