"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { CoachDetail } from "@/lib/admin-types";
import { Spinner, ErrorState, Badge, Avatar, EmptyState, StatCard, SectionCard, TimeAgo, formatDate } from "../../_components/ui";
import { ActivityFeed } from "../../_components/activity";
import { PremiumManager } from "../../_components/premium-manager";

type Tab = "resumen" | "alumnos" | "actividad";

export default function CoachDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<CoachDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [tab, setTab] = useState<Tab>("resumen");
  const [premiumOpen, setPremiumOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/admin/coaches/${id}`);
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
  if (notFound) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message="Coach no encontrado" /></div>;
  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message={error} /></div>;
  if (!data) return <Spinner className="min-h-[60vh]" />;

  const c = data.coach;
  const statusTone = c.status === "active" ? "green" : c.status === "no_recent" ? "yellow" : "gray";
  const statusLabel = c.status === "active" ? "Activo" : c.status === "no_recent" ? "Baja" : "Inactivo";

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/coaches" className="w-8 h-8 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <Avatar name={c.name} size={44} />
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white truncate">{c.name}</h1>
            <Badge tone={statusTone}>{statusLabel}</Badge>
            {c.isFreeCoach && <Badge tone="purple">Gratuito</Badge>}
            {c.isPremiumActive && !c.isFreeCoach && <Badge tone="yellow">Premium</Badge>}
          </div>
          <p className="text-xs text-white/40 truncate">{c.email}</p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/admin/activity" className="btn-secondary !py-2 !px-3 text-xs">
            Actividad completa →
          </Link>
          <button onClick={() => setPremiumOpen(true)} className="btn-primary !py-2 !px-3 text-xs">
            Gestionar Premium
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-8 gap-3">
        <StatCard label="Alumnos" value={c.studentCount} sub="Vinculados" tone="accent" />
        <StatCard label="Activos" value={c.activeStudentCount} tone="green" />
        <StatCard label="Inactivos" value={c.inactiveStudentCount} sub="Alumnos sin uso" tone="red" />
        <StatCard label="Actividad 30d" value={c.activity30d} sub="Acciones" tone="blue" />
        <StatCard label="Acciones Hoy" value={c.activityToday} tone="cyan" />
        <StatCard label="Último Login" value={c.lastLoginAt ? <TimeAgo date={c.lastLoginAt} /> : "Nunca"} sub={c.lastLoginAt ? formatDate(c.lastLoginAt) : undefined} tone="yellow" />
        <StatCard label="Registrado" value={formatDate(c.createdAt)} tone="gray" />
        <StatCard
          label="Premium"
          value={c.isFreeCoach ? "Gratuito" : c.isPremiumActive ? (c.premiumDaysLeft !== null && c.premiumDaysLeft >= 0 ? `${c.premiumDaysLeft}d` : "Activo") : c.premium ? "Vencido" : "Sin"}
          sub={c.premiumExpiresAt ? `Hasta ${formatDate(c.premiumExpiresAt)}` : undefined}
          tone={c.isFreeCoach ? "purple" : c.isPremiumActive ? (c.premiumDaysLeft !== null && c.premiumDaysLeft <= 7 ? "orange" : "yellow") : c.premium ? "red" : "gray"}
        />
      </div>

      <div className="flex gap-1 bg-white/[0.04] border border-white/[0.06] rounded-2xl p-1 w-fit max-w-full overflow-x-auto">
        {(["resumen", "alumnos", "actividad"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
              tab === t ? "bg-accent/15 text-accent" : "text-white/50 hover:text-white/80"
            }`}
          >
            {t === "resumen" ? "Resumen" : t === "alumnos" ? `Alumnos (${data.studentCount})` : `Actividad (${data.events.length})`}
          </button>
        ))}
      </div>

      {tab === "resumen" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <SectionCard title="Detalle Premium" subtitle={c.isFreeCoach ? "Coach gratuito — no requiere suscripción" : "Estado de suscripción del coach"}>
            {c.premium ? (
              <div className="space-y-2 text-sm">
                <Row label="Plan" value={c.premium.planName || c.premium.planId || "—"} />
                <Row label="Duración" value={`${c.premium.planDurationDays} días`} />
                <Row label="Precio" value={c.premium.planPrice ? `$${c.premium.planPrice}` : "—"} />
                <Row label="Vencimiento" value={formatDate(c.premium.premiumExpiresAt)} />
                <Row label="Días restantes" value={c.premiumDaysLeft !== null && c.premiumDaysLeft >= 0 ? `${c.premiumDaysLeft} días` : "Vencido"} highlight={c.premiumDaysLeft !== null && c.premiumDaysLeft <= 7} />
                <Row label="Pago" value={c.premium.paymentStatus} />
                <Row label="Fecha de pago" value={formatDate(c.premium.paymentDate)} />
                {c.isFreeCoach && <p className="text-xs text-purple-400 pt-1">Este coach usa Viking gratis (gratuito).</p>}
              </div>
            ) : (
              <EmptyState title="Sin Premium" sub="Este coach no tiene una suscripción activa" />
            )}
          </SectionCard>

          <SectionCard title="Resumen del coach">
            <div className="space-y-2 text-sm">
              <Row label="Rutinas asignadas" value={`${c.activityCount} acciones totales`} />
              <Row label="Última acción" value={c.lastAction ? c.lastAction.message : "Sin acciones registradas"} />
              {c.lastAction && <Row label="Cuándo" value={c.lastAction.ts ? <TimeAgo date={c.lastAction.ts} /> : "—"} />}
              <Row label="Relación" value={`${c.studentCount} alumno${c.studentCount === 1 ? "" : "s"}`} />
              <Row label="Perfil creado" value={formatDate(c.createdAt)} />
              <div className="pt-2 flex gap-2 flex-wrap">
                <Link href={`/admin/activity`} className="btn-secondary text-xs !py-2">Ver actividad completa</Link>
                <button onClick={() => setPremiumOpen(true)} className="btn-primary text-xs !py-2">Gestionar Premium</button>
              </div>
            </div>
          </SectionCard>
        </div>
      )}

      {tab === "alumnos" && (
        <SectionCard title={`Alumnos de ${c.name}`} subtitle={`${data.activeStudents} activos · ${data.inactiveStudents} inactivos`}>
          {data.students.length === 0 ? (
            <EmptyState title="Sin alumnos" sub="Este coach todavía no tiene alumnos vinculados" />
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {data.students.map((s) => (
                <Link key={s.id} href={`/admin/students/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-white/[0.03] px-2 rounded-xl transition-all">
                  <Avatar name={s.name} size={34} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{s.name}</p>
                    <p className="text-xs text-white/40 truncate">{s.email}</p>
                  </div>
                  {s.currentRoutine ? (
                    <Badge tone="green">{s.currentRoutine.name}</Badge>
                  ) : (
                    <Badge tone="gray">Sin rutina</Badge>
                  )}
                  <span className={`w-2 h-2 rounded-full ${s.status === "active" ? "bg-green-400" : s.status === "no_recent" ? "bg-yellow-400" : "bg-white/15"}`} />
                  <span className="text-[11px] text-white/30 w-20 text-right hidden md:inline">
                    {s.lastActivityAt ? <TimeAgo date={s.lastActivityAt} /> : "Nunca"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </SectionCard>
      )}

      {tab === "actividad" && (
        <SectionCard title="Actividad del coach">
          <ActivityFeed events={data.events} emptyText="Sin actividad registrada" />
        </SectionCard>
      )}

      {premiumOpen && <PremiumManager coach={c} onClose={() => setPremiumOpen(false)} onSaved={load} />}
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-white/40 text-xs flex-shrink-0">{label}</span>
      <span className={`text-sm text-right truncate ${highlight ? "text-orange-400 font-semibold" : "text-white/85"}`}>{value}</span>
    </div>
  );
}
