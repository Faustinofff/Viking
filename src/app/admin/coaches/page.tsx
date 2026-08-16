"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import type { AdminCoach } from "@/lib/admin-types";
import { Spinner, ErrorState, Badge, Avatar, EmptyState, formatDate, TimeAgo, StatCard } from "../_components/ui";

type SortKey = "name" | "created" | "activity" | "students" | "premium";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "activity", label: "Actividad" },
  { id: "students", label: "Alumnos" },
  { id: "premium", label: "Premium" },
  { id: "created", label: "Registro" },
  { id: "name", label: "Nombre" },
];

export default function AdminCoachesPage() {
  const [coaches, setCoaches] = useState<AdminCoach[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "no_recent" | "inactive">("all");
  const [sort, setSort] = useState<SortKey>("activity");
  const [asc, setAsc] = useState(false);

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/coaches");
      const d = await r.json();
      if (d.error) setError(d.error);
      else setCoaches(d.coaches ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    let list = coaches.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (query && !c.name.toLowerCase().includes(query) && !c.email.toLowerCase().includes(query)) return false;
      return true;
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      switch (sort) {
        case "name": cmp = a.name.localeCompare(b.name); break;
        case "created": cmp = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(); break;
        case "activity": cmp = (b.activity30d ?? 0) - (a.activity30d ?? 0); break;
        case "students": cmp = b.studentCount - a.studentCount; break;
        case "premium":
          cmp = (b.isPremiumActive ? 1 : 0) - (a.isPremiumActive ? 1 : 0) || (b.premiumDaysLeft ?? -1) - (a.premiumDaysLeft ?? -1);
          break;
      }
      return asc ? -cmp : cmp;
    });
    return list;
  }, [coaches, q, statusFilter, sort, asc]);

  const counts = useMemo(() => ({
    total: coaches.length,
    active: coaches.filter((c) => c.status === "active").length,
    noRecent: coaches.filter((c) => c.status === "no_recent").length,
    inactive: coaches.filter((c) => c.status === "inactive").length,
  }), [coaches]);

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message={error} /></div>;

  const statusTone = (s: AdminCoach["status"]) => (s === "active" ? "green" : s === "no_recent" ? "yellow" : "gray");
  const statusLabel = (s: AdminCoach["status"]) => (s === "active" ? "Activo" : s === "no_recent" ? "Baja" : "Inactivo");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Coaches</h1>
          <p className="text-xs text-white/40">Todos los coaches registrados en Viking</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="input !py-2 !px-3 w-52 md:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="input !py-2 !px-3 w-auto"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="no_recent">Baja actividad</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Coaches" value={counts.total} tone="accent" />
        <StatCard label="Activos" value={counts.active} sub="Actividad < 7d" tone="green" />
        <StatCard label="Baja Actividad" value={counts.noRecent} sub="7–30d" tone="yellow" />
        <StatCard label="Inactivos" value={counts.inactive} sub="> 30d" tone="red" />
      </div>

      <div className="rounded-2xl bg-bg-secondary/80 border border-white/[0.06] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
          <span>Coach</span>
          <span className="w-24 text-right">Estado</span>
          <span className="w-24 text-right">Alumnos</span>
          <span className="w-28 text-right">Actividad 30d</span>
          <span className="w-28 text-right">Premium</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Sin coaches" sub="No se encontraron coaches con esos filtros" />
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/admin/coaches/${c.id}`}
                className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto_auto_auto] gap-2 md:gap-3 items-center px-4 py-3 hover:bg-white/[0.03] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={c.name} size={38} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{c.name}</p>
                    <p className="text-xs text-white/40 truncate">{c.email}</p>
                    <p className="text-[11px] text-white/25 mt-0.5 md:hidden">
                      {statusLabel(c.status)} · {c.studentCount} alumnos · {c.activity30d} actividades
                    </p>
                  </div>
                </div>
                <div className="md:w-24 md:text-right flex md:block items-center gap-2">
                  <Badge tone={statusTone(c.status)}>{statusLabel(c.status)}</Badge>
                </div>
                <div className="md:w-24 md:text-right text-sm text-white/70">{c.studentCount}</div>
                <div className="md:w-28 md:text-right flex md:block items-center gap-2 text-xs">
                  <span className="text-white/70">{c.activity30d}</span>
                  {c.lastActivityAt ? <TimeAgo date={c.lastActivityAt} className="text-white/25 md:hidden" /> : null}
                </div>
                <div className="md:w-28 md:text-right">
                  {c.isFreeCoach ? (
                    <Badge tone="purple">Gratuito</Badge>
                  ) : c.isPremiumActive ? (
                    <Badge tone={c.premiumDaysLeft !== null && c.premiumDaysLeft <= 7 ? "orange" : "yellow"}>
                      {c.premiumDaysLeft !== null && c.premiumDaysLeft >= 0 ? `${c.premiumDaysLeft}d` : "Premium"}
                    </Badge>
                  ) : c.premium ? (
                    <Badge tone="red">Vencido</Badge>
                  ) : (
                    <Badge tone="gray">—</Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {SORTS.map((s) => (
          <button
            key={s.id}
            onClick={() => {
              if (sort === s.id) setAsc(!asc);
              else {
                setSort(s.id);
                setAsc(false);
              }
            }}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${
              sort === s.id
                ? "bg-accent/10 text-accent border-accent/20"
                : "bg-white/[0.03] text-white/40 border-white/[0.06] hover:text-white/70"
            }`}
          >
            Ordenar: {s.label} {sort === s.id ? (asc ? "↑" : "↓") : ""}
          </button>
        ))}
      </div>

      <p className="text-xs text-white/30">
        {filtered.length} de {coaches.length} coaches
      </p>
    </div>
  );
}
