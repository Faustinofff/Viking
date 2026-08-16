"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { StudentDetail } from "@/lib/admin-types";
import { Spinner, ErrorState, Badge, Avatar, EmptyState, StatCard, SectionCard, TimeAgo, formatDate } from "../../_components/ui";
import { ActivityFeed } from "../../_components/activity";

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/students/${id}`);
      const d = await r.json();
      if (r.status === 404) {
        setNotFound(true);
      } else if (d.error) {
        setError(d.error);
      } else {
        setData(d);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
    }
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (notFound) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message="Alumno no encontrado" /></div>;
  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message={error} /></div>;
  if (!data) return <Spinner className="min-h-[60vh]" />;

  const s = data.student;
  const statusTone = s.status === "active" ? "green" : s.status === "no_recent" ? "yellow" : "gray";
  const statusLabel = s.status === "active" ? "Activo" : s.status === "no_recent" ? "Baja" : "Inactivo";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/students" className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Avatar name={s.name} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white truncate">{s.name}</h1>
            <Badge tone={statusTone}>{statusLabel}</Badge>
          </div>
          <p className="text-xs text-white/40 truncate">{s.email}</p>
        </div>
        <div className="ml-auto">
          {data.coach ? (
            <Link href={`/admin/coaches/${data.coach.id}`} className="btn-secondary !py-2 !px-3 text-xs">
              Coach: {data.coach.name} →
            </Link>
          ) : (
            <Badge tone="red">Sin coach asignado</Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
        <StatCard label="Planes" value={data.planCount} sub="Rutinas + nutrición" tone="accent" />
        <StatCard label="Rutina actual" value={s.currentRoutine ? s.currentRoutine.name : "—"} sub={s.currentRoutine ? formatDate(s.currentRoutine.createdAt) : "Sin asignar"} tone={s.currentRoutine ? "green" : "gray"} />
        <StatCard label="Actividad total" value={s.activityCount} sub="Acciones" tone="blue" />
        <StatCard label="Última actividad" value={s.lastActivityAt ? <TimeAgo date={s.lastActivityAt} /> : "Nunca"} sub={s.lastActivityAt ? formatDate(s.lastActivityAt) : undefined} tone="yellow" />
        <StatCard label="Último login" value={s.lastLoginAt ? <TimeAgo date={s.lastLoginAt} /> : "Nunca"} sub={s.lastLoginAt ? formatDate(s.lastLoginAt) : undefined} tone="gray" />
        <StatCard label="Registrado" value={formatDate(s.createdAt)} tone="gray" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Detalle del alumno">
          <div className="space-y-2 text-sm">
            <Row label="Nombre" value={s.name} />
            <Row label="Email" value={s.email} />
            <Row label="Rol" value="Alumno" />
            <Row label="Coach" value={data.coach ? data.coach.name : "Sin asignar"} />
            {s.linkedAt && <Row label="Vinculado" value={formatDate(s.linkedAt)} />}
            <Row label="Registrado" value={formatDate(s.createdAt)} />
            <Row label="Última acción" value={s.lastAction ? s.lastAction.message : "Sin acciones registradas"} />
          </div>
        </SectionCard>

        <SectionCard title="Actividad del alumno">
          <ActivityFeed events={data.events} emptyText="Sin actividad registrada" />
        </SectionCard>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/40 text-xs flex-shrink-0">{label}</span>
      <span className="text-sm text-right text-white/85 truncate">{value}</span>
    </div>
  );
}
