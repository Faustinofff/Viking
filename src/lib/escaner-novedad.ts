/**
 * Estado de "novedad" (badge NUEVO) de la sección "Escanear mi comida".
 * Vive 100% en localStorage: no toca backend.
 *
 * Regla: se muestra hasta que el alumno ABRE la sección, o hasta superar el
 * tope de aperturas de la app (para que no quede marcado siempre).
 */

// El sufijo de versión permite "reiniciar" el estado de novedad para todos
// (basta con subir el número): las claves viejas se ignoran.
const PREFIX = "viking_escaner_novedad_v2:";

/** Aperturas de la app tras las cuales deja de marcarse como nuevo. */
export const MAX_ACCESOS_ESCANER = 5;

interface Novedad {
  accesos: number;
  visto: boolean;
}

function leer(id: string): Novedad {
  if (typeof window === "undefined" || !id) return { accesos: 0, visto: false };
  try {
    const raw = localStorage.getItem(PREFIX + id);
    if (raw) {
      const p = JSON.parse(raw);
      return { accesos: Number(p?.accesos) || 0, visto: p?.visto === true };
    }
  } catch {}
  return { accesos: 0, visto: false };
}

function guardar(id: string, n: Novedad) {
  if (typeof window === "undefined" || !id) return;
  try {
    localStorage.setItem(PREFIX + id, JSON.stringify(n));
  } catch {}
}

/** ¿Hay que mostrar el badge "NUEVO"? */
export function mostrarNovedadEscaner(id: string): boolean {
  const n = leer(id);
  return !n.visto && n.accesos < MAX_ACCESOS_ESCANER;
}

/** El alumno abrió la sección: deja de ser "novedad". */
export function marcarEscanerVisto(id: string) {
  if (!id) return;
  const n = leer(id);
  guardar(id, { accesos: Math.max(n.accesos, MAX_ACCESOS_ESCANER), visto: true });
}

let contadoEstaCarga = false;

/** Suma una apertura de la app (una sola vez por carga de página). */
export function registrarAperturaEscaner(id: string) {
  if (!id || contadoEstaCarga) return;
  contadoEstaCarga = true;
  const n = leer(id);
  if (n.visto || n.accesos >= MAX_ACCESOS_ESCANER) return;
  guardar(id, { ...n, accesos: n.accesos + 1 });
}
