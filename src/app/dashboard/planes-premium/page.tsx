"use client";
import { useState, useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { PLANES_PREMIUM, esCoachGratuito } from "@/lib/data";

export default function PlanesPremiumPage() {
  const usuarioActual = useAppStore((s) => s.usuarioActual);
  const premium = useAppStore((s) => s.premium);
  const contratarPremium = useAppStore((s) => s.contratarPremium);
  const cargarSuscripcion = useAppStore((s) => s.cargarSuscripcion);
  const esGratuito = esCoachGratuito(usuarioActual?.email);
  const storeGetState = useAppStore.getState;
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");
  const [isDev, setIsDev] = useState(false);
  const [planSeleccionado, setPlanSeleccionado] = useState<any>(null);
  const [publicKey, setPublicKey] = useState("");
  const brickContainerRef = useRef<HTMLDivElement>(null);
  const sdkCargado = useRef(false);
  const brickRef = useRef<any>(null);

  useEffect(() => {
    setIsDev(window.location.hostname === "localhost");
    const params = new URLSearchParams(window.location.search);
    if (params.get("ok") === "true") setExito("Pago aprobado correctamente");
    else if (params.get("ok") === "false") setError("El pago fue rechazado o cancelado");
  }, []);

  useEffect(() => {
    if (!planSeleccionado || !publicKey || !brickContainerRef.current || brickRef.current) return;
    const container = brickContainerRef.current;
    container.innerHTML = "";
    brickRef.current = null;
    const plan = planSeleccionado;

    const cargarYDibujar = () => {
      if (!(window as any).MercadoPago) {
        setTimeout(cargarYDibujar, 200);
        return;
      }
      try {
        const mp = new (window as any).MercadoPago(publicKey);
        const bricksBuilder = mp.bricks();
        bricksBuilder.create("cardPayment", container.id, {
          initialization: { amount: plan.precio },
          callbacks: {
            onReady: () => {},
            onSubmit: async (cardFormData: any) => {
              try {
                const email = storeGetState().usuarioActual?.email;
                const res = await fetch("/api/mp/process-payment", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    ...cardFormData,
                    transaction_amount: plan.precio,
                    plan_id: plan.id,
                    email,
                  }),
                });
                const result = await res.json();
                if (result.status === "approved") {
                  await cargarSuscripcion();
                  setPlanSeleccionado(null);
                  setExito(`Plan ${plan.nombre} activado correctamente`);
                } else {
                  setError("El pago fue rechazado. Probá con otra tarjeta.");
                }
                return result;
              } catch (e: any) {
                setError(e.message);
                return { error: e.message };
              }
            },
            onError: (e: any) => {
              console.error("MP onError:", e);
              setError("Error: " + (e?.message || "Error al procesar el pago"));
            },
          },
        }).then(() => { brickRef.current = true; }).catch((e: any) => {
          console.error("MP create error:", e);
          setError("Error MP: " + (e?.message || JSON.stringify(e)));
        });
      } catch (e: any) {
        setError("Error al iniciar Mercado Pago");
      }
    };

    if (!sdkCargado.current) {
      const s = document.createElement("script");
      s.src = "https://sdk.mercadopago.com/js/v2";
      s.onload = () => { sdkCargado.current = true; cargarYDibujar(); };
      s.onerror = () => setError("No se pudo cargar el SDK de Mercado Pago");
      document.head.appendChild(s);
    } else {
      cargarYDibujar();
    }
  }, [planSeleccionado, publicKey, storeGetState]);

  const handleContratar = async (planId: string) => {
    setCargando(planId);
    setError("");
    setExito("");
    try {
      const plan = PLANES_PREMIUM.find((p) => p.id === planId);
      if (!plan) throw new Error("Plan no válido");
      if (isDev) {
        await contratarPremium(plan);
        setExito(`Plan ${plan.nombre} activado correctamente`);
        return;
      }
      const res = await fetch("/api/mp/create-preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Error al crear pago");
      if (!data.public_key) throw new Error("Mercado Pago no está configurado");
      setPublicKey(data.public_key);
      setPlanSeleccionado(plan);
    } catch (e: any) {
      setError(e.message);
    }
    setCargando(null);
  };

  const expiracion = premium ? new Date(premium.premiumExpiresAt) : null;
  const activo = expiracion && expiracion > new Date();
  const diasRestantes = expiracion
    ? Math.ceil((expiracion.getTime() - Date.now()) / 86400000)
    : 0;
  const porVencer = activo && diasRestantes <= 7;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Planes Premium</h1>
        <p className="text-white/40 mt-1">Accedé a funciones avanzadas para potenciar tu negocio fitness.</p>
      </div>

      {esGratuito && (
        <div className="card border border-green-500/20 bg-green-500/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center text-green-400 font-bold text-lg">✓</div>
            <div>
              <p className="text-lg font-bold text-white">Acceso gratuito vitalicio</p>
              <p className="text-sm text-white/50">No necesitás contratar ningún plan. Tenés acceso completo al sistema.</p>
            </div>
          </div>
        </div>
      )}

      {premium && (
        <div className={`card border ${activo ? "border-accent/20 bg-accent/5" : "border-red-500/20 bg-red-500/5"}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/40">Estado de suscripción</p>
              {activo ? (
                <>
                  <p className="text-lg font-bold text-white mt-1">Plan {premium.planName}</p>
                  <p className="text-sm text-white/50">Vence: {expiracion?.toLocaleDateString("es-AR")} · {diasRestantes} días restantes</p>
                  {porVencer && <p className="text-sm text-yellow-400 mt-1">⚠ Tu plan vence pronto</p>}
                </>
              ) : (
                <>
                  <p className="text-lg font-bold text-red-400 mt-1">❌ Plan vencido</p>
                  <p className="text-sm text-white/50">Vencido el {expiracion?.toLocaleDateString("es-AR")}</p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <div className="card bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
      {exito && <div className="card bg-green-500/10 border border-green-500/20 text-green-400 text-sm">{exito}</div>}

      {!esGratuito && !planSeleccionado && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANES_PREMIUM.map((plan) => {
            const contratando = cargando === plan.id;
            return (
              <div key={plan.id} className="card flex flex-col relative overflow-hidden transition-all hover:border-accent/30 hover:shadow-lg hover:shadow-accent/5">
                {plan.destacado && (
                  <div className="absolute top-0 right-0">
                    <div className="bg-accent text-bg-primary text-[10px] font-bold px-3 py-1 rounded-bl-xl">{plan.destacado}</div>
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white">{plan.nombre}</h3>
                  <p className="text-sm text-white/50">{plan.dias} días de acceso</p>
                  <div className="mt-3">
                    <span className="text-3xl font-extrabold text-white">${plan.precio.toLocaleString("es-AR")}</span>
                    <span className="text-sm text-white/40 ml-1">total</span>
                  </div>
                  {plan.ahorro && <p className="text-xs text-green-400 font-semibold mt-1">{plan.ahorro}</p>}
                </div>
                <button
                  onClick={() => handleContratar(plan.id)}
                  disabled={contratando}
                  className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium transition-all bg-accent text-bg-primary hover:bg-accent/90 disabled:opacity-50"
                >
                  {contratando ? "Procesando..." : isDev ? "Contratar (prueba)" : "Contratar"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {planSeleccionado && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-white/40">Pagá con tarjeta de crédito o débito</p>
              <p className="text-lg font-bold text-white mt-1">${planSeleccionado.precio.toLocaleString("es-AR")} - {planSeleccionado.nombre}</p>
            </div>
            <button onClick={() => { setPlanSeleccionado(null); brickRef.current = false; }} className="text-xs text-white/30 hover:text-white/60">Cancelar</button>
          </div>
          <div id="mp-card-payment-container" ref={brickContainerRef} className="min-h-[220px]" />
        </div>
      )}

      <div className="card bg-white/[0.02] border border-white/5">
        <p className="text-xs text-white/30 leading-relaxed">
          Al contratar un plan, accedés a funciones premium durante el período seleccionado.
          Los pagos son procesados de forma segura por Mercado Pago.
        </p>
      </div>
    </div>
  );
}
