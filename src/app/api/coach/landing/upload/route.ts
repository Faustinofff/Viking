import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin";
import { PAGINA_WEB_STORAGE_BUCKET, PAGINA_WEB_PORTADA_MAX_BYTES, PAGINA_WEB_PORTADA_TYPES } from "@/lib/pagina-web";
import { requireLandingCoach, isLandingStorageUrl } from "@/lib/landing-server";

export const dynamic = "force-dynamic";

const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

async function ensurePublicBucket(client: any) {
  const { data: existing } = await client.storage.getBucket(PAGINA_WEB_STORAGE_BUCKET);
  if (!existing) {
    const { error } = await client.storage.createBucket(PAGINA_WEB_STORAGE_BUCKET, { public: true });
    if (error && !String(error?.message ?? "").toLowerCase().includes("already")) throw error;
  }
}

// POST /api/coach/landing/upload (multipart: file) → { url }
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const coach = await requireLandingCoach(token);
  if (!coach) return json({ error: "No autorizado" }, 401);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ error: "FormData inválido" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File) || !file.size) {
    return json({ error: "Subí una imagen (PNG, JPG o WebP)." }, 400);
  }
  if (!PAGINA_WEB_PORTADA_TYPES.includes(file.type)) {
    return json({ error: "Formato no válido. Usá PNG, JPG o WebP." }, 400);
  }
  if (file.size > PAGINA_WEB_PORTADA_MAX_BYTES) {
    return json({ error: "La imagen es muy grande. Máximo 5 MB." }, 400);
  }

  const ext = EXT_BY_TYPE[file.type] ?? "png";
  const kind = form.get("kind") === "galeria" ? "galeria" : "portada";
  const nonce = Date.now();
  const prefix = kind === "galeria" ? "galeria" : "portada";
  const path = `${coach.id}/${prefix}-${nonce}.${ext}`;

  try {
    const client = getAdminClient();
    await ensurePublicBucket(client);

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await client.storage
      .from(PAGINA_WEB_STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true, cacheControl: "31536000" });
    if (uploadErr) throw uploadErr;

    const { data } = client.storage.from(PAGINA_WEB_STORAGE_BUCKET).getPublicUrl(path);
    const url = data.publicUrl;
    if (!isLandingStorageUrl(url)) return json({ error: "Error generando la URL de la portada." }, 500);

    return json({ success: true, url });
  } catch (err: any) {
    return json({ error: err?.message ?? "Error subiendo la portada." }, 500);
  }
}