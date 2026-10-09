import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buscarAlimento, calcularMacros, sumarMacros, type FoodItem, type Macros } from "@/lib/food-catalog";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const VISION_MODEL = "qwen/qwen3.8-27b";

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
  "Separá en elementos distintos SOLO cuando son componentes visiblemente separados en el plato que se comen por separado (ej: una milanesa y su puré al lado → 'milanesa de pollo' y 'puré de papa'; una ensalada con vegetales distinguibles → 'tomate' y 'lechuga'; carne con guarnición). " +
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

export async function POST(req: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY no configurada" }, { status: 500 });
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
      const res = await fetch(GROQ_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        signal: controller.signal,
        body: JSON.stringify({
          model: VISION_MODEL,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: userText },
                { type: "image_url", image_url: { url: image } },
              ],
            },
          ],
          temperature: 0.2,
          max_tokens: 800,
          response_format: { type: "json_object" },
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("[meal-scan] Groq error", res.status, errBody.slice(0, 500));
        return NextResponse.json({ error: "No se pudo analizar la imagen" }, { status: res.status });
      }

      const data = await res.json();
      const content: string = data?.choices?.[0]?.message?.content ?? "{}";

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
