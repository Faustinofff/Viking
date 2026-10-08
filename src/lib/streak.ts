// ─── Racha de constancia ─────────────────────────────────────
// Reglas (definidas con el producto):
//  - +1 por DÍA entrenado (si entrenó 2 veces el mismo día, cuenta 1).
//  - Sábado/domingo sin entrenar = NEUTRO (no corta la racha).
//  - Entrenar cualquier día (finde incluido) suma y reinicia las faltas.
//  - Tolera 2 faltas de lunes a viernes; a la 3ª falta hábil consecutiva se pierde.
//  - Hoy, si es día hábil y todavía no entrenó, es NEUTRO hasta que termine el día.

const WEEK_LABELS = ["L", "M", "M", "J", "V", "S", "D"];

export function localDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function computeStreak(trainedDates: Set<string>, today: Date = new Date()): number {
  let streak = 0;
  let misses = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // Tope de seguridad: evita bucles infinitos si vinieran entrenando todos los días desde siempre.
  for (let guard = 0; guard < 1100; guard++) {
    const key = localDateKey(cursor);
    const dow = cursor.getDay(); // 0 = domingo ... 6 = sábado
    const isWeekend = dow === 0 || dow === 6;
    const isToday = guard === 0;

    if (trainedDates.has(key)) {
      streak++;
      misses = 0;
    } else if (!isWeekend && !isToday) {
      misses++;
      if (misses >= 3) break;
    }

    cursor.setDate(cursor.getDate() - 1);
  }

  return streak;
}

export interface StreakDay {
  label: string;
  key: string;
  trained: boolean;
  isToday: boolean;
}

// Semana actual (lunes a domingo) con el estado de cada día.
export function getCurrentWeek(trainedDates: Set<string>, today: Date = new Date()): StreakDay[] {
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const offsetToMonday = (cursor.getDay() + 6) % 7; // 0=lunes ... 6=domingo
  cursor.setDate(cursor.getDate() - offsetToMonday);

  const todayKey = localDateKey(today);
  const days: StreakDay[] = [];
  for (let i = 0; i < 7; i++) {
    const key = localDateKey(cursor);
    days.push({ label: WEEK_LABELS[i], key, trained: trainedDates.has(key), isToday: key === todayKey });
    cursor.setDate(cursor.getDate() + 1);
  }
  return days;
}
