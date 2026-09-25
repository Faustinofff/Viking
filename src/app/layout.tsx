import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import InstallPrompt from "@/components/install-prompt";
import SplashScreen from "@/components/splash";
import DynamicPwaHead from "@/components/dynamic-pwa-head";
import { resolvePwaBrand, UID_COOKIE, type PwaBrand } from "@/lib/pwa-ssr";

const DEFAULT_TITLE = "Viking — Plataforma de Entrenamiento";

export async function generateMetadata(): Promise<Metadata> {
  let title = DEFAULT_TITLE;
  try {
    const uid = cookies().get(UID_COOKIE)?.value ?? null;
    const brand = await resolvePwaBrand(uid);
    if (brand.name && brand.name !== "Viking") title = brand.name;
  } catch {}
  return {
    title,
    description: "Plataforma premium para coaches y alumnos",
    icons: { icon: "/app-icon.png" },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let brand: PwaBrand = { name: "Viking", color: "#0a0a0a", icon: "/app-icon.png", icon192: "/app-icon.png", icon512: "/app-icon.png" };
  try {
    const uid = cookies().get(UID_COOKIE)?.value ?? null;
    brand = await resolvePwaBrand(uid);
  } catch {}
  return (
    <html lang="es" className="dark" style={{ background: "#0a0a0b" }}>
      <head>
        <link id="pwa-manifest" rel="manifest" href="/api/pwa-manifest" />
        <link id="pwa-apple-icon" rel="apple-touch-icon" sizes="180x180" href={brand.icon} />
        <meta id="pwa-apple-title" name="apple-mobile-web-app-title" content={brand.name} />
        <meta id="pwa-app-name" name="application-name" content={brand.name} />
        <link rel="preload" href="/app-icon.png" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
/* Reload de branding SSR ANTES del primer paint: si el usuario ya tiene
   cookie (viking_uid), la primera carga recarga el HTML para que el server
   entregue el branding correcto. Así el splash se ve UNA sola vez, ya con
   la marca, y nunca "Viking → recarga → marca". Misma condición que usa
   AuthProvider (sessionStorage viking_ssr_reloaded), para que AuthProvider
   no tenga que recargar después. */
try{
  if(location.pathname.indexOf('/auth/')===0){return;}
  if(document.cookie.indexOf('viking_uid=')===-1){return;}
  if((sessionStorage.getItem('viking_ssr_reloaded')||'0')==='1'){return;}
  sessionStorage.setItem('viking_ssr_reloaded','1');
  location.replace(location.href);
}catch(e){}
})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){
function apply(){
try{
  var cid=localStorage.getItem('viking_student_coach');
  if(!cid) return;
  var coaches=JSON.parse(localStorage.getItem('viking_coaches')||'{}');
  var b=coaches[cid]&&coaches[cid].branding;
  if(!b) return;
  var name=b.brandName&&b.brandName.trim()?b.brandName.trim():'Viking';
  var icon=(b.brandIcon180||b.brandLogoUrl||'/app-icon.png');
  var color=b.brandColor||null;
  var t=document.getElementById('pwa-apple-title'); if(t) t.content=name;
  var an=document.getElementById('pwa-app-name'); if(an) an.content=name;
  var il=document.getElementById('pwa-apple-icon'); if(il) il.href=icon;
  document.title=name;
  if(color){var tm=document.querySelector('meta[name="theme-color"]'); if(tm) tm.setAttribute('content',color);}
}catch(e){}
}
apply();
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',apply);}
setTimeout(apply,0); setTimeout(apply,200);
})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `('serviceWorker' in navigator)&&navigator.serviceWorker.register('/sw.js')`,
          }}
        />
      </head>
      <body>
        <AuthProvider>
          <SplashScreen>
            {children}
            <DynamicPwaHead />
            <InstallPrompt />
          </SplashScreen>
        </AuthProvider>
      </body>
    </html>
  );
}
