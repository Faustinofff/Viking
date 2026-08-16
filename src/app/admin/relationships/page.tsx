"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import type { RelationshipsView } from "@/lib/admin-types";
import { Spinner, ErrorState, Badge, Avatar, EmptyState, SectionCard, formatDate, StatCard } from "../_components/ui";

export default function AdminRelationshipsPage() {
  const [data, setData] = useState<RelationshipsView | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/relationships");
      const d = await r.json();
      if (d.error) setError(d.error);
      else setData(d);
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!data) return data;
    const query = q.trim().toLowerCase();
    if (!query) return data;
    return {
      rows: data.rows
        .map((r) => ({
          ...r,
          students: r.students.filter(
            (s) => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
          ),
        }))
        .filter((r) => r.coach.name.toLowerCase().includes(query) || r.coach.email.toLowerCase().includes(query) || r.students.length > 0),
      unassignedStudents: data.unassignedStudents.filter(
        (s) => s.name.toLowerCase().includes(query) || s.email.toLowerCase().includes(query)
      ),
    };
  }, [data, q]);

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message={error} /></div>;
  if (!data) return <Spinner className="min-h-[60vh]" />;

  const linkedCount = data.rows.reduce((acc, r) => acc + r.students.length, 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Relaciones</h1>
          <p className="text-xs text-white/40">Mapa de vínculos coach → alumno</p>
        </div>
        <div className="ml-auto">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrar por coach o alumno..."
            className="input !py-2 !px-3 w-56 md:w-80"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Coaches" value={data.rows.length} sub="Con alumnos" tone="accent" />
        <StatCard label="Vínculos Activos" value={linkedCount} sub="Alumnos vinculados" tone="green" />
        <StatCard label="Alumnos Sin Coach" value={data.unassignedStudents.length} sub="Sin vínculo" tone="red" />
        <StatCard label="Total Alumnos" value={linkedCount + data.unassignedStudents.length} sub="Plataforma" tone="blue" />
      </div>

      {filtered && (
        <div className="space-y-4">
          {filtered.rows.length === 0 && filtered.unassignedStudents.length === 0 ? (
            <EmptyState title="Sin resultados" sub="No se encontraron relaciones con ese filtro" />
          ) : (
            <>
              {filtered.rows.map(({ coach, students }) => (
                <SectionCard
                  key={coach.id}
                  title={
                    <Link href={`/admin/coaches/${coach.id}`} className="flex items-center gap-2 hover:text-accent transition-all">
                      <Avatar name={coach.name} size={28} />
                      <span>{coach.name}</span>
                      <span className="text-xs text-white/30 font-normal">({coach.email})</span>
                    </Link>
                  }
                  subtitle={`${students.length} alumno${students.length === 1 ? "" : "s"}`}
                  action={
                    <div className="flex gap-1.5">
                      <Badge tone={coach.status === "active" ? "green" : coach.status === "no_recent" ? "yellow" : "gray"}>
                        {coach.status === "active" ? "Activo" : coach.status === "no_recent" ? "Baja" : "Inactivo"}
                      </Badge>
                      {coach.isPremiumActive && !coach.isFreeCoach && <Badge tone="yellow">Premium</Badge>}
                    </div>
                  }
                >
                  {students.length === 0 ? (
                    <p className="text-xs text-white/35 py-2">Sin alumnos vinculados</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                      {students.map((s) => (
                        <Link
                          key={s.id}
                          href={`/admin/students/${s.id}`}
                          className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] transition-all"
                        >
                          <Avatar name={s.name} size={28} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-white truncate">{s.name}</p>
                            <p className="text-[11px] text-white/35 truncate">
                              {s.linkedAt ? `Vinculado ${formatDate(s.linkedAt)}` : "Vinculado"}
                            </p>
                          </div>
                          <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.status === "active" ? "bg-green-400" : s.status === "no_recent" ? "bg-yellow-400" : "bg-white/15"}`} />
                        </Link>
                      ))}
                    </div>
                  )}
                </SectionCard>
              ))}

              {filtered.unassignedStudents.length > 0 && (
                <SectionCard title="Alumnos Sin Coach" subtitle="Registrados pero sin ningún coach asignado" tone="red">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {filtered.unassignedStudents.map((s) => (
                      <Link
                        key={s.id}
                        href={`/admin/students/${s.id}`}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-red-500/[0.04] border border-red-500/10 hover:bg-red-500/[0.08] transition-all"
                      >
                        <Avatar name={s.name} size={28} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-white truncate">{s.name}</p>
                          <p className="text-[11px] text-white/35 truncate">{s.email}</p>
                        </div>
                        <Badge tone="red">Sin coach</Badge>
                      </Link>
                    ))}
                  </div>
                </SectionCard>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
