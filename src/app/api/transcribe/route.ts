import { NextRequest, NextResponse } from "next/server";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const TRANSCRIBE_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    if (!GROQ_API_KEY) {
      return NextResponse.json({ error: "GROQ_API_KEY no configurada." }, { status: 500 });
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ error: "No se recibió audio." }, { status: 400 });
    }

    const models = ["whisper-large-v3-turbo", "whisper-large-v3"];
    let lastStatus = 502;

    for (const model of models) {
      const gfd = new FormData();
      gfd.append("file", file as Blob, "audio.webm");
      gfd.append("model", model);
      gfd.append("language", "es");
      gfd.append("temperature", "0");

      try {
        const res = await fetch(TRANSCRIBE_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
          body: gfd,
        });

        if (res.ok) {
          const data = await res.json();
          const text = (data?.text ?? "").trim();
          return NextResponse.json({ text });
        }

        lastStatus = res.status;
        console.error("[Groq transcribe error]", res.status, model, await res.text());
      } catch (e) {
        console.error("[Groq transcribe fetch error]", model, e);
      }
    }

    return NextResponse.json({ error: "No se pudo transcribir el audio." }, { status: lastStatus });
  } catch (err: any) {
    console.error("transcribe error:", err);
    return NextResponse.json({ error: err?.message || "Error interno" }, { status: 500 });
  }
}