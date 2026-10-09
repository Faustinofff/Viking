import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buscarAlimento, calcularMacros, normalizar, sumarMacros, type FoodItem, type Macros } from "@/lib/food-catalog";

// Proveedor de visión configurable. Por defecto usa Groq (gratis, menos preciso).
// Para probar GPT-4o gratis con GitHub Models (sin tarjeta), configurá:
//   VISION_BASE_URL=https://models.github.ai/inference/v1   (o https://models.inference.ai.azure.com/v1)
//   VISION_API_KEY=<token de GitHub con permiso "Models read">
//   VISION_MODEL=gpt-4o   (o gpt-4o-mini / gpt-4.1-mini para ahorrar tokens)
// Cualquier endpoint compatible con OpenAI Chat Completions sirve (OpenAI, OpenRouter, Azure, etc.).
const VISION_BASE_URL = (process.env.VISION_BASE_URL ?? "https://api.groq.com/openai/v1").replace(/\/$/, "");
const VISION_API_KEY = process.env.VISION_API_KEY ?? process.env.GROQ_API_KEY;
const VISION_MODEL = process.env.VISION_MODEL ?? "qwen/qwen3.8-27b";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: any;
}

async function llmChat(messages: ChatMessage[], maxTokens: number, signal?: AbortSignal): Promise<string | null> {
  if (!VISION_API_KEY) return null;
  const res = await fetch(`${VISION_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${VISION_API_KEY}` },
    signal,
    body: JSON.stringify({
      model: VISION_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return data?.choices?.[0]?.message?.content ?? null;
}

// Gate temporal: solo la cuenta de prueba puede usar el escáner.
const TEST_EMAIL = "pruebachequeo430@gmail.com";

const MAX_IMAGE_CHARS = 4_000_000; // ~3 MB binarios (límite de body en Vercel ~4.5 MB)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

const SYSTEM_PROMPT =
  'Sos un nutricionista experto que analiza fotos de comidas. Devolvé SOLO un JSON con esta forma exacta: ' +
  '{"alimentos":[{"nombre":"string","gramos":number,"confianza":number,"kcal":number,"proteina":number,"carbohidratos":number,"grasas":number}]}. ' +
  'Reglas: usá nombres claros y en singular, como se sirve el plato. ' +
  "Detectá TODOS los elementos de comida que se ven en el plato, sin omitir ninguno. " +
  "Identificá cada elemento COMO ESTÁ SERVIDO y como lo conoce la gente: 'milanesa de pollo', 'empanada de carne', 'tarta de verduras', 'hamburguesa', 'pizza', 'guiso', 'arroz', 'puré de papa', 'ensalada'. " +
  "REGLA GENERAL: NUNCA descompongas un plato preparado en sus ingredientes de cocina. Vale para CUALQUIER alimento: una empanada NO es 'carne, masa y huevo', una tarta NO es 'masa, verduras y crema', una milanesa NO es 'pollo, pan rallado y huevo', un guiso NO es sus ingredientes. El elemento es el plato entero (ej: 'empanada de carne'). " +
  "Distingui preparaciones: si la papa está pisada o hecha puré, decí 'puré de papa', NUNCA 'papa hervida'. Si algo está frito o empanizado, decí el nombre del plato (ej: 'milanesa de pollo'). " +
  "Separalos en elementos distintos SOLO cuando son componentes visiblemente separados en el plato que se comen por separado (ej: una milanesa y su puré al lado → 'milanesa de pollo' y 'puré de papa'; carne con guarnición). " +
  "ANTES DE RESPONDER: volvé a mirar la foto y verificá que estén TODOS los alimentos visibles. Si una ensalada tiene varios vegetales (lechuga, pepino, tomate, rúcula, cebolla, etc.), listalos TODOS, no solo los más obvios. " +
  "Si hay varios trozos del mismo alimento, devolvé UN solo elemento con el gramo total. " +
  "gramos = porción visible estimada. " +
  "kcal, proteina, carbohidratos y grasas = valores TOTALES de esa porción (NO por 100 g). " +
  "Estimá SIEMPRE, incluso si dudás: devolvé tu mejor estimación, nunca dejes campos en 0. " +
  "confianza entre 0 y 1. " +
  "Referencias de escala: si en la imagen hay un círculo blanco, representa un plato estándar de ~26 cm de diámetro; usalo para calcular el tamaño real. " +
  "Usá porciones TÍPICAS de una persona y NO exageres: una pechuga de pollo ~150-200 g, una guarnición ~150-200 g, un plato principal completo ~350-600 g. " +
  "Ante la duda, elegí la porción normal, no la grande. " +
  'Si el usuario da indicaciones, usalas para aclarar o ajustar alimentos y cantidades (ej: si dice "es una empanada de carne", el elemento es empanada de carne). ' +
  'Si no hay comida reconocible, devolvé {"alimentos":[]}.';

interface ItemIA {
  nombre: string;
  gramos: number;
  confianza: number;
  kcal?: number;
  proteina?: number;
  carbohidratos?: number;
  grasas?: number;
}

interface EstimacionPor100 {
  nombre: string;
  kcal: number;
  proteina: number;
  carbohidratos: number;
  grasas: number;
}

// Red de seguridad: estima macros POR 100 g de un alimento por su nombre, sin catálogo.
// Se usa cuando un alimento fuera del catálogo llega sin macros del análisis visual.
async function estimarMacrosTexto(nombres: string[]): Promise<EstimacionPor100[] | null> {
  if (!VISION_API_KEY || nombres.length === 0) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const content = await llmChat(
      [
        {
          role: "system",
          content:
            'Sos un nutricionista experto. Devolvé SOLO un JSON con esta forma exacta: {"alimentos":[{"nombre":"string","kcal":number,"proteina":number,"carbohidratos":number,"grasas":number}]}. ' +
            'Los valores son POR 100 g de alimento, el campo "nombre" debe repetirse exacto a como viene en la consulta. ' +
            "Estimá valores realistas para una porción típica de ese alimento, aunque sea un plato preparado.",
        },
        { role: "user", content: `Estimá los macros por 100 g de: ${nombres.join(", ")}` },
      ],
      400,
      controller.signal
    );
    if (!content) return null;
    let parsed: any = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { return null; }
      } else {
        return null;
      }
    }
    const arr = Array.isArray(parsed) ? parsed : parsed?.alimentos;
    if (!Array.isArray(arr)) return null;
    return arr
      .filter((e: any) => e && typeof e.nombre === "string")
      .map((e: any) => ({
        nombre: e.nombre,
        kcal: Math.max(0, Math.round(Number(e.kcal) || 0)),
        proteina: Math.round((Number(e.proteina) || 0) * 10) / 10,
        carbohidratos: Math.round((Number(e.carbohidratos) || 0) * 10) / 10,
        grasas: Math.round((Number(e.grasas) || 0) * 10) / 10,
      }));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!VISION_API_KEY) {
      return NextResponse.json({ error: "API de visión no configurada" }, { status: 500 });
    }

    const token = req.headers.get("authorization")?.replace("Bearer ", "");
    if (!token) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const publicClient = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: userError } = await publicClient.auth.getUser(token);
    if (userError || !user) {
      return NextResponse.json({ error: "Token inválido" }, { status: 401 });
    }

    if ((user.email ?? "").toLowerCase() !== TEST_EMAIL) {
      return NextResponse.json({ error: "Función no habilitada para esta cuenta" }, { status: 403 });
    }

    const body = await req.json().catch(() => null);
    const image: string | undefined = body?.image;
    const indicaciones: string = (body?.indicaciones ?? "").toString().slice(0, 500);

    if (!image || typeof image !== "string" || !image.startsWith("data:image/")) {
      return NextResponse.json({ error: "Imagen inválida" }, { status: 400 });
    }
    if (image.length > MAX_IMAGE_CHARS) {
      return NextResponse.json({ error: "La imagen es demasiado grande" }, { status: 413 });
    }

    const userText = indicaciones.trim()
      ? `Analizá la comida de la foto. Indicaciones del usuario: ${indicaciones.trim()}`
      : "Analizá la comida de esta foto y estimá los alimentos y sus gramos.";

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      if (!VISION_API_KEY) {
        return NextResponse.json({ error: "API de visión no configurada" }, { status: 500 });
      }
      const content = await llmChat(
        [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: image } },
            ],
          },
        ],
        800,
        controller.signal
      );

      if (content === null) {
        console.error("[meal-scan] Error del proveedor de visión");
        return NextResponse.json({ error: "No se pudo analizar la imagen" }, { status: 502 });
      }

      let parsed: { alimentos?: ItemIA[] } = {};
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try { parsed = JSON.parse(match[0]); } catch {}
        }
      }

      const crudos = Array.isArray(parsed.alimentos) ? parsed.alimentos : [];
      const alimentos = crudos
        .filter((a) => a && typeof a.nombre === "string" && a.nombre.trim())
        .map((a, i) => {
          const gramos = Math.max(0, Math.round(Number(a.gramos) || 0));
          let confianza = Number(a.confianza);
          if (!Number.isFinite(confianza)) confianza = 0.5;
          if (confianza > 1) confianza = confianza / 100;
          confianza = Math.max(0, Math.min(1, confianza));

          const food = buscarAlimento(a.nombre);
          let fuente: "catalogo" | "ia" = "catalogo";
          let ref: FoodItem;
          if (food) {
            ref = food;
          } else {
            // No está en el catálogo: usamos los macros estimados por la IA.
            fuente = "ia";
            const factor = gramos > 0 ? 100 / gramos : 0;
            const num = (v?: number) => (Number.isFinite(Number(v)) ? Number(v) : 0);
            ref = {
              id: `ia_${i}`,
              nombre: a.nombre.trim(),
              aliases: [],
              kcal: Math.round(num(a.kcal) * factor),
              proteina: Math.round(num(a.proteina) * factor * 10) / 10,
              carbohidratos: Math.round(num(a.carbohidratos) * factor * 10) / 10,
              grasas: Math.round(num(a.grasas) * factor * 10) / 10,
            };
          }

          const macros: Macros = calcularMacros(ref, gramos);

          return {
            nombre: a.nombre.trim(),
            nombreCatalogo: food?.nombre ?? null,
            alimentoId: food?.id ?? null,
            matched: !!food,
            fuente,
            gramos,
            confianza: Math.round(confianza * 100) / 100,
            food: ref,
            macros,
          };
        });

      // Garantía: si algún alimento fuera del catálogo llegó sin macros, lo estimamos por nombre.
      const faltantes = alimentos
        .map((a, idx) => ({ a, idx }))
        .filter(({ a }) => a.fuente === "ia" && a.macros.kcal <= 0);
      if (faltantes.length > 0) {
        try {
          const est = await estimarMacrosTexto(faltantes.map(({ a }) => a.nombre));
          if (est && est.length > 0) {
            const estMap = new Map(est.map((e) => [normalizar(e.nombre), e]));
            for (const { a, idx } of faltantes) {
              const v = estMap.get(normalizar(a.nombre));
              if (v && v.kcal > 0) {
                const ref: FoodItem = {
                  id: `ia_${idx}`,
                  nombre: a.nombre,
                  aliases: [],
                  kcal: v.kcal,
                  proteina: v.proteina,
                  carbohidratos: v.carbohidratos,
                  grasas: v.grasas,
                };
                alimentos[idx] = { ...a, food: ref, macros: calcularMacros(ref, a.gramos) };
              }
            }
          }
        } catch {}
      }

      const totales = sumarMacros(alimentos.map((a) => a.macros));

      return NextResponse.json({ alimentos, totales });
    } finally {
      clearTimeout(timeout);
    }
  } catch (err: any) {
    if (err?.name === "AbortError") {
      return NextResponse.json({ error: "El análisis tardó demasiado" }, { status: 504 });
    }
    return NextResponse.json({ error: err?.message ?? "Error inesperado" }, { status: 500 });
  }
}
