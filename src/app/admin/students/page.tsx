"use client";
import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import type { AdminStudent } from "@/lib/admin-types";
import { Spinner, ErrorState, Badge, Avatar, EmptyState, formatDate, TimeAgo, StatCard } from "../_components/ui";

export default function AdminStudentsPage() {
  const [students, setStudents] = useState<AdminStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "no_recent" | "inactive">("all");
  const [coachFilter, setCoachFilter] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/students");
      const d = await r.json();
      if (d.error) setError(d.error);
      else setStudents(d.students ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const coaches = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of students) if (s.coachId && s.coachName) map.set(s.coachId, s.coachName);
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [students]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return students
      .filter((s) => {
        if (statusFilter !== "all" && s.status !== statusFilter) return false;
        if (coachFilter !== "all" && s.coachId !== coachFilter) return false;
        if (query && !s.name.toLowerCase().includes(query) && !s.email.toLowerCase().includes(query)) return false;
        return true;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [students, q, statusFilter, coachFilter]);

  const counts = useMemo(() => ({
    total: students.length,
    active: students.filter((s) => s.status === "active").length,
    linked: students.filter((s) => s.coachId).length,
    unlinked: students.filter((s) => !s.coachId).length,
  }), [students]);

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message={error} /></div>;

  const statusTone = (s: AdminStudent["status"]) => (s === "active" ? "green" : s === "no_recent" ? "yellow" : "gray");
  const statusLabel = (s: AdminStudent["status"]) => (s === "active" ? "Activo" : s === "no_recent" ? "Baja" : "Inactivo");

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Alumnos</h1>
          <p className="text-xs text-white/40">Todos los alumnos de la plataforma</p>
        </div>
        <div className="ml-auto flex items-center gap-2 flex-wrap">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre o email..."
            className="input !py-2 !px-3 w-48 md:w-64"
          />
          <select
            value={coachFilter}
            onChange={(e) => setCoachFilter(e.target.value)}
            className="input !py-2 !px-3 w-auto max-w-[180px]"
          >
            <option value="all">Todos los coaches</option>
            {coaches.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
            <option value="none">Sin coach</option>
          </select>
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
        <StatCard label="Total Alumnos" value={counts.total} tone="accent" />
        <StatCard label="Activos" value={counts.active} sub="Actividad < 7d" tone="green" />
        <StatCard label="Con Coach" value={counts.linked} sub="Vinculados" tone="blue" />
        <StatCard label="Sin Coach" value={counts.unlinked} sub="Sin vínculo" tone="red" />
      </div>

      <div className="rounded-2xl bg-bg-secondary/80 border border-white/[0.06] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_1fr_auto_auto_auto] gap-3 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-white/30 border-b border-white/[0.06]">
          <span>Alumno</span>
          <span>Coach</span>
          <span className="w-24 text-right">Rutina</span>
          <span className="w-24 text-right">Estado</span>
          <span className="w-28 text-right">Última actividad</span>
        </div>
        {filtered.length === 0 ? (
          <EmptyState title="Sin alumnos" sub="No se encontraron alumnos con esos filtros" />
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {filtered.map((s) => (
              <Link
                key={s.id}
                href={`/admin/students/${s.id}`}
                className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto_auto_auto] gap-2 md:gap-3 items-center px-4 py-3 hover:bg-white/[0.03] transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={s.name} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white truncate">{s.name}</p>
                    <p className="text-xs text-white/40 truncate">{s.email}</p>
                    <p className="text-[11px] text-white/25 mt-0.5 md:hidden">
                      {s.coachName ?? "Sin coach"} · {statusLabel(s.status)}
                    </p>
                  </div>
                </div>
                <div className="min-w-0 truncate text-sm text-white/60">
                  {s.coachName ? (
                    s.coachId ? (
                      <Link href={`/admin/coaches/${s.coachId}`} onClick={(e) => e.stopPropagation()} className="hover:text-accent transition-all">
                        {s.coachName}
                      </Link>
                    ) : s.coachName
                  ) : (
                    <Badge tone="gray">Sin coach</Badge>
                  )}
                </div>
                <div className="md:w-24 md:text-right">
                  {s.currentRoutine ? <Badge tone="green">{s.currentRoutine.name}</Badge> : <Badge tone="gray">Sin rutina</Badge>}
                </div>
                <div className="md:w-24 md:text-right">
                  <Badge tone={statusTone(s.status)}>{statusLabel(s.status)}</Badge>
                </div>
                <div className="md:w-28 md:text-right text-xs text-white/40">
                  {s.lastActivityAt ? <TimeAgo date={s.lastActivityAt} /> : "Nunca"}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <p className="text-xs text-white/30">{filtered.length} de {students.length} alumnos</p>
    </div>
  );
}
