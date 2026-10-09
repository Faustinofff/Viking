import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { buscarAlimento, calcularMacros, sumarMacros, type Macros } from "@/lib/food-catalog";

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
  '{"alimentos":[{"nombre":"string","gramos":number,"confianza":number}]}. ' +
  'Reglas: usá nombres simples y en singular (ej: "arroz", "pollo", "ensalada", "pan"). ' +
  "Estimá los gramos de la porción visible. confianza entre 0 y 1. " +
  'Si el usuario da indicaciones, usalas para ajustar cantidades o aclarar alimentos. ' +
  'Si no hay comida reconocible, devolvé {"alimentos":[]}.';

interface ItemIA {
  nombre: string;
  gramos: number;
  confianza: number;
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
        .map((a) => {
          const gramos = Math.max(0, Math.round(Number(a.gramos) || 0));
          let confianza = Number(a.confianza);
          if (!Number.isFinite(confianza)) confianza = 0.5;
          if (confianza > 1) confianza = confianza / 100;
          confianza = Math.max(0, Math.min(1, confianza));

          const food = buscarAlimento(a.nombre);
          const macros: Macros | null = food ? calcularMacros(food, gramos) : null;

          return {
            nombre: a.nombre.trim(),
            nombreCatalogo: food?.nombre ?? null,
            alimentoId: food?.id ?? null,
            matched: !!food,
            gramos,
            confianza: Math.round(confianza * 100) / 100,
            macros,
          };
        });

      const totales = sumarMacros(alimentos.filter((a) => a.macros).map((a) => a.macros as Macros));

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
