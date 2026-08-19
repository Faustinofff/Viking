import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const OFF_TOPIC_MSG = "Solo puedo ayudarte con temas de fitness, entrenamiento, nutrición y salud. Hacé una consulta sobre esos temas y te respondo al toque 💪";

const TOPIC_KEYWORDS = [
  "ejercicio", "entren", "rutina", "gym", "pesa", "cardio", "fuerza", "muscul",
  "pecho", "brazo", "pierna", "espalda", "hombro", "abdomen", "gluteo", "cuadricep",
  "biceps", "triceps", "femoral", "gemelo", "trapecio", "dorsal",
  "proteina", "caloria", "dieta", "comid", "nutriente", "vitamina", "suplemento",
  "desayuno", "almuerzo", "cena", "merienda", "comer", "alimento",
  "salud", "dolor", "lesion", "recuperacion", "estiramiento", "calentamiento",
  "adelgazar", "bajar de peso", "subir de peso", "volumen", "definicion", "perder grasa",
  "peso", "masa muscular", "porcentaje grasa",
  "yoga", "pilates", "crossfit", "running", "correr", "natacion", "bicicleta",
  "remedio", "medicina", "doctor", "medico", "fisioterapia", "masaje",
  "agua", "hidratacion", "sueno", "descanso", "estres", "ansiedad",
  "flexibilidad", "postura", "respiracion", "meditacion",
  "como", "que", "cual", "cuando", "donde", "por que", "para que",
  "recomend", "consejo", "ayuda", "tip", "truco", "mejor", "hidrat",
];

const NORM_KEYWORDS = TOPIC_KEYWORDS.map((kw) =>
  kw.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
);

function isFitnessRelated(text: string): boolean {
  const lower = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return NORM_KEYWORDS.some((kw) => lower.includes(kw));
}

export async function POST(req: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY no configurada. Agregala en .env.local" }, { status: 500 });
    }
    const { messages }: { messages: { role: string; content: string }[] } = await req.json();

    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg && !isFitnessRelated(lastUserMsg.content)) {
      return NextResponse.json({ content: OFF_TOPIC_MSG });
    }

    const systemMsg = {
      role: "system",
      content: "Sos un asistente de fitness. Respondé SOLO sobre entrenamiento, nutrición, ejercicios y salud. Respuestas cortas, directas, al grano. Máximo 3 oraciones. Sin rodeos. Sin introducciones. Sin despedidas. Respondé como un coach hablando con un alumno.",
    };

    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b",
        messages: [systemMsg, ...messages],
        temperature: 0.5,
        max_tokens: 200,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("[Groq error]", res.status, errBody);
      return NextResponse.json({ error: errBody.slice(0, 500) }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ content: data.choices[0].message.content });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
