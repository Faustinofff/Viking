import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type EjercicioInput = { id: string; nombre: string; grupoMuscular: string };
type EjercicioOut = { ejercicioId: string; series?: number; reps?: number; descansoSegundos?: number; notas?: string };
type DiaOut = { nombre: string; diaSemana: string; ejercicios: EjercicioOut[] };
type RutinaResult = { nombreSugerido: string; dias: DiaOut[]; noEncontrados: string[]; aclaraciones: string };

const DIAS_VALIDOS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

// ─── Normalización y matching ───────────────────────────────

function norm(s: string) {
  return String(s ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreMatch(query: string, target: string) {
  const q = norm(query);
  const t = norm(target);
  if (!q || !t) return 0;
  if (q === t) return 100;
  if (t.includes(q) || q.includes(t)) return 80;
  const qTokens = q.split(" ").filter(Boolean);
  const tTokens = new Set(t.split(" ").filter(Boolean));
  if (qTokens.length === 0) return 0;
  let hits = 0;
  for (const tok of qTokens) if (tTokens.has(tok)) hits++;
  return (hits / qTokens.length) * 60;
}

function findBestMatch(name: string, ejercicios: EjercicioInput[], minScore = 40): EjercicioInput | null {
  let best: EjercicioInput | null = null;
  let bestScore = 0;
  for (const e of ejercicios) {
    const s = Math.max(scoreMatch(name, e.nombre), scoreMatch(name, `${e.nombre} ${e.grupoMuscular}`));
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  return bestScore >= minScore ? best : null;
}

// ─── Músculos (detección y selección determinista) ──────────

interface Mus { key: string; words: string[]; label: string }

const MUSCULOS: Mus[] = [
  { key: "pecho", words: ["pecho", "pectoral"], label: "Pecho" },
  { key: "espalda", words: ["espalda", "dorsal"], label: "Espalda" },
  { key: "hombros", words: ["hombro", "deltoid"], label: "Hombros" },
  { key: "biceps", words: ["biceps"], label: "Bíceps" },
  { key: "triceps", words: ["triceps"], label: "Tríceps" },
  { key: "cuadriceps", words: ["cuadricep"], label: "Cuádriceps" },
  { key: "isquios", words: ["isquiotibial", "isquio", "femoral"], label: "Isquiotibiales" },
  { key: "gluteos", words: ["gluteo"], label: "Glúteos" },
  { key: "aductores", words: ["aductor"], label: "Aductores" },
  { key: "gemelos", words: ["gemelo", "pantorrill"], label: "Gemelos" },
  { key: "abdomen", words: ["abdom", "core"], label: "Abdomen" },
  { key: "antebrazos", words: ["antebraz"], label: "Antebrazos" },
  { key: "cardio", words: ["cardio"], label: "Cardio" },
];

function detectMuscles(text: string): string[] {
  const seg = norm(text);
  const found: string[] = [];
  const add = (k: string) => { if (!found.includes(k)) found.push(k); };

  if (seg.includes("piern")) ["cuadriceps", "isquios", "gluteos", "aductores", "gemelos"].forEach(add);
  if (seg.includes("brazo")) ["biceps", "triceps", "antebrazos"].forEach(add); // "brazo" genérico

  for (const m of MUSCULOS) {
    for (const w of m.words) {
      if (seg.includes(w)) { add(m.key); break; }
    }
  }
  return found;
}

function exercisesForMuscle(key: string, catalog: EjercicioInput[]): EjercicioInput[] {
  const mus = MUSCULOS.find((m) => m.key === key);
  if (!mus) return [];
  return catalog.filter((e) => {
    const g = norm(e.grupoMuscular);
    return mus.words.some((w) => g.includes(w));
  });
}

function extractCount(segment: string, key: string): number {
  const mus = MUSCULOS.find((m) => m.key === key);
  if (!mus) return 0;
  const seg = norm(segment);
  for (const w of mus.words) {
    const re = new RegExp(`(\\d+)\\s*(?:ej(?:ercicios?|s)?\\s*)?(?:de\\s*)?${escapeRe(w)}`);
    const m = seg.match(re);
    if (m) return parseInt(m[1], 10);
  }
  return 0;
}

function detectDaySegments(prompt: string): { diaSemana: string; segment: string }[] | null {
  const lower = prompt.toLowerCase();
  const dayPatterns: Array<[string, RegExp]> = [
    ["lunes", /(?:el\s+|los\s+)?lunes/],
    ["martes", /(?:el\s+|los\s+)?martes/],
    ["miercoles", /(?:el\s+|los\s+)?mi[ée]rcoles/],
    ["jueves", /(?:el\s+|los\s+)?jueves/],
    ["viernes", /(?:el\s+|los\s+)?viernes/],
    ["sabado", /(?:el\s+|los\s+)?s[áa]bado/],
    ["domingo", /(?:el\s+|los\s+)?domingo/],
  ];
  const matches: { idx: number; diaSemana: string }[] = [];
  for (const [dia, re] of dayPatterns) {
    const m = re.exec(lower);
    if (m) matches.push({ idx: m.index, diaSemana: dia });
  }
  if (matches.length === 0) return null;
  matches.sort((a, b) => a.idx - b.idx);
  const seen = new Set<string>();
  const clean = matches.filter((m) => (seen.has(m.diaSemana) ? false : (seen.add(m.diaSemana), true)));
  return clean.map((m, i) => {
    const start = m.idx;
    const end = i + 1 < clean.length ? clean[i + 1].idx : prompt.length;
    return { diaSemana: m.diaSemana, segment: prompt.slice(start, end) };
  });
}

function extractExplicit(text: string, ejercicios: EjercicioInput[]): EjercicioInput[] {
  const chunks = text
    .split(/,|\n|\by\b|\be\b|\bcon\b|\/|\+|;|\./i)
    .map((s) => s.trim())
    .filter((s) => s.length >= 3);
  const stops = /^(rutina|rutinas|crea|crear|genera|generar|arme|arma|armar|hace|hacer|haz|quiero|quisiera|una|un|de|para|dia|día|dias|los|las|el|la|lunes|martes|miercoles|miércoles|jueves|viernes|sabado|sábado|domingo|pon|pone|pones|pongas|poneme|inclui|incluir|incluye|incluime|inclui|x|agrega|agregar|agregale|agregame|ejercicio|ejercicios|musculo|músculo|musculos|cantidad|donde|que|cuando|de)$/i;
  const out: EjercicioInput[] = [];
  for (const c of chunks) {
    if (stops.test(norm(c))) continue;
    const best = findBestMatch(c, ejercicios);
    if (best) out.push(best);
  }
  return out;
}

function dayName(muscles: string[]): string {
  const labels = muscles.map((k) => MUSCULOS.find((m) => m.key === k)?.label ?? k);
  return labels.length ? labels.join(" y ") : "Día";
}

// ─── Variedad / selección inteligente ───────────────────────

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pickDiverse(pool: EjercicioInput[], count: number, usedIds: Set<string>, usedCounts: Map<string, number>, seed: number): EjercicioInput[] {
  if (count <= 0) return [];
  // Ordenar por menor uso global, con rotación por seed para variar entre días
  const scored = pool.map((e, i) => ({
    e,
    u: usedCounts.get(e.id) ?? 0,
    r: (hashStr(e.id + ":" + seed) + i) % 1000,
  }));
  scored.sort((a, b) => (a.u - b.u) || (a.r - b.r));
  const picked: EjercicioInput[] = [];
  for (const s of scored) {
    if (picked.length >= count) break;
    if (usedIds.has(s.e.id)) continue;
    picked.push(s.e);
  }
  return picked;
}

function markUsed(picked: EjercicioInput[], usedIds: Set<string>, usedCounts: Map<string, number>) {
  for (const e of picked) {
    usedIds.add(e.id);
    usedCounts.set(e.id, (usedCounts.get(e.id) ?? 0) + 1);
  }
}

function detectDayCount(prompt: string): number {
  const p = norm(prompt);
  const m = p.match(/(\d+)\s*dias?/);
  if (m) { const n = parseInt(m[1], 10); if (n >= 1 && n <= 7) return n; }
  const words: Record<string, number> = { un: 1, uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7 };
  for (const [w, n] of Object.entries(words)) {
    if (new RegExp(`\\b${w}\\s+dias?\\b`).test(p)) return n;
  }
  return 0;
}

function defaultSplit(dayCount: number): string[][] {
  // Cada entrada es array de muscle keys para ese día
  if (dayCount <= 1) return [["pecho", "espalda", "cuadriceps", "hombros", "biceps", "triceps"]];
  if (dayCount === 2) return [["pecho", "hombros", "triceps", "cuadriceps"], ["espalda", "biceps", "isquios", "gluteos"]];
  if (dayCount === 3) return [["pecho", "hombros", "triceps"], ["espalda", "biceps"], ["cuadriceps", "isquios", "gluteos", "gemelos"]];
  if (dayCount === 4) return [["pecho", "triceps"], ["espalda", "biceps"], ["cuadriceps", "isquios", "gluteos"], ["hombros", "abdomen", "gemelos"]];
  if (dayCount === 5) return [["pecho", "triceps"], ["espalda", "biceps"], ["cuadriceps", "isquios"], ["hombros", "abdomen"], ["gluteos", "gemelos", "biceps", "triceps"]];
  // 6-7
  return [["pecho", "triceps"], ["espalda", "biceps"], ["cuadriceps", "isquios"], ["hombros", "abdomen"], ["gluteos", "gemelos"], ["pecho", "espalda", "biceps"]].slice(0, dayCount);
}

function diversifyRoutine(routine: RutinaResult, catalog: EjercicioInput[]): RutinaResult {
  if (routine.dias.length <= 1) return routine;
  const usedCounts = new Map<string, number>();
  for (const d of routine.dias) for (const ej of d.ejercicios) usedCounts.set(ej.ejercicioId, (usedCounts.get(ej.ejercicioId) ?? 0) + 1);

  // Detectar días idénticos o casi idénticos
  const signatures = routine.dias.map((d) => d.ejercicios.map((e) => e.ejercicioId).sort().join(","));
  const sigCounts = new Map<string, number>();
  for (const s of signatures) sigCounts.set(s, (sigCounts.get(s) ?? 0) + 1);

  const hasDupes = [...sigCounts.values()].some((c) => c > 1);
  if (!hasDupes) return routine;

  // Reasignar ejercicios en días duplicados, manteniendo estructura pero variando picks
  const globalUsed = new Map<string, number>();
  const newDias = routine.dias.map((d, dayIdx) => {
    const dayUsed = new Set<string>();
    const newEjs: EjercicioOut[] = [];
    for (const ej of d.ejercicios) {
      const orig = catalog.find((c) => c.id === ej.ejercicioId);
      if (!orig) { newEjs.push(ej); continue; }
      const count = globalUsed.get(ej.ejercicioId) ?? 0;
      // Si ya se usó mucho, intentar reemplazar por otro del mismo grupo muscular
      if (count >= 1 && dayIdx > 0) {
        const pool = exercisesForMuscle(
          MUSCULOS.find((m) => m.words.some((w) => norm(orig.grupoMuscular).includes(w)))?.key ?? "",
          catalog
        ).filter((c) => !dayUsed.has(c.id));
        const replacement = pickDiverse(pool.length ? pool : catalog, 1, dayUsed, globalUsed, dayIdx * 100 + newEjs.length);
        if (replacement.length > 0) {
          const r = replacement[0];
          dayUsed.add(r.id);
          globalUsed.set(r.id, (globalUsed.get(r.id) ?? 0) + 1);
          newEjs.push({ ...ej, ejercicioId: r.id });
          continue;
        }
      }
      dayUsed.add(ej.ejercicioId);
      globalUsed.set(ej.ejercicioId, count + 1);
      newEjs.push(ej);
    }
    return { ...d, ejercicios: newEjs };
  });
  return { ...routine, dias: newDias };
}

function buildDeterministic(prompt: string, ejercicios: EjercicioInput[]): RutinaResult {
  const dias: DiaOut[] = [];
  const noEncontrados: string[] = [];
  const globalUsedCounts = new Map<string, number>();

  const buildDay = (diaSemana: string, segment: string, seed: number, fallbackMuscles?: string[]): DiaOut | null => {
    const musclesDetected = detectMuscles(segment);
    const muscles = musclesDetected.length > 0 ? musclesDetected : (fallbackMuscles ?? []);
    const explicits = extractExplicit(segment, ejercicios);
    const out: EjercicioOut[] = [];
    const usedIds = new Set<string>();

    for (const ex of explicits) {
      if (!usedIds.has(ex.id) && !globalUsedCounts.has(ex.id)) { usedIds.add(ex.id); out.push({ ejercicioId: ex.id }); markUsed([ex], usedIds, globalUsedCounts); }
    }
    // Si todos los explícitos ya se usaron, permitir reutilizar solo si el día quedaría vacío
    if (out.length === 0) {
      for (const ex of explicits) {
        if (!usedIds.has(ex.id)) { usedIds.add(ex.id); out.push({ ejercicioId: ex.id }); markUsed([ex], usedIds, globalUsedCounts); }
      }
    }
    for (const mk of muscles) {
      const explicitCount = extractCount(segment, mk);
      const cap = explicitCount > 0 ? explicitCount : (3 + ((seed + hashStr(mk)) % 2)); // 3 o 4 si no se aclara
      const pool = exercisesForMuscle(mk, ejercicios);
      const alreadyByMuscle = explicits.filter((ex) => pool.some((p) => p.id === ex.id)).length;
      let remaining = cap - alreadyByMuscle;
      if (remaining > 0) {
        const picks = pickDiverse(pool, remaining, usedIds, globalUsedCounts, seed + hashStr(mk));
        for (const e of picks) {
          if (remaining <= 0) break;
          if (!usedIds.has(e.id)) { usedIds.add(e.id); out.push({ ejercicioId: e.id }); markUsed([e], usedIds, globalUsedCounts); remaining--; }
        }
      }
    }
    if (out.length === 0) {
      // Sin músculos ni explícitos: armar día variado usando split o muestra diversa
      const fallbackPool = ejercicios.filter((e) => !usedIds.has(e.id));
      const picks = pickDiverse(fallbackPool.length ? fallbackPool : ejercicios, 5, new Set(), globalUsedCounts, seed);
      for (const e of picks) { if (!usedIds.has(e.id)) { usedIds.add(e.id); out.push({ ejercicioId: e.id }); markUsed([e], usedIds, globalUsedCounts); } }
    }
    if (out.length === 0) return null;
    const name = muscles.length > 0 ? dayName(muscles) : "Entrenamiento";
    return { nombre: name, diaSemana, ejercicios: out };
  };

  const segments = detectDaySegments(prompt);
  const usedDays = new Set<string>();
  const requestedCount = detectDayCount(prompt);

  if (segments && segments.length) {
    // Si hay días nombrados pero sin músculos, asignar split por defecto
    const anyMuscle = segments.some((s) => detectMuscles(s.segment).length > 0 || extractExplicit(s.segment, ejercicios).length > 0);
    const split = defaultSplit(segments.length);
    segments.forEach((seg, idx) => {
      const segHasContent = detectMuscles(seg.segment).length > 0 || extractExplicit(seg.segment, ejercicios).length > 0;
      const fb = !segHasContent ? split[idx % split.length] : undefined;
      const day = buildDay(seg.diaSemana, seg.segment, idx + 1, fb);
      if (day && !usedDays.has(day.diaSemana)) {
        usedDays.add(day.diaSemana);
        if (!segHasContent && fb) day.nombre = dayName(fb);
        dias.push(day);
      }
    });
  } else if (requestedCount > 1) {
    // "rutina de 4 dias" sin nombrar días
    const split = defaultSplit(requestedCount);
    const dayNames = DIAS_VALIDOS.slice(0, requestedCount);
    dayNames.forEach((dn, idx) => {
      const fb = split[idx % split.length];
      const day = buildDay(dn, prompt, idx + 1, fb);
      if (day) { day.nombre = dayName(fb); day.diaSemana = dn; usedDays.add(dn); dias.push(day); }
    });
  } else {
    const day = buildDay("lunes", prompt, 1);
    if (day) {
      if (detectMuscles(prompt).length === 0 && extractExplicit(prompt, ejercicios).length === 0) {
        day.nombre = "Full Body";
      }
      dias.push(day);
    }
  }

  // Garantizar diaSemana únicos y válidos
  dias.forEach((d, i) => {
    if (!DIAS_VALIDOS.includes(d.diaSemana)) {
      const free = DIAS_VALIDOS.find((dv) => !dias.some((x) => x.diaSemana === dv));
      d.diaSemana = free ?? DIAS_VALIDOS[i % 7];
    }
  });

  const nombreSugerido = dias.length > 1 ? `Rutina ${dias.length} días` : (dias[0]?.nombre ? `Rutina ${dias[0].nombre}` : "");
  return { nombreSugerido, dias, noEncontrados, aclaraciones: "" };
}

// ─── Parsing de JSON robusto ────────────────────────────────

function stripTrailingCommas(s: string) {
  return s.replace(/,(\s*[}\]])/g, "$1");
}

function tryParse(s: string): any | null {
  const variants = [
    s,
    s.replace(/\bNone\b/g, "null").replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false").replace(/\bundefined\b/g, "null"),
    s.replace(/'/g, '"'),
  ];
  for (const v of variants) {
    try { const p = JSON.parse(v); if (p && typeof p === "object") return p; } catch {}
  }
  return null;
}

function extractJson(text: string): any | null {
  let t = String(text ?? "").replace(/^\uFEFF/, "").trim();
  if (!t) return null;

  const fence = t.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fence) t = fence[1].trim();

  const direct = tryParse(t);
  if (direct) return direct;

  const start = t.indexOf("{");
  const end = t.lastIndexOf("}");
  if (start !== -1 && end > start) {
    const slice = t.slice(start, end + 1);
    const cleaned = stripTrailingCommas(slice);
    const p = tryParse(cleaned);
    if (p) return p;
  }
  return null;
}

// ─── Resolución de rutina a partir de JSON parseado ─────────

function canonDia(s: string): string {
  const n = norm(s);
  for (const d of DIAS_VALIDOS) if (n.includes(d)) return d;
  return n;
}

function clampInt(v: any, min: number, max: number, dflt: number): number {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

function resolveRoutine(parsed: any, ejercicios: EjercicioInput[]): RutinaResult {
  const byId = new Map(ejercicios.map((e) => [e.id, e]));
  const byNormName = new Map(ejercicios.map((e) => [norm(e.nombre), e]));

  const diasIn: any[] = Array.isArray(parsed?.dias) ? parsed.dias : [];
  const usedDays = new Set<string>();

  const dias: DiaOut[] = diasIn.slice(0, 7).map((d: any, i: number) => {
    let diaSemana = canonDia(typeof d?.diaSemana === "string" ? d.diaSemana : "");
    if (!DIAS_VALIDOS.includes(diaSemana) || usedDays.has(diaSemana)) {
      diaSemana = DIAS_VALIDOS.find((fd) => !usedDays.has(fd)) ?? DIAS_VALIDOS[i % 7];
    }
    usedDays.add(diaSemana);

    const ejIn: any[] = Array.isArray(d?.ejercicios) ? d.ejercicios : [];
    const out: EjercicioOut[] = [];
    for (const ej of ejIn) {
      let resolved: EjercicioInput | null = null;
      const eid = typeof ej?.ejercicioId === "string" ? ej.ejercicioId : "";
      if (eid && byId.has(eid)) resolved = byId.get(eid)!;
      if (!resolved) {
        for (const key of ["nombre", "ejercicioNombre", "name", "ejercicio"]) {
          if (typeof ej?.[key] === "string" && ej[key].trim()) {
            resolved = byNormName.get(norm(ej[key])) ?? findBestMatch(ej[key], ejercicios);
            if (resolved) break;
          }
        }
      }
      if (!resolved) continue;
      out.push({
        ejercicioId: resolved.id,
        series: clampInt(ej?.series, 1, 20, 4),
        reps: clampInt(ej?.reps, 1, 200, 10),
        descansoSegundos: clampInt(ej?.descansoSegundos, 10, 600, 90),
        notas: typeof ej?.notas === "string" ? ej.notas.slice(0, 300) : "",
      });
    }

    return {
      nombre: (typeof d?.nombre === "string" && d.nombre.trim()) ? d.nombre.trim().slice(0, 60) : `Día ${i + 1}`,
      diaSemana,
      ejercicios: out,
    };
  }).filter((d) => d.ejercicios.length > 0);

  const noEncontrados = Array.isArray(parsed?.noEncontrados)
    ? parsed.noEncontrados.filter((x: any) => typeof x === "string").slice(0, 20)
    : [];
  const aclaraciones = typeof parsed?.aclaraciones === "string" ? parsed.aclaraciones.slice(0, 500) : "";
  const nombreSugerido = typeof parsed?.nombreSugerido === "string" ? parsed.nombreSugerido.slice(0, 80) : "";

  return { nombreSugerido, dias, noEncontrados, aclaraciones };
}

// ─── Selección de catálogo (evita límites de tokens) ────────

function selectCatalog(prompt: string, ejercicios: EjercicioInput[]): EjercicioInput[] {
  if (ejercicios.length <= 220) return ejercicios;

  const tokens = new Set(norm(prompt).split(" ").filter((t) => t.length >= 3));
  const muscles = detectMuscles(prompt);
  const explicit = extractExplicit(prompt, ejercicios);
  const explicitIds = new Set(explicit.map((e) => e.id));

  const scored = ejercicios.map((e) => {
    const n = norm(e.nombre);
    const g = norm(e.grupoMuscular);
    let s = 0;
    for (const t of tokens) {
      if (n.includes(t)) s += 4;
      else if (g.includes(t)) s += 1;
    }
    for (const mk of muscles) {
      const mus = MUSCULOS.find((m) => m.key === mk);
      if (mus && mus.words.some((w) => g.includes(w))) s += 5;
    }
    s += Math.min(10, Math.floor(scoreMatch(prompt, e.nombre) / 10));
    return { e, s };
  });

  const picked: EjercicioInput[] = [];
  const seen = new Set<string>();
  const add = (e: EjercicioInput) => { if (!seen.has(e.id)) { seen.add(e.id); picked.push(e); } };

  for (const ex of explicit) add(ex);

  // Priorizar matches directos del prompt
  scored.sort((a, b) => b.s - a.s);
  for (const x of scored) {
    if (picked.length >= 140) break;
    if (x.s > 0) add(x.e);
  }

  // Garantizar diversidad: al menos algunos ejercicios por grupo muscular
  const byGroup = new Map<string, EjercicioInput[]>();
  for (const e of ejercicios) {
    const g = norm(e.grupoMuscular) || "otros";
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g)!.push(e);
  }
  for (const [, group] of byGroup) {
    if (picked.length >= 210) break;
    let added = 0;
    for (const e of group) {
      if (added >= 4) break;
      if (!seen.has(e.id)) { add(e); added++; }
    }
  }

  // Rellenar hasta el tope con el resto priorizado
  for (const x of scored) {
    if (picked.length >= 220) break;
    add(x.e);
  }
  return picked;
}

// ─── Llamada a Groq ─────────────────────────────────────────

async function callGroq(messages: { role: string; content: string }[], model: string, responseFormat?: boolean) {
  const body: Record<string, any> = {
    model,
    messages,
    temperature: 0.7,
    max_tokens: 2200,
  };
  if (responseFormat) body.response_format = { type: "json_object" };
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.text();
    console.error("[Groq routine error]", res.status, model, errBody);
    throw new Error(`groq_${res.status}`);
  }
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? "";
}

// ─── Endpoint ───────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY no configurada." }, { status: 500 });
    }

    const body = await req.json();
    const prompt: string = (body?.prompt ?? "").toString().trim();
    const ejercicios: EjercicioInput[] = Array.isArray(body?.ejercicios) ? body.ejercicios : [];

    if (!prompt) return NextResponse.json({ error: "Escribí qué rutina querés crear." }, { status: 400 });
    if (ejercicios.length === 0) {
      return NextResponse.json({ error: "No hay ejercicios cargados en tu sistema." }, { status: 400 });
    }

    const catalog = selectCatalog(prompt, ejercicios);
    const catalogText = catalog.map((c) => `${c.id}|${c.nombre}|${c.grupoMuscular}`).join("\n");

    const system = `Sos un asistente experto en programación de entrenamiento. Recibís un pedido en lenguaje natural de un coach y un CATÁLOGO de ejercicios disponibles (formato: id|nombre|grupo muscular).

Tu tarea: interpretar el pedido con la MÁXIMA comprensión y devolver UN ÚNICO objeto JSON válido. Nada de markdown, nada de texto antes ni después. Solo el JSON.

REGLAS DE ORO:
1. SOLO CATÁLOGO: Usá únicamente ejercicios del CATÁLOGO. Jamás inventes ejercicios ni IDs. El catálogo incluye ejercicios propios del coach (pueden tener nombres no típicos, ej. "pecho inclinado en polea") y debés considerarlos y usarlos cuando encajan.
2. COMPRENSIÓN TOTAL: Interpretá el contexto completo: cantidad de días, nivel (principiante/intermedio/avanzado), objetivo (hipertrofia, fuerza, pérdida de grasa, etc.), género si se menciona, restricciones, y cualquier detalle. Adaptá la rutina a eso (volumen, selección, complejidad, series/reps/descanso).
3. DÍAS Y SPLIT:
   - Si el coach indica días concretos ("lunes..., martes..."), creá un día por cada uno, respetando lo pedido.
   - Si pide "rutina de N días" sin especificar músculos por día, diseñá un split lógico y variado (ej: 3 días = push/pull/legs o full body; 4 días = torso/pierna o push/pull/legs+hombros; 5 días = bro split o PPLUL). NO repitas el mismo esquema ni los mismos ejercicios en todos los días.
   - Si pide músculos sin aclarar días, elegí días coherentes (lunes en adelante) sin repetir diaSemana.
4. VARIEDAD OBLIGATORIA:
   - NUNCA repitas la misma lista de ejercicios en días distintos. Aunque dos días trabajen el mismo músculo, VARIÁ los ejercicios (ej. pecho día 1: press banca, aperturas; pecho día 3: press inclinado, cruces en polea).
   - Dentro del mismo músculo, elegí ejercicios distintos y complementarios del catálogo; no te quedes siempre con los 3-4 más "típicos". Mezclá opciones del catálogo, incluyendo las que agregó el coach.
   - Evitá repetir un mismo ejercicio en más de un día salvo que el usuario lo pida explícitamente o la estructura lo justifique claramente (y aun así variá el resto).
5. CANTIDAD POR MÚSCULO:
   - Si el coach pide un músculo SIN aclarar cuántos ejercicios, incluí 3 o 4 ejercicios de ese músculo (MÁXIMO 4, NUNCA más de 4).
   - Si el coach SÍ aclara la cantidad ("3 de pecho", "5 ejercicios de espalda", "incluí 2 de bíceps"), respetá EXACTAMENTE esa cantidad, incluso si es mayor a 4.
6. MEZCLA DE FORMAS EN UN MISMO DÍA/PEDIDO:
   - "martes incluí 3 ejercicios de pecho y press militar y elevaciones laterales" → 3 de Pecho MÁS Press Militar y Elevaciones Laterales (los específicos se agregan aparte, NO cuentan dentro de los 3 de pecho).
   - "miércoles incluí sentadilla, prensa, sillón de cuádriceps y gemelos" → los 3 nombrados de cuádriceps MÁS 3 o 4 de Gemelos (cantidad no aclarada para gemelos). Si el coach lista ejercicios concretos de un músculo, respetá esa lista y no agregues más de ese músculo salvo que lo pida.
7. MAPEO DE NOMBRES: Si pide un ejercicio por nombre, mapealo al más equivalente del catálogo (sinónimos: press banca/plano = press de pecho; dominadas/jalón = tirón vertical; sillón de cuádriceps = extensión de cuádriceps; peso muerto rumano = RDL; etc.). Si no hay equivalente, ponelo en "noEncontrados".
8. PARÁMETROS: series/reps/descanso coherentes con el contexto. Por defecto: series 4, reps 10, descansoSegundos 90. Principiante: menos volumen/descanso moderado. Fuerza: menos reps, más descanso. Hipertrofia: 8-12 reps. Resistencia: más reps.
9. diaSemana sin repetir (lunes..domingo). Máximo 7 días. Respetá los días pedidos.

FORMATO EXACTO DE SALIDA (solo este JSON):
{
  "nombreSugerido": "nombre corto de la rutina",
  "dias": [
    {
      "nombre": "nombre del día",
      "diaSemana": "lunes",
      "ejercicios": [
        { "ejercicioId": "id_del_catalogo", "series": 4, "reps": 10, "descansoSegundos": 90, "notas": "" }
      ]
    }
  ],
  "noEncontrados": [],
  "aclaraciones": ""
}

Ejemplo (pedido mezclado, días con músculos y con ejercicios específicos + cantidad):
Pedido: "lunes espalda y bíceps; martes incluí 3 de pecho y press militar y elevaciones laterales; miércoles incluí sentadilla, prensa, sillón de cuádriceps y gemelos; jueves pecho y tríceps"
Respuesta:
{
  "nombreSugerido": "Rutina 4 días",
  "dias": [
    { "nombre": "Espalda y Bíceps", "diaSemana": "lunes", "ejercicios": [ {"ejercicioId":"<espalda_1>","series":4,"reps":10,"descansoSegundos":90,"notas":""}, {"ejercicioId":"<espalda_2>"}, {"ejercicioId":"<espalda_3>"}, {"ejercicioId":"<biceps_1>"}, {"ejercicioId":"<biceps_2>"}, {"ejercicioId":"<biceps_3>"} ] },
    { "nombre": "Pecho y Hombros", "diaSemana": "martes", "ejercicios": [ {"ejercicioId":"<pecho_1>"}, {"ejercicioId":"<pecho_2>"}, {"ejercicioId":"<pecho_3>"}, {"ejercicioId":"<press_militar>"}, {"ejercicioId":"<elevaciones_laterales>"} ] },
    { "nombre": "Piernas y Gemelos", "diaSemana": "miercoles", "ejercicios": [ {"ejercicioId":"<sentadilla>"}, {"ejercicioId":"<prensa>"}, {"ejercicioId":"<extension_cuadriceps>"}, {"ejercicioId":"<gemelo_1>"}, {"ejercicioId":"<gemelo_2>"}, {"ejercicioId":"<gemelo_3>"} ] },
    { "nombre": "Pecho y Tríceps", "diaSemana": "jueves", "ejercicios": [ {"ejercicioId":"<pecho_4_distinto>"}, {"ejercicioId":"<pecho_5_distinto>"}, {"ejercicioId":"<pecho_6_distinto>"}, {"ejercicioId":"<triceps_1>"}, {"ejercicioId":"<triceps_2>"}, {"ejercicioId":"<triceps_3>"} ] }
  ],
  "noEncontrados": [],
  "aclaraciones": ""
}`;

    const user = `CATÁLOGO DE EJERCICIOS (id|nombre|grupo):\n${catalogText}\n\nPEDIDO DEL COACH:\n${prompt}`;

    const attempts: Array<[string, boolean]> = [
      ["llama-3.3-70b-versatile", true],
      ["llama-3.3-70b-versatile", false],
      ["llama-3.1-8b-instant", true],
      ["llama-3.1-8b-instant", false],
      ["openai/gpt-oss-20b", false],
    ];

    // Primera pasada: probar modelos, parsear al vuelo.
    const contents: string[] = [];
    for (const [model, rf] of attempts) {
      try {
        const content = await callGroq([{ role: "system", content: system }, { role: "user", content: user }], model, rf);
        if (!content.trim()) continue;
        contents.push(content);
        const parsedJson = extractJson(content);
        if (parsedJson) {
          const routine = diversifyRoutine(resolveRoutine(parsedJson, ejercicios), ejercicios);
          if (routine.dias.length > 0) return NextResponse.json(routine);
        }
      } catch {}
    }

    // Segunda pasada: reparar el mejor contenido devuelto.
    if (contents.length > 0) {
      const repairSystem = "El siguiente texto debería ser un objeto JSON válido según el formato pedido. Devolvé EXCLUSIVAMENTE el JSON corregido y parseable, sin markdown ni texto extra. Si faltan días o ejercicios, completá razonablemente.";
      try {
        const repaired = await callGroq(
          [
            { role: "system", content: repairSystem },
            { role: "user", content: contents[0] },
          ],
          "llama-3.3-70b-versatile",
          true,
        );
        if (repaired.trim()) {
          const parsedJson = extractJson(repaired);
          if (parsedJson) {
            const routine = diversifyRoutine(resolveRoutine(parsedJson, ejercicios), ejercicios);
            if (routine.dias.length > 0) return NextResponse.json(routine);
          }
        }
      } catch {}
    }

    // Tercera pasada: construcción determinista (NUNCA devuelve "formato no válido").
    const det = diversifyRoutine(buildDeterministic(prompt, ejercicios), ejercicios);
    if (det.dias.length > 0) {
      det.aclaraciones = (det.aclaraciones ? det.aclaraciones + " · " : "") + "Armado automáticamente. Revisá series/reps antes de guardar.";
      return NextResponse.json(det);
    }

    return NextResponse.json({ error: "No pude entender el pedido para armar una rutina. Probá indicando días o grupos musculares." }, { status: 422 });
  } catch (err: any) {
    console.error("routine generate error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}