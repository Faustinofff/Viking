"use client";

export default function AppLoader() {
  return (
    <div
      className="min-h-screen bg-bg-primary flex items-center justify-center"
      role="status"
      aria-label="Viking se está cargando"
    >
      <div className="flex flex-col items-center gap-5">
        <div className="relative flex items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <div className="w-4 h-4 rounded-lg bg-accent animate-pulse" />
          </div>
        </div>
        <div className="w-28 h-1 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full w-1/2 bg-accent/70 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}