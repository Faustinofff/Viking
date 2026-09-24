import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { resolvePwaBrand, UID_COOKIE } from "@/lib/pwa-ssr";

/** Manifest PWA servido según la cookie del usuario (marca del coach o Viking por defecto).
 * Si el manifest está referenciado en el HTML original del servidor, iOS/Android
 * toman el nombre e íconos de la marca al agregar la app al inicio. */
export async function GET() {
  let brand;
  try {
    const uid = cookies().get(UID_COOKIE)?.value ?? null;
    brand = await resolvePwaBrand(uid);
  } catch {
    brand = null;
  }
  const b = brand ?? { name: "Viking", color: "#0a0a0a", icon: "/app-icon.png", icon192: "/app-icon.png", icon512: "/app-icon.png" };

  const manifest = {
    name: b.name,
    short_name: b.name.slice(0, 12),
    description: "Plataforma premium de entrenamiento para coaches y alumnos",
    start_url: "/login",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    scope: "/",
    id: "/",
    background_color: "#0a0a0a",
    theme_color: b.color,
    orientation: "portrait",
    icons: [
      { src: b.icon192, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: b.icon512, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: b.icon192, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: b.icon512, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };

  return new NextResponse(JSON.stringify(manifest), {
    headers: {
      "Content-Type": "application/manifest+json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}