"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useConfirmToast } from "@/components/toast";

interface CoachRow {
  id: string;
  email: string;
  display_name: string;
  branding_enabled: boolean;
  created_at: string;
}

type Filter = "all" | "enabled" | "disabled";

export default function AdminBrandingPage() {
  const [coaches, setCoaches] = useState<CoachRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast, ToastUI } = useConfirmToast();

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/admin/branding?ts=${Date.now()}`, { cache: "no-store" });
      const data = await r.json();
      if (data.error) {
        setError(data.error);
        setCoaches([]);
      } else {
        setCoaches(data.coaches ?? []);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30000);
    return () => clearInterval(id);
  }, [load]);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) load();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [load]);

  const toggle = async (c: CoachRow) => {
    setUpdating(c.id);
    try {
      const r = await fetch("/api/admin/branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: c.id, enabled: !c.branding_enabled }),
      });
      const data = await r.json();
      if (data.error) {
        toast(data.error, "error");
        return;
      }
      setCoaches((prev) => prev.map((p) => (p.id === c.id ? { ...p, branding_enabled: data.branding_enabled } : p)));
      toast(c.branding_enabled
        ? `Permiso retirado a ${c.display_name}`
        : `Personalización activada para ${c.display_name}`);
    } catch {
      toast("Error al cambiar el permiso", "error");
    } finally {
      setUpdating(null);
    }
  };

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return coaches.filter((c) => {
      if (filter === "enabled" && !c.branding_enabled) return false;
      if (filter === "disabled" && c.branding_enabled) return false;
      if (q && !c.email.toLowerCase().includes(q) && !c.display_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [coaches, filter, search]);

  const enabledCount = coaches.filter((c) => c.branding_enabled).length;

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-white">Personalización</h1>
        <p className="text-sm text-white/40 mt-0.5">
          Otorgá a los coaches que elijas acceso a la sección &quot;Personalización&quot; (logo y marca en la app de sus alumnos).
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex gap-2 border-b border-white/[0.06] pb-2 sm:border-b-0 sm:pb-0">
          {(["all", "enabled", "disabled"] as Filter[]).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === f ? "bg-accent/10 text-accent border border-accent/20" : "text-white/40 hover:text-white/60"
              }`}>
              {f === "all" ? "Todos" : f === "enabled" ? `Habilitados (${enabledCount})` : "Deshabilitados"}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input w-full sm:max-w-xs sm:ml-auto"
        />
      </div>

      {error && (
        <div className="card bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-white/40 text-sm">
          No se encontraron coaches
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className="card flex flex-col md:flex-row md:items-center gap-3 p-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent flex-shrink-0">
                  {c.display_name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{c.display_name}</p>
                  <p className="text-xs text-white/40 truncate">{c.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                {c.branding_enabled ? (
                  <span className="text-[10px] font-bold bg-accent/20 text-accent px-2 py-0.5 rounded-full">
                    Permiso activado
                  </span>
                ) : (
                  <span className="text-[10px] font-bold bg-white/[0.06] text-white/40 px-2 py-0.5 rounded-full">
                    Sin permiso
                  </span>
                )}
                <button
                  onClick={() => toggle(c)}
                  disabled={updating === c.id}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all ${
                    c.branding_enabled
                      ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                      : "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                  } ${updating === c.id ? "opacity-50" : ""}`}
                >
                  {updating === c.id ? "..." : c.branding_enabled ? "Quitar permiso" : "Activar"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {ToastUI}
    </div>
  );
}