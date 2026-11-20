import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

type EjercicioInput = { id: string; nombre: string; grupoMuscular: string };
type EjercicioOut = { ejercicioId: string; series?: number; reps?: number; descansoSegundos?: number; notas?: string };
type DiaOut = { nombre: string; diaSemana: string; ejercicios: EjercicioOut[] };

const DIAS_VALIDOS = new Set(["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]);

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
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

function findBestMatch(name: string, ejercicios: EjercicioInput[]): EjercicioInput | null {
  let best: EjercicioInput | null = null;
  let bestScore = 0;
  for (const e of ejercicios) {
    const s = Math.max(scoreMatch(name, e.nombre), scoreMatch(name, `${e.nombre} ${e.grupoMuscular}`));
    if (s > bestScore) {
      bestScore = s;
      best = e;
    }
  }
  return bestScore >= 45 ? best : null;
}

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

    const normPrompt = norm(prompt);
    const promptTokens = Array.from(new Set(normPrompt.split(" ").filter((t) => t.length >= 3)));

    const grupoKeywords: Array<[RegExp, string[]]> = [
      [/\bespald|\bdorsal|\bremo|\bjalon|\bdominad/, ["espalda", "dorsal"]],
      [/\bbicep|\bbícep/, ["biceps", "bíceps"]],
      [/\btricep|\btrícep/, ["triceps", "tríceps"]],
      [/\bpech|press banca|apertura|\bcruce/, ["pecho"]],
      [/\bhombro|\bdeltoid|\bmilitar|elevaci/, ["hombro", "hombros", "deltoides"]],
      [/\bpiern|\bcuadri|\bsentadill|\bprensa|\bzancad|\bestoc/, ["cuadriceps", "cuádriceps", "pierna"]],
      [/\bisquio|\bfemoral|\bpeso muerto rum/, ["isquiotibiales", "isquio", "femoral"]],
      [/\bglute|cadera|hip thrust/, ["gluteos", "glúteos"]],
      [/\bgemelo|\bpantorrill|\btobillo/, ["gemelos", "pantorrilla"]],
      [/\babdom|\bcore|\bplancha|\bcrunch/, ["abdomen", "core"]],
      [/\bantebraz/, ["antebrazos", "antebrazo"]],
      [/\bcardio|\baerob/, ["cardio"]],
    ];
    const wantedGroups = new Set<string>();
    for (const [re, vals] of grupoKeywords) {
      if (re.test(normPrompt)) vals.forEach((v) => wantedGroups.add(norm(v)));
    }

    const scored = ejercicios.map((e) => {
      const nNombre = norm(e.nombre);
      const nGrupo = norm(e.grupoMuscular);
      let score = 0;
      for (const t of promptTokens) {
        if (nNombre.includes(t)) score += 5;
        else if (nGrupo.includes(t)) score += 2;
      }
      for (const wg of wantedGroups) {
        if (nGrupo.includes(wg) || wg.includes(nGrupo)) score += 6;
      }
      // direct fuzzy against full prompt for longer names
      if (promptTokens.length > 0) score += Math.min(10, Math.floor(scoreMatch(prompt, e.nombre) / 10));
      return { e, score };
    });

    let selected: EjercicioInput[];
    if (ejercicios.length <= 180) {
      selected = ejercicios;
    } else {
      const byScore = [...scored].sort((a, b) => b.score - a.score);
      const picked: EjercicioInput[] = [];
      const seen = new Set<string>();

      // force-include best matches for explicitly mentioned chunks
      const chunks = prompt
        .split(/,|\n|\by\b|\be\b|\bcon\b|\/|\+/i)
        .map((s) => s.trim())
        .filter((s) => s.length >= 3 && !/^(rutina|crea|crear|arme|arma|armar|hacer|haz|quiero|una|de|para|dia|día|entrenamiento)$/i.test(norm(s)));
      for (const chunk of chunks) {
        const best = findBestMatch(chunk, ejercicios);
        if (best && !seen.has(best.id)) { picked.push(best); seen.add(best.id); }
      }

      // must-include likely prompt/token/group matches
      for (const item of byScore) {
        if (picked.length >= 220) break;
        if (item.score >= 6 && !seen.has(item.e.id)) {
          picked.push(item.e); seen.add(item.e.id);
        }
      }
      // fill with top scored
      for (const item of byScore) {
        if (picked.length >= 220) break;
        if (seen.has(item.e.id)) continue;
        picked.push(item.e); seen.add(item.e.id);
      }
      selected = picked;
    }

    // Compact catalog to keep prompt size reasonable
    const catalog = selected.map((e) => ({ id: e.id, nombre: e.nombre, grupo: e.grupoMuscular }));
    const catalogText = catalog.map((c) => `${c.id}|${c.nombre}|${c.grupo}`).join("\n");

    const system = `Sos un asistente que arma rutinas de entrenamiento para un coach.
Tu trabajo es interpretar el pedido del coach y devolver SOLO un JSON válido (sin markdown, sin texto extra).

REGLAS IMPORTANTES:
- Solo podés usar ejercicios del CATÁLOGO provisto. Nunca inventes ejercicios ni IDs.
- Si el coach pide ejercicios específicos por nombre, debés mapear cada mención al ejercicio del catálogo más equivalente (sinónimos comunes en fitness: press banca/press de banca/plano/pecho plano, dominadas/jalón, etc.) aunque el nombre no sea idéntico.
- Si el coach pide una rutina por grupo muscular/objetivo (ej: "espalda y bíceps"), elegí ejercicios apropiados de esos grupos desde el catálogo.
- Si un ejercicio pedido no existe ni tiene equivalente razonable en el catálogo, incluilo en "noEncontrados".
- Devolvé una rutina práctica y coherente (1 a 6 días según el pedido; si no se especifica, usá 1 día). Asigná diaSemana sin repetir (lunes..domingo).
- Valores por defecto si no se indican: series 4, reps 10, descansoSegundos 90.

FORMATO DE RESPUESTA (JSON):
{
  "nombreSugerido": "string opcional",
  "dias": [
    {
      "nombre": "nombre del día (ej: Espalda y Bíceps)",
      "diaSemana": "lunes|martes|miercoles|jueves|viernes|sabado|domingo",
      "ejercicios": [
        { "ejercicioId": "id_del_catalogo", "series": 4, "reps": 10, "descansoSegundos": 90, "notas": "" }
      ]
    }
  ],
  "noEncontrados": ["nombres pedidos que no se pudieron mapear"],
  "aclaraciones": "texto breve opcional con dudas o supuestos"
}`;

    const user = `CATÁLOGO DE EJERCICIOS DISPONIBLES (id | nombre | grupo):\n${catalogText}\n\nPEDIDO DEL COACH:\n${prompt}`;

    const payloadBase = {
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.2,
      max_tokens: 2000,
    };

    const attempts: Array<Record<string, any>> = [
      { ...payloadBase, model: "llama-3.3-70b-versatile", response_format: { type: "json_object" } },
      { ...payloadBase, model: "llama-3.3-70b-versatile" },
      { ...payloadBase, model: "llama-3.1-8b-instant", response_format: { type: "json_object" } },
      { ...payloadBase, model: "llama-3.1-8b-instant" },
      { ...payloadBase, model: "openai/gpt-oss-20b" },
    ];

    let data: any = null;
    let lastErr = "";
    let lastStatus = 502;

    for (const bodyPayload of attempts) {
      const groqRes = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      if (!groqRes.ok) {
        const errBody = await groqRes.text();
        lastStatus = groqRes.status;
        lastErr = errBody.slice(0, 300);
        console.error("[Groq routine error]", groqRes.status, bodyPayload.model, errBody);
        continue;
      }

      data = await groqRes.json();
      break;
    }

    if (!data) {
      const detail = lastErr ? ` Detalle: ${lastErr}` : "";
      return NextResponse.json({ error: `No se pudo generar la rutina con IA.${detail}` }, { status: lastStatus >= 400 && lastStatus < 600 ? lastStatus : 502 });
    }

    const content = data?.choices?.[0]?.message?.content ?? "{}";

    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      return NextResponse.json({ error: "La IA no devolvió un formato válido. Intentá de nuevo." }, { status: 502 });
    }

    const byId = new Map(ejercicios.map((e) => [e.id, e]));
    const byNormName = new Map(ejercicios.map((e) => [norm(e.nombre), e]));

    const diasIn: any[] = Array.isArray(parsed?.dias) ? parsed.dias : [];
    const usedDays = new Set<string>();
    const fallbackDays = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"];

    const dias: DiaOut[] = diasIn.slice(0, 7).map((d: any, i: number) => {
      let diaSemana = typeof d?.diaSemana === "string" ? d.diaSemana.toLowerCase() : "";
      if (diaSemana === "miercoles" || diaSemana === "miércoles") diaSemana = "miercoles";
      if (diaSemana === "sabado" || diaSemana === "sábado") diaSemana = "sabado";
      if (!DIAS_VALIDOS.has(diaSemana) || usedDays.has(diaSemana)) {
        diaSemana = fallbackDays.find((fd) => !usedDays.has(fd)) ?? "lunes";
      }
      usedDays.add(diaSemana);

      const ejIn: any[] = Array.isArray(d?.ejercicios) ? d.ejercicios : [];
      const ejerciciosOut: EjercicioOut[] = [];
      for (const ej of ejIn) {
        let resolved: EjercicioInput | undefined;
        const eid = typeof ej?.ejercicioId === "string" ? ej.ejercicioId : "";
        if (eid && byId.has(eid)) resolved = byId.get(eid);
        if (!resolved && typeof ej?.nombre === "string") {
          resolved = byNormName.get(norm(ej.nombre)) ?? findBestMatch(ej.nombre, ejercicios) ?? undefined;
        }
        if (!resolved && typeof ej?.ejercicioNombre === "string") {
          resolved = byNormName.get(norm(ej.ejercicioNombre)) ?? findBestMatch(ej.ejercicioNombre, ejercicios) ?? undefined;
        }
        if (!resolved) continue;

        const series = Math.min(20, Math.max(1, parseInt(ej?.series, 10) || 4));
        const reps = Math.min(200, Math.max(1, parseInt(ej?.reps, 10) || 10));
        const descansoSegundos = Math.min(600, Math.max(10, parseInt(ej?.descansoSegundos, 10) || 90));
        const notas = typeof ej?.notas === "string" ? ej.notas.slice(0, 300) : "";
        ejerciciosOut.push({ ejercicioId: resolved.id, series, reps, descansoSegundos, notas });
      }

      return {
        nombre: (typeof d?.nombre === "string" && d.nombre.trim()) ? d.nombre.trim().slice(0, 60) : `Día ${i + 1}`,
        diaSemana,
        ejercicios: ejerciciosOut,
      };
    }).filter((d) => d.ejercicios.length > 0);

    const noEncontrados = Array.isArray(parsed?.noEncontrados)
      ? parsed.noEncontrados.filter((x: any) => typeof x === "string").slice(0, 20)
      : [];
    const aclaraciones = typeof parsed?.aclaraciones === "string" ? parsed.aclaraciones.slice(0, 500) : "";
    const nombreSugerido = typeof parsed?.nombreSugerido === "string" ? parsed.nombreSugerido.slice(0, 80) : "";

    if (dias.length === 0) {
      return NextResponse.json({
        error: "No pude armar la rutina con los ejercicios que tenés cargados.",
        noEncontrados,
        aclaraciones,
      }, { status: 422 });
    }

    return NextResponse.json({ nombreSugerido, dias, noEncontrados, aclaraciones });
  } catch (err: any) {
    console.error("routine generate error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}
