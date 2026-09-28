import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getLandingPageData, getSiteBaseUrl } from "@/lib/landing-server";

export const dynamic = "force-dynamic";

function baseUrl(): string {
  const env = getSiteBaseUrl();
  if (env) return env;
  try {
    const h = headers();
    const proto = h.get("x-forwarded-proto") ?? "https";
    const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
    return `${proto}://${host}`;
  } catch {
    return "https://viking.fit";
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const c = hex.replace("#", "");
  const full = c.length === 3 ? c.split("").map((x) => x + x).join("") : c;
  const n = parseInt(full || "00d4aa", 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const data = await getLandingPageData(params.slug);
  if (!data) return { title: "Página no encontrada" };

  const brandName = data.branding?.brandName?.trim();
  const nombre = brandName || data.nombre;
  const descripcion = data.landing.descripcion || `Conocé a ${nombre} y empezá a entrenar.`;
  const ogImage = data.landing.portadaUrl ?? data.branding?.brandLogoUrl ?? "/app-icon.png";
  const base = baseUrl();
  const imageUrl = ogImage.startsWith("http") ? ogImage : `${base}${ogImage}`;

  return {
    title: `${nombre} · Entrenamiento`,
    description: descripcion,
    openGraph: {
      title: nombre,
      description: descripcion,
      url: `${base}/l/${params.slug}`,
      images: [{ url: imageUrl }],
      type: "website",
    },
  };
}

const WhatsAppIcon = (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z" />
  </svg>
);

const InstagramIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5" aria-hidden="true">
    <rect x="2" y="2" width="20" height="20" rx="5" />
    <circle cx="12" cy="12" r="4.2" />
    <circle cx="17.3" cy="6.7" r="0.8" fill="currentColor" stroke="none" />
  </svg>
);

export default async function LandingPageWeb({ params }: { params: { slug: string } }) {
  const data = await getLandingPageData(params.slug);
  if (!data) notFound();

  const { landing, branding } = data;
  const nombre = branding?.brandName?.trim() || data.nombre;
  const logo = branding?.brandLogoUrl || "/Viking.png";
  const color = branding?.brandColor || "#00d4aa";
  const circleShape = branding?.brandLogoShape === "circle";
  const waDigits = landing.whatsapp;
  const waHref = waDigits
    ? `https://wa.me/${waDigits}?text=${encodeURIComponent(landing.whatsappText || "Hola, vengo de tu página web.")}`
    : null;
  const igHref = landing.instagram ? `https://instagram.com/${landing.instagram}` : null;
  const año = new Date().getFullYear();
  const primerContenido = landing.sobreMi ? "sobre-mi" : "galeria";

  return (
    <main className="relative min-h-screen flex flex-col bg-bg-primary text-white">
      {/* HERO */}
      <section className="relative min-h-[100dvh] flex items-center justify-center px-6 py-16 overflow-hidden">
        {landing.portadaUrl ? (
          <>
            <img src={landing.portadaUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/55 to-black/85" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse 80% 60% at 50% -10%, ${hexToRgba(color, 0.22)}, transparent 60%)` }}
          />
        )}

        <div className="relative w-full max-w-md flex flex-col items-center text-center gap-6">
          <div
            className={`w-24 h-24 flex items-center justify-center overflow-hidden bg-white/[0.06] border border-white/15 backdrop-blur-md ${circleShape ? "rounded-full" : "rounded-2xl"}`}
          >
            <img src={logo} alt={nombre} className="w-20 h-20 object-contain" />
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight drop-shadow">{nombre}</h1>
            <p className="text-sm font-medium text-white/60 drop-shadow">Entrenamiento personalizado</p>
          </div>

          {landing.descripcion && (
            <p className="text-base leading-relaxed text-white/80 whitespace-pre-line drop-shadow">{landing.descripcion}</p>
          )}

          {waHref && (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] text-bg-primary font-bold px-8 py-3.5 text-base shadow-lg shadow-black/30 hover:bg-[#1fb95a] active:scale-[0.98] transition-all"
            >
              {WhatsAppIcon}
              Chatear por WhatsApp
            </a>
          )}

          {(landing.sobreMi || landing.galeria.length > 0 || igHref) && (
            <a
              href={`#${primerContenido}`}
              className="mt-2 inline-flex items-center gap-2 text-xs text-white/50 hover:text-white/80 transition-colors"
            >
              <span className="w-5 h-5 rounded-full border border-white/25 flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3"><path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </span>
              Conocé más
            </a>
          )}
        </div>
      </section>

      {/* CONTENIDO */}
      {landing.sobreMi && (
        <section id="sobre-mi" className="relative px-6 py-14 max-w-xl mx-auto w-full scroll-mt-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Sobre mí</h2>
          <div className="mt-4 text-lg leading-relaxed text-white/85 whitespace-pre-line">{landing.sobreMi}</div>
        </section>
      )}

      {landing.galeria.length > 0 && (
        <section id="galeria" className="relative px-6 py-14 max-w-xl mx-auto w-full">
          <h2 className="text-sm font-bold uppercase tracking-widest text-white/40">Así entreno</h2>
          <div className={`mt-4 grid gap-3 ${landing.galeria.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
            {landing.galeria.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`Foto ${i + 1}`}
                className={`w-full object-cover rounded-2xl border border-white/[0.08] ${landing.galeria.length === 1 ? "aspect-[16/9]" : "aspect-square"}`}
              />
            ))}
          </div>
        </section>
      )}

      {/* CONTACTO */}
      {(waHref || igHref) && (
        <section className="relative px-6 py-16 max-w-xl mx-auto w-full text-center">
          <h2 className="text-2xl font-bold">¿Empezamos?</h2>
          <div className="mt-6 flex flex-col items-center gap-3">
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 w-full max-w-xs rounded-2xl bg-[#25D366] text-bg-primary font-bold px-8 py-3.5 shadow-lg shadow-black/30 hover:bg-[#1fb95a] active:scale-[0.98] transition-all"
              >
                {WhatsAppIcon}
                Chatear por WhatsApp
              </a>
            )}
            {igHref && (
              <a
                href={igHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2.5 w-full max-w-xs rounded-2xl bg-white/[0.06] border border-white/[0.08] font-semibold px-8 py-3.5 hover:bg-white/[0.1] active:scale-[0.98] transition-all"
              >
                <span className="text-white/90">{InstagramIcon}</span>
                Seguime en Instagram
              </a>
            )}
          </div>
        </section>
      )}

      {/* FOOTER */}
      <footer className="mt-auto px-6 py-8 text-center border-t border-white/[0.06]">
        <p className="text-xs text-white/35">
          © {año} {nombre} · Todos los derechos reservados
        </p>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-white/25">
          Hecho con <span className="text-white/50 font-semibold tracking-wide">VIKING</span>
        </p>
      </footer>
    </main>
  );
}