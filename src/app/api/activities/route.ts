import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey);
}

function getPublicClient() {
  return createClient(supabaseUrl, supabaseAnonKey);
}

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

// POST: Student writes activity to their own blob (works without service key).
// Also writes to coach's blob if service key is available.
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const publicClient = getPublicClient();
    const { data: { user }, error: userError } = await publicClient.auth.getUser(authHeader);
    if (userError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { activity, completion } = await req.json();
    if (!activity) {
      return NextResponse.json({ error: "Faltan datos: activity requerido" }, { status: 400 });
    }

    // Always save to the student's own blob (works with anon key + auth)
    const studentClient = supabaseServiceKey ? getServiceClient() : getPublicClient();
    const { data: studentProfile } = await studentClient
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    let studentBlob: Record<string, any> = {};
    let studentOriginalUrl = "";
    if (studentProfile?.avatar_url) {
      try {
        const parsed = JSON.parse(studentProfile.avatar_url);
        if (typeof parsed === "object" && !Array.isArray(parsed)) {
          studentBlob = parsed;
          studentOriginalUrl = studentBlob._url ?? "";
        }
      } catch {
        studentOriginalUrl = studentProfile.avatar_url;
      }
    }

    const activities = studentBlob.activities ?? [];
    activities.unshift(activity);
    if (activities.length > 100) activities.length = 100;
    studentBlob.activities = activities;

    if (completion) {
      const studentCompletions = studentBlob.studentCompletions ?? {};
      if (!studentCompletions[user.id]) studentCompletions[user.id] = {};
      studentCompletions[user.id][completion.weekKey] = true;
      studentBlob.studentCompletions = studentCompletions;
    }

    if (studentOriginalUrl) studentBlob._url = studentOriginalUrl;

    await studentClient
      .from("profiles")
      .update({ avatar_url: JSON.stringify(studentBlob) })
      .eq("id", user.id);

    // Also try to save to coach's blob if service key is available
    if (supabaseServiceKey && activity.coachId) {
      try {
        const serviceClient = getServiceClient();
        const { data: coachProfile } = await serviceClient
          .from("profiles")
          .select("avatar_url")
          .eq("id", activity.coachId)
          .single();

        let coachBlob: Record<string, any> = {};
        let coachOriginalUrl = "";
        if (coachProfile?.avatar_url) {
          try {
            const parsed = JSON.parse(coachProfile.avatar_url);
            if (typeof parsed === "object" && !Array.isArray(parsed)) {
              coachBlob = parsed;
              coachOriginalUrl = coachBlob._url ?? "";
            }
          } catch {
            coachOriginalUrl = coachProfile.avatar_url;
          }
        }

        const coachActivities = coachBlob.activities ?? [];
        coachActivities.unshift(activity);
        if (coachActivities.length > 100) coachActivities.length = 100;
        coachBlob.activities = coachActivities;

        if (completion) {
          const coachCompletions = coachBlob.studentCompletions ?? {};
          if (!coachCompletions[user.id]) coachCompletions[user.id] = {};
          coachCompletions[user.id][completion.weekKey] = true;
          coachBlob.studentCompletions = coachCompletions;
        }

        if (coachOriginalUrl) coachBlob._url = coachOriginalUrl;

        await serviceClient
          .from("profiles")
          .update({ avatar_url: JSON.stringify(coachBlob) })
          .eq("id", activity.coachId);
      } catch {}
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

// GET: Returns activities from your own blob or from specific student blobs
// GET /api/activities → own activities
// GET /api/activities?studentIds=X,Y,Z → activities from those students (uses service key)
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!authHeader) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const publicClient = getPublicClient();
    const { data: { user }, error: userError } = await publicClient.auth.getUser(authHeader);
    if (userError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentIdsParam = searchParams.get("studentIds");
    const studentIdParam = searchParams.get("studentId");

    // If studentIds are provided, read from each student's blob using service key
    if (studentIdsParam || studentIdParam) {
      const studentIds = (studentIdsParam ?? studentIdParam ?? "").split(",").filter(Boolean);
      if (studentIds.length === 0) {
        return NextResponse.json({ activities: [] });
      }

      const client = supabaseServiceKey ? getServiceClient() : getPublicClient();
      const allActivities: any[] = [];
      const seen = new Set<string>();
      let allCompletions: Record<string, boolean> = {};

      for (const sid of studentIds) {
        try {
          const { data: profile } = await client
            .from("profiles")
            .select("avatar_url")
            .eq("id", sid)
            .maybeSingle();

          if (!profile) continue;
          const { blob } = extractBlob(profile);
          if (blob.studentCompletions?.[sid]) {
            allCompletions = { ...allCompletions, ...blob.studentCompletions[sid] };
          }
          if (!blob.activities) continue;
          for (const act of blob.activities) {
            if (!seen.has(act.id)) {
              seen.add(act.id);
              allActivities.push(act);
            }
          }
        } catch {}
      }

      allActivities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      return NextResponse.json({ activities: allActivities.slice(0, 50), completions: allCompletions });
    }

    // No studentIds: return activities from the requesting user's own blob
    const client = supabaseServiceKey ? getServiceClient() : getPublicClient();
    const { data: profile } = await client
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    const { blob } = extractBlob(profile);
    return NextResponse.json({ activities: blob.activities ?? [] });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
