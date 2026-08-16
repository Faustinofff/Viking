"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import type { AdminOverview } from "@/lib/admin-types";
import { Spinner, ErrorState, StatCard, SectionCard, Badge, Avatar, EmptyState, TimeAgo, formatShort, formatDate } from "./_components/ui";
import { ActivityFeed } from "./_components/activity";

function GrowthChart({ growth }: { growth: AdminOverview["growth"] }) {
  if (!growth || growth.length === 0) {
    return <EmptyState title="Sin datos de crecimiento" />;
  }
  const max = Math.max(1, ...growth.map((g) => Math.max(g.coaches, g.students)));
  return (
    <div>
      <div className="flex items-center gap-4 mb-3 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent/80" /> Coaches
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-500/80" /> Alumnos
        </span>
        <span className="ml-auto text-white/30">Acumulado · últimos 30 días</span>
      </div>
      <div className="flex items-end gap-[2px] h-32 md:h-40">
        {growth.map((g, i) => (
          <div key={g.date} className="flex-1 flex flex-col items-center justify-end gap-[2px] h-full group relative">
            <div className="w-full max-w-[8px] rounded-t-sm bg-accent/70 transition-all group-hover:bg-accent"
              style={{ height: `${Math.max(4, (g.coaches / max) * 100)}%` }} />
            <div className="w-full max-w-[8px] rounded-t-sm bg-blue-500/70 transition-all group-hover:bg-blue-400"
              style={{ height: `${Math.max(4, (g.students / max) * 100)}%` }} />
            {i === growth.length - 1 && (
              <div className="hidden md:flex absolute -top-9 right-0 rounded-lg bg-bg-tertiary border border-white/10 px-2 py-1 text-[10px] text-white/70 whitespace-nowrap shadow-xl">
                {growth[growth.length - 1].date.slice(8)}: {growth[growth.length - 1].coaches} · {growth[growth.length - 1].students}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-white/30 mt-2">
        <span>{growth[0]?.date}</span>
        <span>{growth[growth.length - 1]?.date}</span>
      </div>
    </div>
  );
}

const ICONS = {
  users: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
  ),
  activity: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  premium: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
  ),
  growth: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18h18M8 17V9m4 8V5m4 12v-6" />
    </svg>
  ),
};

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const r = await fetch("/api/admin/overview");
      const d = await r.json();
      if (d.error) {
        setError(d.error);
        setData(null);
      } else {
        setData(d);
        setError(null);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
    }
    setRefreshing(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => load(), 60000);
    return () => clearInterval(id);
  }, [load]);

  if (loading) return <Spinner className="min-h-[60vh]" />;
  if (error) return <div className="p-4 md:p-6 max-w-7xl mx-auto"><ErrorState message={error} /></div>;
  if (!data) return <Spinner className="min-h-[60vh]" />;

  const s = data.stats;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <p className="text-xs text-white/40">Panel de control general de Viking</p>
        </div>
        <Badge tone="red" className="ml-auto">ADMIN</Badge>
        <button
          onClick={load}
          className="btn-secondary !px-3 !py-2 text-xs"
        >
          <span className={`inline-block ${refreshing ? "animate-spin" : ""}`}>⟳</span>
          Actualizar
        </button>
      </div>

      {/* Usuarios */}
      <SectionCard title="Usuarios" subtitle="Estado general de coaches y alumnos" icon={<span className="text-accent">{ICONS.users}</span>}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Total Coaches" value={s.totalCoaches} sub="Registrados" tone="accent" />
          <StatCard label="Coaches Activos" value={s.coachesActive7d} sub="Actividad últimos 7d" tone="green" />
          <StatCard label="Coaches Inactivos" value={s.coachesInactive} sub="Sin actividad 30d" tone="red" />
          <StatCard label="Total Alumnos" value={s.totalStudents} sub="Registrados" tone="blue" />
          <StatCard label="Alumnos Activos" value={s.studentsActiveToday} sub="Activos hoy" tone="cyan" />
          <StatCard label="Alumnos Sin Actividad" value={s.studentsNoRecentActivity} sub="Más de 30 días" tone="orange" />
        </div>
      </SectionCard>

      {/* Actividad */}
      <SectionCard title="Actividad" subtitle="Uso real de la plataforma" icon={<span className="text-cyan-400">{ICONS.activity}</span>}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <StatCard label="Activos Hoy" value={s.usersActiveToday} sub="Usuarios" tone="green" />
          <StatCard label="Activos 7 días" value={s.usersActive7d} sub="Usuarios" tone="green" />
          <StatCard label="Activos 30 días" value={s.usersActive30d} sub="Usuarios" tone="green" />
          <StatCard label="Última Actividad" value={s.lastActivityAt ? <TimeAgo date={s.lastActivityAt} /> : "—"} sub={s.lastActivityAt ? formatShort(s.lastActivityAt) : undefined} tone="accent" />
          <StatCard label="Acciones Hoy" value={s.actionsToday} sub="Realizadas" tone="blue" />
          <StatCard label="Acciones 7 días" value={s.actions7d} sub="Realizadas" tone="blue" />
        </div>
      </SectionCard>

      {/* Premium + Crecimiento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Premium" subtitle="Estado de suscripciones de coaches" icon={<span className="text-yellow-400">{ICONS.premium}</span>}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatCard label="Premium Activo" value={s.premiumActive} tone="yellow" />
            <StatCard label="Sin Premium" value={s.premiumNoPremium} tone="gray" />
            <StatCard label="Próximos a Vencer" value={s.premiumExpiringSoon} sub="≤ 7 días" tone="orange" />
            <StatCard label="Premium Vencidos" value={s.premiumExpired} tone="red" />
            <StatCard label="En Prueba" value={s.premiumTrial} tone="cyan" />
            <StatCard label="Días Promedio" value={s.premiumAvgDaysLeft} sub="Restantes" tone="accent" />
          </div>
          {data.premiumExpiringSoon.length > 0 && (
            <div className="mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-orange-400/80 mb-2">Próximos a vencer</p>
              <div className="space-y-1.5">
                {data.premiumExpiringSoon.map((c) => (
                  <Link key={c.id} href={`/admin/coaches/${c.id}`} className="flex items-center gap-3 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] transition-all">
                    <Avatar name={c.name} size={30} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-white truncate">{c.name}</p>
                      <p className="text-[11px] text-white/40 truncate">{c.email}</p>
                    </div>
                    <Badge tone="orange">{c.premiumDaysLeft} días</Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Crecimiento" subtitle="Evolución de usuarios" icon={<span className="text-accent">{ICONS.growth}</span>}>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
            <StatCard label="Nuevos Coaches" value={`${s.newCoachesToday}`} sub="Hoy" tone="green" />
            <StatCard label="Nuevos Coaches" value={`${s.newCoaches7d}`} sub="Últimos 7 días" tone="green" />
            <StatCard label="Nuevos Coaches" value={`${s.newCoaches30d}`} sub="Últimos 30 días" tone="green" />
            <StatCard label="Nuevos Alumnos" value={`${s.newStudentsToday}`} sub="Hoy" tone="blue" />
            <StatCard label="Nuevos Alumnos" value={`${s.newStudents7d}`} sub="Últimos 7 días" tone="blue" />
            <StatCard label="Nuevos Alumnos" value={`${s.newStudents30d}`} sub="Últimos 30 días" tone="blue" />
          </div>
          <GrowthChart growth={data.growth} />
        </SectionCard>
      </div>

      {/* Alertas + Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <SectionCard
          title="Alertas"
          subtitle="Basadas en datos reales"
          className="lg:col-span-2"
          action={
            <Link href="/admin/activity" className="text-xs text-accent hover:text-accent-light">Ver todo →</Link>
          }
        >
          {data.alerts.length === 0 ? (
            <EmptyState title="Sin alertas" sub="Todo está al día por ahora" />
          ) : (
            <div className="space-y-2">
              {data.alerts.slice(0, 10).map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05]">
                  <span className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    a.severity === "red" ? "bg-red-400" : a.severity === "yellow" ? "bg-yellow-400" : a.severity === "blue" ? "bg-blue-400" : "bg-green-400"
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white/80 leading-snug">{a.message}</p>
                    <p className="text-[10px] text-white/30 mt-0.5">{timeAgoLabel(a.createdAt)}</p>
                  </div>
                  {a.coachId && (
                    <Link href={`/admin/coaches/${a.coachId}`} className="text-[11px] text-accent hover:text-accent-light flex-shrink-0 mt-0.5">Ver</Link>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard
          title="Actividad de Viking"
          subtitle="Lo que está pasando ahora"
          className="lg:col-span-3"
          action={<Link href="/admin/activity" className="text-xs text-accent hover:text-accent-light">Ver actividad completa →</Link>}
        >
          <div className="max-h-[420px] overflow-y-auto hide-scrollbar pr-1">
            <ActivityFeed events={data.feed.slice(0, 20)} showActor emptyText="Sin actividad registrada todavía" />
          </div>
        </SectionCard>
      </div>

      {/* Ranking de coaches */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <SectionCard title="Más Activos" subtitle="Por actividad 30d">
          <RankList coaches={data.topCoaches} sub={(c) => `${c.activity30d} actividades`} />
        </SectionCard>
        <SectionCard title="Más Alumnos" subtitle="Por cantidad de alumnos">
          <RankList coaches={data.topByStudents} sub={(c) => `${c.studentCount} alumnos`} />
        </SectionCard>
        <SectionCard title="Recientes" subtitle="Últimos registrados">
          <RankList coaches={data.recentCoaches} sub={(c) => `Registrado ${formatDate(c.createdAt)}`} />
        </SectionCard>
        <SectionCard title="Sin Actividad" subtitle="Registrados pero inactivos">
          {data.inactiveCoaches.length === 0 ? (
            <EmptyState title="Nadie inactivo 🎉" />
          ) : (
            <RankList coaches={data.inactiveCoaches} sub={(c) => c.lastActivityAt ? `Última actividad ${formatShort(c.lastActivityAt)}` : "Nunca se conectó"} />
          )}
        </SectionCard>
      </div>
    </div>
  );
}

function timeAgoLabel(ts: string): string {
  const t = new Date(ts).getTime();
  const diff = Date.now() - t;
  const m = Math.floor(diff / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h} h`;
  return formatShort(ts);
}

function RankList({ coaches, sub }: { coaches: AdminOverview["topCoaches"]; sub: (c: any) => string }) {
  if (coaches.length === 0) return <EmptyState title="Sin datos" />;
  return (
    <div className="space-y-1.5">
      {coaches.map((c, i) => (
        <Link key={c.id} href={`/admin/coaches/${c.id}`} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/[0.05] transition-all">
          <span className={`w-6 text-center text-sm font-bold ${i === 0 ? "text-accent" : "text-white/25"}`}>{i + 1}</span>
          <Avatar name={c.name} size={30} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-white truncate">{c.name}</p>
            <p className="text-[11px] text-white/35 truncate">{sub(c)}</p>
          </div>
          <Badge tone={c.status === "active" ? "green" : c.status === "no_recent" ? "yellow" : "gray"}>
            {c.status === "active" ? "Activo" : c.status === "no_recent" ? "Baja" : "Inactivo"}
          </Badge>
        </Link>
      ))}
    </div>
  );
}
