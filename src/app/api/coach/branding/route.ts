import { NextRequest, NextResponse } from "next/server";
import { parseCoachBranding, serializeCoachBranding, CoachBranding } from "@/lib/branding";
import { requireBrandingCoach, readCoachBlob, writeCoachBlob, isBrandingStorageUrl } from "@/lib/branding-server";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// GET /api/coach/branding → branding actual del coach autenticado
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const coach = await requireBrandingCoach(token);
  if (!coach) return json({ error: "No autorizado" }, 401);

  const { blob } = await readCoachBlob(coach.id);
  return json({ branding: parseCoachBranding(blob.branding) });
}

// PUT /api/coach/branding → guarda { brandName?, brandLogoUrl?, brandColor? }
export async function PUT(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const coach = await requireBrandingCoach(token);
  if (!coach) return json({ error: "No autorizado" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const branding = parseCoachBranding(body);
  if (body && typeof body === "object" && branding) {
    const { brandLogoUrl } = branding;
    if (brandLogoUrl && !isBrandingStorageUrl(brandLogoUrl)) {
      return json({ error: "La URL del logo no es válida." }, 400);
    }
  }

  const { blob, originalUrl } = await readCoachBlob(coach.id);
  if (branding) {
    blob.branding = serializeCoachBranding(branding as CoachBranding);
  } else {
    delete blob.branding;
  }
  const ok = await writeCoachBlob(coach.id, blob, originalUrl);
  if (!ok) return json({ error: "Error guardando el branding" }, 500);

  return json({ success: true, branding: branding });
}