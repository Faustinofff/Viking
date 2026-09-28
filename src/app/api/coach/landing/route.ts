import { NextRequest, NextResponse } from "next/server";
import {
  parseCoachLanding,
  serializeCoachLanding,
  normalizarSlug,
} from "@/lib/pagina-web";
import { requireLandingCoach, isLandingStorageUrl, landingSlugOcupado, clearCoachLanding, pruneLandingFiles } from "@/lib/landing-server";
import { readCoachBlob, writeCoachBlob } from "@/lib/branding-server";
import { PAGINA_WEB_GALERIA_MAX } from "@/lib/pagina-web";

export const dynamic = "force-dynamic";

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

// GET /api/coach/landing → landing actual del coach autenticado (pilot)
export async function GET(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const coach = await requireLandingCoach(token);
  if (!coach) return json({ error: "No autorizado" }, 401);

  const { blob } = await readCoachBlob(coach.id);
  return json({ landing: parseCoachLanding(blob.landing) });
}

// PUT /api/coach/landing → guarda la landing (slug, portada, descripción, WhatsApp)
export async function PUT(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const coach = await requireLandingCoach(token);
  if (!coach) return json({ error: "No autorizado" }, 401);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "JSON inválido" }, 400);
  }

  const slug = normalizarSlug(body?.slug ?? "");
  if (!slug) {
    return json({ error: "Escribí un nombre para el enlace de tu página." }, 400);
  }

  const parsed = parseCoachLanding({ ...body, slug });
  const landing = parsed ?? {
    slug,
    portadaUrl: null,
    descripcion: "",
    sobreMi: "",
    galeria: [],
    instagram: "",
    whatsapp: "",
    whatsappText: "",
  };
  landing.slug = slug;

  const storageUrls = [landing.portadaUrl, ...landing.galeria].filter(Boolean) as string[];
  if (storageUrls.some((u) => !isLandingStorageUrl(u))) {
    return json({ error: "La URL de una foto no es válida." }, 400);
  }
  if (landing.galeria.length > PAGINA_WEB_GALERIA_MAX) {
    return json({ error: `Podés subir hasta ${PAGINA_WEB_GALERIA_MAX} fotos en la galería.` }, 400);
  }

  if (await landingSlugOcupado(slug, coach.id)) {
    return json({ error: "Ese enlace ya lo usa otro coach. Probá con otro nombre." }, 409);
  }

  const { blob, originalUrl } = await readCoachBlob(coach.id);
  blob.landing = serializeCoachLanding(landing);
  const ok = await writeCoachBlob(coach.id, blob, originalUrl);
  if (!ok) return json({ error: "Error guardando la página web" }, 500);

  await pruneLandingFiles(coach.id, storageUrls);

  return json({ success: true, landing, url: `/l/${slug}` });
}

// DELETE /api/coach/landing → quita la página web pública
export async function DELETE(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const coach = await requireLandingCoach(token);
  if (!coach) return json({ error: "No autorizado" }, 401);

  const ok = await clearCoachLanding(coach.id);
  if (!ok) return json({ error: "Error quitando la página web" }, 500);

  await pruneLandingFiles(coach.id, []);
  return json({ success: true });
}