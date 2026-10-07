"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  PLANES_SUSCRIPCION,
  SUSCRIPCION_VISIBLE,
  formatearPrecio,
  formatearFecha,
  planSuscripcionPorId,
} from "@/lib/experimental";

interface Suscripcion {
  id: string;
  subscription_id: string | null;
  plan_name: string | null;
  amount: number | null;
  status: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  next_payment_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

function premiumVigente(premium?: string | null): boolean {
  if (!premium) return false;
  const t = Date.parse(premium);
  return !Number.isNaN(t) && t > Date.now();
}

export default function SuscripcionPage() {
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [sub, setSub] = useState<Suscripcion | null>(null);
  const [premium, setPremium] = useState<string | null>(null);
  const [emailPago, setEmailPago] = useState("");
  const [planElegido, setPlanElegido] = useState("viking_marca");
  const [planFijado, setPlanFijado] = useState<string | null>(null);
  const [emailSesion, setEmailSesion] = useState("");
  const [acceso, setAcceso] = useState<"ok" | "denegado" | "sin_sesion">("ok");
  const [cambioEnCurso, setCambioEnCurso] = useState(false);
  const [planActualId, setPlanActualId] = useState<string | null>(null);
  const [cambiando, setCambiando] = useState(false);

  const pedir = async (ruta: string, metodo: "GET" | "POST" = "GET", cuerpo?: unknown) => {
    const { data: sesion } = await supabase.auth.getSession();
    const token = sesion.session?.access_token;
    setEmailSesion(sesion.session?.user?.email ?? "");
    if (!token) {
      setAcceso("sin_sesion");
      return null;
    }
    const res = await fetch(ruta, {
      method: metodo,
      headers: { Authorization: `Bearer ${token}`, ...(cuerpo ? { "Content-Type": "application/json" } : {}) },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      cache: "no-store",
    });
    if (res.status === 403) {
      setAcceso("denegado");
      return null;
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data?.error ?? "No pudimos completar la operación. Probá de nuevo.");
      return null;
    }
    return data;
  };

  // Carga el estado y lo refresca con Mercado Pago automáticamente (sin botones técnicos).
  const cargar = useCallback(async (recienPago: boolean) => {
    setError(null);
    try {
      const data = await pedir("/api/experimental/subscription");
      if (!data) return;
      setAcceso("ok");
      setPremium(data.premium ?? null);
      setSub(data.subscription ?? null);
      setCambioEnCurso(data.cambio_en_curso === true);
      setPlanActualId(data.plan_id ?? null);

      if (data.subscription?.subscription_id) {
        const sync = await pedir("/api/experimental/subscription/sync", "POST");
        if (sync) {
          setSub(sync.subscription ?? data.subscription);
          if (sync.cambio_en_curso !== undefined) setCambioEnCurso(sync.cambio_en_curso === true);
          if (sync.premium && String(sync.premium).includes("T")) {
            setPremium(sync.premium);
            if (recienPago) setAviso("Pago registrado. Tu Premium quedó activo.");
          }
        }
      }
    } catch {
      setError("No pudimos conectar. Revisá tu conexión e intentá de nuevo.");
    } finally {
      setOcupado(false);
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const planParam = params.get("plan");
    if (planParam && planSuscripcionPorId(planParam)) {
      setPlanElegido(planParam);
      setPlanFijado(planParam);
    }
    void cargar(params.get("estado") === "ok");
  }, [cargar]);

  const suscribir = async () => {
    const email = emailPago.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Escribí el email de tu cuenta de Mercado Pago para poder suscribirte.");
      return;
    }
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const data = await pedir("/api/experimental/subscription", "POST", {
        payer_email: email,
        plan_id: planElegido,
      });
      if (!data) return;
      if (data.subscription) setSub(data.subscription);
      if (data.init_point) {
        setAviso(
          data.inicio
            ? `Te llevamos a Mercado Pago a confirmarlo. El cobro del plan nuevo recién el ${formatearFecha(
                data.inicio
              )} — hoy no debita nada.`
            : "Te llevamos a Mercado Pago para pagar con tu tarjeta…"
        );
        window.location.href = data.init_point;
        return;
      }
    } catch {
      setError("No pudimos iniciar el pago. Intentá de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  const cancelar = async () => {
    const ok = window.confirm(
      cambioEnCurso
        ? "¿Cancelar el cambio de plan? Se anula la suscripción nueva. Tu plan actual sigue hasta la fecha ya pagada y después de eso no habrá más cobros."
        : "¿Cancelar tu suscripción? Vas a dejar de pagar cada mes y el Premium se mantiene hasta la fecha ya pagada."
    );
    if (!ok) return;
    setOcupado(true);
    setError(null);
    setAviso(null);
    try {
      const data = await pedir("/api/experimental/subscription/cancel", "POST");
      if (!data) return;
      setSub(data.subscription ?? null);
      if (data.premium && String(data.premium).includes("T")) setPremium(data.premium);
      setAviso("Suscripción cancelada. No se van a hacer más cobros.");
    } catch {
      setError("No pudimos cancelar. Intentá de nuevo.");
    } finally {
      setOcupado(false);
    }
  };

  if (cargando) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-6">
        <p className="text-sm text-white/40">Cargando tu suscripción…</p>
      </main>
    );
  }

  if (!SUSCRIPCION_VISIBLE) {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-6">
        <div className="card p-6 max-w-md text-center space-y-3">
          <h1 className="text-lg font-bold">Suscripción</h1>
          <p className="text-sm text-white/50">Esta sección todavía no está habilitada.</p>
          <Link href="/dashboard" className="text-xs text-accent">
            Volver al dashboard
          </Link>
        </div>
      </main>
    );
  }

  if (acceso === "sin_sesion") {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-6">
        <div className="card p-6 max-w-md text-center space-y-4">
          <p className="text-sm text-white/60">Iniciá sesión para ver tu suscripción.</p>
          <Link href="/login" className="btn-primary text-sm inline-block">
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  if (acceso === "denegado") {
    return (
      <main className="min-h-screen bg-[#0a0a0b] text-white flex items-center justify-center p-6">
        <div className="card p-6 max-w-md text-center space-y-3">
          <h1 className="text-lg font-bold">Sección no disponible</h1>
          <p className="text-sm text-white/50">No pudimos validar tu sesión. Volvé a iniciar sesión.</p>
          <Link href="/login" className="text-xs text-accent">
            Iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  const estado = (sub?.status ?? "").trim().toLowerCase();
  const sinSub = !sub;
  const activa = estado === "active" || estado === "authorized";
  const cancelada = estado === "cancelled" || estado === "with_expiration";
  const pendiente = !!sub && !activa && !cancelada;
  const premiumOk = premiumVigente(premium);
  const plan = planSuscripcionPorId(planElegido) ?? PLANES_SUSCRIPCION[0];

  // Cambio de plan programado (confirmado, arranca en el próximo cobro).
  const esperandoCambio = cambioEnCurso;
  const mostrarContratar = sinSub || cancelada || (pendiente && !esperandoCambio);
  const cambiandoAhora = activa && !esperandoCambio && cambiando;
  const puedeElegirPlan = mostrarContratar || cambiandoAhora;
  const esPlanActual = !!planFijado && !!planActualId && planFijado === planActualId;
  const proximoVencimiento = sub?.next_payment_date ?? sub?.current_period_end;

  const tituloEstado = sinSub
    ? "Elegí tu plan"
    : esperandoCambio
      ? "Cambio de plan programado"
      : activa
        ? "Tu suscripción está activa"
        : pendiente
          ? "Falta completar el pago"
          : cancelada
            ? "Tu suscripción terminó"
            : "Estado de tu suscripción";

  const detalleEstado = sinSub
    ? "Se cobra solo todos los meses y podés cancelar cuando quieras."
    : esperandoCambio
      ? `Desde el ${formatearFecha(proximoVencimiento)} tu plan pasa a ${sub?.plan_name ?? "tu plan nuevo"}. Hoy no debita nada; tu plan actual sigue vigente hasta ese día.`
      : activa
        ? "Todos los meses se cobra solo. No tenés que hacer nada más."
        : pendiente
          ? "Entrá a Mercado Pago y pagá con tu tarjeta para activar tu Premium."
          : cancelada
            ? "No se realizó ningún cobro. Podés volver a suscribirte cuando quieras."
            : "";

  return (
    <main className="min-h-screen bg-[#0a0a0b] text-white p-6 md:p-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-extrabold">Tu suscripción</h1>
          <p className="text-sm text-white/40 mt-1">El plan que elijas se cobra todos los meses en Mercado Pago.</p>
        </div>

        <div
          className={`rounded-2xl border p-4 text-sm ${
            premiumOk
              ? "border-emerald-400/30 bg-emerald-400/[0.07] text-emerald-200"
              : "border-white/10 bg-white/[0.03] text-white/60"
          }`}
        >
          <p className="font-bold">{premiumOk ? "Premium activo" : "Premium"}</p>
          <p className="text-xs mt-1">
            {premiumOk
              ? `Vence el ${formatearFecha(premium)}. Se renueva solo mientras la suscripción siga activa.`
              : "Se activa en cuanto Mercado Pago confirme tu pago."}
          </p>
        </div>

        {error && (
          <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-300">{error}</p>
        )}
        {aviso && (
          <p className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-300">
            {aviso}
          </p>
        )}

        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-bold">{tituloEstado}</p>
              <p className="text-xs text-white/50 mt-1">{detalleEstado}</p>
            </div>
            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                esperandoCambio
                  ? "bg-amber-400/15 text-amber-300"
                  : activa
                    ? "bg-emerald-500/15 text-emerald-300"
                    : cancelada || sinSub
                      ? "bg-white/10 text-white/50"
                      : "bg-amber-400/15 text-amber-300"
              }`}
            >
              {esperandoCambio
                ? "Cambio programado"
                : activa
                  ? sub?.plan_name || "Activa"
                  : cancelada
                    ? "Cancelada"
                    : sinSub
                      ? "Sin suscripción"
                      : "Pendiente"}
            </span>
          </div>

          {puedeElegirPlan && cambiandoAhora && esPlanActual && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 text-xs text-amber-200">
              Ya estás suscrito a <b>{plan.nombre}</b>. Si querés otro plan, elegilo más abajo.
            </div>
          )}

          {puedeElegirPlan && (
            planFijado ? (
              <div className="rounded-xl border border-accent bg-accent/10 p-4 space-y-2">
                <span className="text-xs text-white/40 block">Plan seleccionado</span>
                <p className="text-lg font-bold leading-tight">{plan.nombre}</p>
                <p className="text-base font-extrabold text-accent">
                  ${formatearPrecio(plan.precioMuestra)}
                  <span className="text-[10px] font-medium text-white/40">/mes</span>
                </p>
                <ul className="text-[11px] text-white/50 space-y-0.5 pt-1">
                  <li>· Premium Viking</li>
                  {plan.personalizacion && <li>· Personalización</li>}
                  {plan.paginaWeb && <li>· Página web</li>}
                </ul>
                <button
                  type="button"
                  onClick={() => setPlanFijado(null)}
                  className="text-[11px] text-white/40 hover:text-white/60 underline"
                >
                  Cambiar plan
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <span className="text-xs text-white/40">Elegí tu plan</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {PLANES_SUSCRIPCION.map((p) => {
                    const seleccionado = planElegido === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setPlanElegido(p.id)}
                        className={`text-left rounded-xl border p-3 space-y-1 transition-colors ${
                          seleccionado
                            ? "border-accent bg-accent/10"
                            : "border-white/10 bg-white/[0.03] hover:border-white/25"
                        }`}
                      >
                        <p className="text-sm font-bold leading-tight">{p.nombre}</p>
                        <p className="text-base font-extrabold text-accent">
                          ${formatearPrecio(p.precioMuestra)}
                          <span className="text-[10px] font-medium text-white/40">/mes</span>
                        </p>
                        <ul className="text-[11px] text-white/50 space-y-0.5 pt-1">
                          <li>· Premium Viking</li>
                          {p.personalizacion && <li>· Personalización</li>}
                          {p.paginaWeb && <li>· Página web</li>}
                        </ul>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          )}

          {activa && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-white/[0.06] pt-4">
              <div>
                <dt className="text-xs text-white/30">Importe</dt>
                <dd className="text-white/80 mt-0.5">${formatearPrecio(sub?.amount ?? 0)} / mes</dd>
              </div>
              <div>
                <dt className="text-xs text-white/30">Próximo cobro</dt>
                <dd className="text-white/80 mt-0.5">
                  {formatearFecha(sub?.next_payment_date ?? sub?.current_period_end)}
                </dd>
              </div>
            </dl>
          )}

          {(mostrarContratar || (cambiandoAhora && !esPlanActual)) && (
            <div className="space-y-4 border-t border-white/[0.06] pt-4">
              <label className="block">
                <span className="text-xs text-white/40">
                  Email de tu cuenta de Mercado Pago <span className="text-red-400">(obligatorio)</span>
                </span>
                <input
                  type="email"
                  inputMode="email"
                  value={emailPago}
                  onChange={(e) => setEmailPago(e.target.value.trim())}
                  placeholder="tuemail@ejemplo.com"
                  className="mt-1.5 w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent"
                />
                <span className="block mt-1 text-[11px] text-white/40">
                  Tiene que ser el email con el que entrás a tu cuenta de Mercado Pago, sí o sí. Si ponés otro, el pago
                  falla y no se procesa la suscripción.
                </span>
              </label>
              <button
                onClick={() => void suscribir()}
                disabled={ocupado || !emailPago}
                className="btn-primary text-sm w-full disabled:opacity-40"
              >
                {ocupado
                  ? "Procesando…"
                  : !emailPago
                    ? "Completá el email de Mercado Pago"
                    : cambiandoAhora
                      ? `Cambiar a ${plan.nombre} por $${formatearPrecio(
                          plan.precioMuestra
                        )} / mes — arranca el ${formatearFecha(proximoVencimiento)}`
                      : `Suscribirme por $${formatearPrecio(plan.precioMuestra)} / mes`}
              </button>
              <p className="text-[11px] text-white/30 text-center">
                {cambiandoAhora
                  ? `Sin cargo hoy: el cobro arranca cuando termine tu mes actual. Tu plan de siempre sigue hasta entonces (${formatearFecha(
                      proximoVencimiento
                    )}).`
                  : `En Mercado Pago el monto aparece redondeado ($${formatearPrecio(plan.precioCobro)}) por comodidad.`}
              </p>
            </div>
          )}

          {esperandoCambio && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-4 space-y-1.5 text-sm">
              <p className="font-bold text-amber-200">Cambio de plan programado</p>
              <p className="text-xs text-amber-100/80">
                Desde el <b>{formatearFecha(proximoVencimiento)}</b> tu plan pasa a{" "}
                <b>{sub?.plan_name ?? "tu plan nuevo"}</b> (${formatearPrecio(sub?.amount ?? 0)}/mes).
              </p>
              <p className="text-xs text-amber-100/80">
                Hoy no se debita nada. Tu plan actual sigue vigente hasta esa fecha.
              </p>
            </div>
          )}

          {(activa && !esperandoCambio) && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.06]">
              {cambiandoAhora ? (
                <button
                  onClick={() => setCambiando(false)}
                  className="text-xs text-white/40 hover:text-white/60"
                >
                  ← Volver
                </button>
              ) : (
                <button
                  onClick={() => setCambiando(true)}
                  className="text-xs text-accent hover:text-white/60"
                >
                  Cambiar de plan
                </button>
              )}
              <button
                onClick={() => void cancelar()}
                disabled={ocupado}
                className="text-xs text-red-400/70 hover:text-red-400"
              >
                Cancelar suscripción
              </button>
              <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/60 ml-auto">
                Ir al dashboard
              </Link>
            </div>
          )}

          {esperandoCambio && (
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/[0.06]">
              <button
                onClick={() => void cancelar()}
                disabled={ocupado}
                className="text-xs text-red-400/70 hover:text-red-400"
              >
                Cancelar el cambio de plan
              </button>
              <Link href="/dashboard" className="text-xs text-white/40 hover:text-white/60 ml-auto">
                Ir al dashboard
              </Link>
            </div>
          )}
        </div>

        <Link href="/dashboard" className="inline-block text-xs text-white/30 hover:text-white/50">
          ← Volver al dashboard
        </Link>
      </div>
    </main>
  );
}