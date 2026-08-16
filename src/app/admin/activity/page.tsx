"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import type { AdminEvent } from "@/lib/admin-types";
import { ACTIVITY_GROUPS } from "@/lib/admin-types";
import { Spinner, ErrorState, EmptyState } from "../_components/ui";
import { ActivityFeed } from "../_components/activity";

type Range = "today" | "7d" | "30d" | "all";

const RANGES: { id: Range; label: string }[] = [
  { id: "today", label: "Hoy" },
  { id: "7d", label: "7 días" },
  { id: "30d", label: "30 días" },
  { id: "all", label: "Todo" },
];

export default function AdminActivityPage() {
  const [feed, setFeed] = useState<AdminEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [group, setGroup] = useState<string>("all");
  const [range, setRange] = useState<Range>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (group !== "all") params.set("group", group);
      if (range !== "all") params.set("range", range);
      const r = await fetch(`/api/admin/activity?${params.toString()}`);
      const d = await r.json();
      if (d.error) setError(d.error);
      else setFeed(d.feed ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
    }
    setLoading(false);
  }, [group, range]);

  useEffect(() => {
    load();
  }, [load]);

  const todayCount = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return feed.filter((e) => new Date(e.ts).getTime() >= start.getTime()).length;
  }, [feed]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Actividad</h1>
          <p className="text-xs text-white/40">Registro global de acciones en Viking</p>
        </div>
        <div className="ml-auto text-xs text-white/30">
          {loading ? "Cargando..." : `${feed.length} acciones · ${todayCount} hoy`}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-1 flex-wrap">
          {ACTIVITY_GROUPS.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroup(g.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                group === g.id ? "bg-accent/15 text-accent" : "text-white/45 hover:text-white/80"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-1">
          {RANGES.map((r) => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                range === r.id ? "bg-white/10 text-white" : "text-white/45 hover:text-white/80"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={load} className="btn-secondary !py-2 !px-3 text-xs ml-auto">
          ⟳ Actualizar
        </button>
      </div>

      {error ? (
        <ErrorState message={error} />
      ) : loading ? (
        <Spinner className="min-h-[40vh]" />
      ) : (
        <div className="rounded-2xl bg-bg-secondary/80 border border-white/[0.06] p-2 md:p-4">
          {feed.length === 0 ? (
            <EmptyState title="Sin actividad" sub="No hay acciones registradas con estos filtros" />
          ) : (
            <ActivityFeed events={feed.slice(0, 100)} showActor />
          )}
        </div>
      )}
    </div>
  );
}
