import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import InstallPrompt from "@/components/install-prompt";
import SplashScreen from "@/components/splash";
import DynamicPwaHead from "@/components/dynamic-pwa-head";

export const metadata: Metadata = {
  title: "Viking — Plataforma de Entrenamiento",
  description: "Plataforma premium para coaches y alumnos",
  icons: {
    icon: "/app-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <link id="pwa-manifest" rel="manifest" href="/manifest.json" />
        <link id="pwa-apple-icon" rel="apple-touch-icon" sizes="180x180" href="/app-icon.png" />
        <meta id="pwa-apple-title" name="apple-mobile-web-app-title" content="Viking" />
        <link rel="preload" href="/app-icon.png" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `('serviceWorker' in navigator)&&navigator.serviceWorker.register('/sw.js')`,
          }}
        />
      </head>
      <body>
        <SplashScreen>
          <AuthProvider>
            {children}
            <DynamicPwaHead />
          </AuthProvider>
          <InstallPrompt />
        </SplashScreen>
      </body>
    </html>
  );
}
