import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/auth-provider";
import InstallPrompt from "@/components/install-prompt";

export const metadata: Metadata = {
  title: "Viking — Plataforma de Entrenamiento",
  description: "Plataforma premium para coaches y alumnos",
  icons: {
    icon: "/app-icon.png",
    apple: {
      url: "/app-icon.png",
      sizes: "180x180",
    },
  },
  appleWebApp: {
    capable: true,
    title: "Viking",
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
        <link rel="manifest" href="/manifest.json" />
        <link rel="preload" href="/app-icon.png" as="image" />
        <script
          dangerouslySetInnerHTML={{
            __html: `('serviceWorker' in navigator)&&navigator.serviceWorker.register('/sw.js')`,
          }}
        />
      </head>
      <body>
        <AuthProvider>{children}</AuthProvider>
        <InstallPrompt />
      </body>
    </html>
  );
}
