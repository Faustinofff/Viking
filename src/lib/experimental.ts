/**
 * Constantes y utilidades de la SUSCRIPCIÓN RECURRENTE de Viking.
 * Client-safe: no contiene secretos.
 */

export const EXPERIMENTAL_CURRENCY = "ARS";

/** Prefijo del external_reference de la suscripción. Sin dos puntos, para que el webhook
 *  actual (/api/mp/webhook) no pueda interpretarlo como `coachId:planId` ni matchear
 *  ningún planId → los pagos de la suscripción salen por el early return. */
export const SUSCRIPCION_REF_PREFIX = "exp:";

/** El módulo está habilitado para todos los clientes logueados. */
export const SUSCRIPCION_VISIBLE = process.env.NEXT_PUBLIC_RECURRING_SUBSCRIPTIONS_ENABLED === "true";

export interface PlanSuscripcion {
  id: string;
  nombre: string;
  /** Lo que muestra la app. */
  precioMuestra: number;
  /** Lo que cobra Mercado Pago (redondeado). */
  precioCobro: number;
  personalizacion: boolean;
  paginaWeb: boolean;
}

/** Los 3 planes Viking en modo suscripción (mensual recurrente). */
export const PLANES_SUSCRIPCION: PlanSuscripcion[] = [
  { id: "viking", nombre: "Viking", precioMuestra: 16999, precioCobro: 17000, personalizacion: false, paginaWeb: false },
  {
    id: "viking_marca",
    nombre: "Viking Marca",
    precioMuestra: 24999,
    precioCobro: 25000,
    personalizacion: true,
    paginaWeb: false,
  },
  {
    id: "viking_marca_web",
    nombre: "Viking Marca + Página web",
    precioMuestra: 34999,
    precioCobro: 35000,
    personalizacion: true,
    paginaWeb: true,
  },
];

export function planSuscripcionPorId(id?: string | null): PlanSuscripcion | undefined {
  return PLANES_SUSCRIPCION.find((p) => p.id === (id ?? "").trim());
}

/** Formatea el precio de muestra: 16999 → "16.999". */
export function formatearPrecio(precio: number): string {
  return precio.toLocaleString("es-AR");
}

/** external_reference de la suscripción: exp:<viking_user_id>:<planId>.
 *  Con `programado` se agrega el sufijo `:prog` → cambio de plan con inicio futuro. */
export function refSuscripcion(userId: string, planId: string, programado = false): string {
  return `${SUSCRIPCION_REF_PREFIX}${userId}:${planId}${programado ? ":prog" : ""}`;
}

/** True si la suscripción se creó como CAMBIO DE PLAN programado (inicio futuro,
 *  sin cobro hoy). Se determina por el sufijo `:prog` del external_reference,
 *  no por comparar planes (el Premium previo puede ser un resto de un pago único). */
export function esCambioProgramadoPorRef(ref?: string | null): boolean {
  const r = (ref ?? "").trim();
  return r.startsWith(SUSCRIPCION_REF_PREFIX) && r.endsWith(":prog");
}

export function userIdDesdeRef(ref?: string | null): string | null {
  const r = (ref ?? "").trim();
  if (!r.startsWith(SUSCRIPCION_REF_PREFIX)) return null;
  const resto = r.slice(SUSCRIPCION_REF_PREFIX.length);
  if (!resto) return null;
  const uid = resto.split(":")[0];
  return uid || null;
}

export function planIdDesdeRef(ref?: string | null): string | null {
  const r = (ref ?? "").trim();
  if (!r.startsWith(SUSCRIPCION_REF_PREFIX)) return null;
  const resto = r.slice(SUSCRIPCION_REF_PREFIX.length);
  const plan = resto.split(":")[1];
  return plan || null;
}

export function formatearFecha(valor?: string | null): string {
  if (!valor) return "—";
  const d = new Date(valor);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("es-AR", { dateStyle: "medium", timeStyle: "short" });
}

export function esRefSuscripcion(ref?: string | null): boolean {
  return userIdDesdeRef(ref) !== null;
}