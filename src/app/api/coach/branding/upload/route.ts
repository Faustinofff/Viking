import { NextRequest, NextResponse } from "next/server";
import { getAdminClient } from "@/lib/admin";
import { BRANDING_STORAGE_BUCKET, BRANDING_LOGO_MAX_BYTES, BRANDING_LOGO_TYPES, isBrandingStorageUrl } from "@/lib/branding";
import { requireBrandingCoach } from "@/lib/branding-server";

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
  const { data: existing } = await client.storage.getBucket(BRANDING_STORAGE_BUCKET);
  if (!existing) {
    const { error } = await client.storage.createBucket(BRANDING_STORAGE_BUCKET, { public: true });
    if (error && !String(error?.message ?? "").toLowerCase().includes("already")) throw error;
  }
}

// POST /api/coach/branding/upload (multipart: file) → { url }
export async function POST(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "");
  const coach = await requireBrandingCoach(token);
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
  if (!BRANDING_LOGO_TYPES.includes(file.type)) {
    return json({ error: "Formato no válido. Usá PNG, JPG o WebP." }, 400);
  }
  if (file.size > BRANDING_LOGO_MAX_BYTES) {
    return json({ error: "La imagen es muy grande. Máximo 2 MB." }, 400);
  }

  const ext = EXT_BY_TYPE[file.type] ?? "png";
  const path = `${coach.id}/logo.${ext}`;

  try {
    const client = getAdminClient();
    await ensurePublicBucket(client);

    // Limpiar logos anteriores (evita huérfanos si cambia la extensión)
    const { data: existingFiles } = await client.storage.from(BRANDING_STORAGE_BUCKET).list(coach.id);
    for (const f of existingFiles ?? []) {
      await client.storage.from(BRANDING_STORAGE_BUCKET).remove([`${coach.id}/${f.name}`]);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadErr } = await client.storage
      .from(BRANDING_STORAGE_BUCKET)
      .upload(path, buffer, { contentType: file.type, upsert: true, cacheControl: "31536000" });
    if (uploadErr) throw uploadErr;

    const { data } = client.storage.from(BRANDING_STORAGE_BUCKET).getPublicUrl(path);
    const url = data.publicUrl;
    if (!isBrandingStorageUrl(url)) return json({ error: "Error generando la URL del logo." }, 500);

    return json({ success: true, url });
  } catch (err: any) {
    return json({ error: err?.message ?? "Error subiendo el logo." }, 500);
  }
}