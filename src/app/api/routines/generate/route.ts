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
  { key: "gemelos", words: ["gemelo", "pantorrill"], label: "Gemelos" },
  { key: "abdomen", words: ["abdom", "core"], label: "Abdomen" },
  { key: "antebrazos", words: ["antebraz"], label: "Antebrazos" },
  { key: "cardio", words: ["cardio"], label: "Cardio" },
];

function detectMuscles(text: string): string[] {
  const seg = norm(text);
  const found: string[] = [];
  const add = (k: string) => { if (!found.includes(k)) found.push(k); };

  if (seg.includes("piern")) ["cuadriceps", "isquios", "gluteos", "gemelos"].forEach(add);
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
    const re = new RegExp(`(\\d+)\\s*(?:ejercicios?\\s*)?(?:de\\s*)?${escapeRe(w)}`);
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

function buildDeterministic(prompt: string, ejercicios: EjercicioInput[]): RutinaResult {
  const dias: DiaOut[] = [];
  const noEncontrados: string[] = [];

  const buildDay = (diaSemana: string, segment: string): DiaOut | null => {
    const muscles = detectMuscles(segment);
    const explicits = extractExplicit(segment, ejercicios);
    const out: EjercicioOut[] = [];
    const usedIds = new Set<string>();

    for (const ex of explicits) {
      if (!usedIds.has(ex.id)) { usedIds.add(ex.id); out.push({ ejercicioId: ex.id }); }
    }
    for (const mk of muscles) {
      const count = extractCount(segment, mk) || 4;
      const pool = exercisesForMuscle(mk, ejercicios).filter((e) => !usedIds.has(e.id));
      for (const e of pool.slice(0, count)) {
        if (!usedIds.has(e.id)) { usedIds.add(e.id); out.push({ ejercicioId: e.id }); }
      }
    }
    if (out.length === 0) {
      for (const e of ejercicios) {
        if (out.length >= 5) break;
        if (!usedIds.has(e.id)) { usedIds.add(e.id); out.push({ ejercicioId: e.id }); }
      }
    }
    if (out.length === 0) return null;
    return { nombre: dayName(muscles), diaSemana, ejercicios: out };
  };

  const segments = detectDaySegments(prompt);
  const usedDays = new Set<string>();
  if (segments && segments.length) {
    for (const seg of segments) {
      const day = buildDay(seg.diaSemana, seg.segment);
      if (day && !usedDays.has(day.diaSemana)) {
        usedDays.add(day.diaSemana);
        dias.push(day);
      }
    }
  } else {
    const day = buildDay("lunes", prompt);
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

  const nombreSugerido = dias[0]?.nombre ? `Rutina ${dias[0].nombre}` : "";
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
  if (ejercicios.length <= 180) return ejercicios;

  const tokens = new Set(norm(prompt).split(" ").filter((t) => t.length >= 3));
  const muscles = detectMuscles(prompt);

  const scored = ejercicios.map((e) => {
    const n = norm(e.nombre);
    const g = norm(e.grupoMuscular);
    let s = 0;
    for (const t of tokens) {
      if (n.includes(t)) s += 4;
      else if (g.includes(t)) s += 1;
    }
    for (const mk of muscles) {
      if (g.includes(mk)) s += 5;
    }
    s += Math.min(10, Math.floor(scoreMatch(prompt, e.nombre) / 10));
    return { e, s };
  });

  const picked: EjercicioInput[] = [];
  const seen = new Set<string>();
  for (const ex of extractExplicit(prompt, ejercicios)) {
    if (!seen.has(ex.id)) { seen.add(ex.id); picked.push(ex); }
  }
  scored.sort((a, b) => b.s - a.s);
  for (const x of scored) {
    if (picked.length >= 180) break;
    if (!seen.has(x.e.id)) { seen.add(x.e.id); picked.push(x.e); }
  }
  return picked;
}

// ─── Llamada a Groq ─────────────────────────────────────────

async function callGroq(messages: { role: string; content: string }[], model: string, responseFormat?: boolean) {
  const body: Record<string, any> = {
    model,
    messages,
    temperature: 0.2,
    max_tokens: 1600,
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
1. Solo podés usar ejercicios que estén en el CATÁLOGO. Jamás inventes ejercicios ni IDs.
2. Entendé días de la semana: si el coach dice "lunes pecho y tríceps, martes espalda y bíceps, miércoles pecho y hombros", creá un día por cada uno, en ese orden y con esa combinación exacta.
3. Si el coach pide ejercicios específicos por nombre, mapealos al ejercicio más equivalente del catálogo (sinónimos de fitness: "press banca"/"press plano"/"pecho plano" = press de pecho; "dominadas"/"jalón" = dominadas/jalón; etc.).
4. Si el coach pide una cantidad ("incluí 5 de pecho", "3 ejercicios de espalda"), respetá esa cantidad de ejercicios.
5. Si el coach pide por grupo muscular, elegí ejercicios variados de ese grupo desde el catálogo.
6. Si un ejercicio pedido no está ni tiene equivalente en el catálogo, ponelo en "noEncontrados".
7. Asigná "diaSemana" sin repetir (lunes..domingo), respetando los días pedidos.
8. Valores por defecto si no se indican: series 4, reps 10, descansoSegundos 90.

FORMATO EXACTO DE SALIDA (solo este JSON):
{
  "nombreSugerido": "nombre corto de la rutina",
  "dias": [
    {
      "nombre": "nombre del día, ej: Pecho y Tríceps",
      "diaSemana": "lunes",
      "ejercicios": [
        { "ejercicioId": "id_del_catalogo", "series": 4, "reps": 10, "descansoSegundos": 90, "notas": "" }
      ]
    }
  ],
  "noEncontrados": [],
  "aclaraciones": ""
}

Ejemplo de pedido: "lunes pecho y tríceps, martes espalda y bíceps"
Ejemplo de respuesta correcta:
{
  "nombreSugerido": "Pecho/Tríceps y Espalda/Bíceps",
  "dias": [
    { "nombre": "Pecho y Tríceps", "diaSemana": "lunes", "ejercicios": [ {"ejercicioId":"<id_pecho_1>"}, {"ejercicioId":"<id_pecho_2>"}, {"ejercicioId":"<id_triceps_1>"} ] },
    { "nombre": "Espalda y Bíceps", "diaSemana": "martes", "ejercicios": [ {"ejercicioId":"<id_espalda_1>"}, {"ejercicioId":"<id_espalda_2>"}, {"ejercicioId":"<id_biceps_1>"} ] }
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
          const routine = resolveRoutine(parsedJson, ejercicios);
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
            const routine = resolveRoutine(parsedJson, ejercicios);
            if (routine.dias.length > 0) return NextResponse.json(routine);
          }
        }
      } catch {}
    }

    // Tercera pasada: construcción determinista (NUNCA devuelve "formato no válido").
    const det = buildDeterministic(prompt, ejercicios);
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