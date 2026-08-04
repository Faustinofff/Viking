"use client";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAppStore } from "@/lib/store";



type Message = { role: "user" | "assistant"; content: string };

const STUDENT_SUGGESTIONS = [
  "¿Qué ejercicios son mejores para pecho?",
  "¿Cuánta proteína debo consumir al día?",
  "¿Cómo mejorar mi técnica en sentadilla?",
  "¿Qué comer después de entrenar?",
];

const COACH_SUGGESTIONS = [
  "¿Qué ejercicios de espalda puedo incluir en una rutina?",
  "¿Cómo estructurar una semana de entrenamiento full body?",
  "¿Qué métricas debería registrar de mis alumnos?",
  "¿Cómo ajustar cargas para un principiante?",
];

const STUDENT_WELCOME = "¡Hola! Soy tu asistente de fitness. Preguntame lo que quieras sobre entrenamiento, nutrición o ejercicios.";
const COACH_WELCOME = "¡Hola! Soy tu asistente de coaching. Preguntame sobre ejercicios, programación de rutinas o planificación para tus alumnos.";

export default function ChatDialog({ collapsed, mobile, header }: { collapsed?: boolean; mobile?: boolean; header?: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialized, setInitialized] = useState(false);

  const usuario = useAppStore((s) => s.usuarioActual);
  const alumnos = useAppStore((s) => s.alumnos);
  const coaches = useAppStore((s) => s.coaches);

  const isCoach = usuario?.rol === "coach";
  const suggestions = isCoach ? COACH_SUGGESTIONS : STUDENT_SUGGESTIONS;
  const welcome = isCoach ? COACH_WELCOME : STUDENT_WELCOME;

  useEffect(() => {
    if (!initialized) {
      setMessages([{ role: "assistant", content: welcome }]);
      setInitialized(true);
    }
  }, [welcome, initialized]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const alumno = alumnos.find((a) => a.email === usuario?.email);
  let coach = alumno?.coachId ? coaches[alumno.coachId] : null;
  if (!coach) {
    const all = Object.values(coaches);
    if (all.length === 1) coach = all[0] as any;
    else if (all.length > 1 && alumno?.coachId) {
      const match = all.find((c: any) => c.id === alumno.coachId);
      if (match) coach = match as any;
    }
  }

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  // Prevent body scroll when chat is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
    } else {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    }
    return () => {
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, [open]);

  const ask = async (q: string) => {
    if (!q.trim() || loading) return;
    const userMsg: Message = { role: "user", content: q };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: [...messages, userMsg] }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Error ${res.status}`);
      }
      const data = await res.json();
      setMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${err.message}` }]);
    }
    setLoading(false);
  };

  return (
    <>
      {header ? (
        <button onClick={() => setOpen(true)} className="flex items-center justify-center rounded-lg hover:bg-white/[0.06] transition-all p-0.5" title="Asistente IA">
          <img src="/vikingIA.png" alt="IA" className="w-8 h-8 object-contain" />
        </button>
      ) : mobile ? (
        <button onClick={() => setOpen(true)} className="relative flex flex-col items-center gap-1 px-3.5 py-1.5 rounded-full transition-transform duration-200 active:scale-90">
          <span className="relative flex items-center justify-center w-12 h-8 rounded-full transition-all duration-300">
            <img src="/vikingIA.png" alt="IA" className="w-5 h-5 object-contain" />
          </span>
          <span className="text-[10px] font-semibold text-white/30">IA</span>
        </button>
      ) : (
        <>
        <style>{`@property --a{syntax:'<angle>';initial-value:0deg;inherits:false}@property --b{syntax:'<angle>';initial-value:0deg;inherits:false}@keyframes r{to{--a:360deg}}@keyframes g{to{--b:360deg}}.aw{position:relative}.aw::before{content:'';position:absolute;inset:0;border-radius:inherit;padding:2px;background:conic-gradient(from var(--a),#06b6d4,#3b82f6,#06b6d4);-webkit-mask:linear-gradient(#fff 0 0) content-box,linear-gradient(#fff 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;animation:r 7s linear infinite}.ag{background:conic-gradient(from var(--b),rgba(6,182,212,0.25),rgba(59,130,246,0.15),rgba(6,182,212,0.25));animation:g 10s linear infinite}`}</style>
        <div className="rounded-xl aw">
          <div className="absolute -inset-3 rounded-2xl ag blur-xl -z-10" />
          <div className="rounded-[10px] bg-bg-secondary">
            <button onClick={() => setOpen(true)} className="w-full flex items-center gap-3 px-3 py-2 rounded-[10px] transition-all text-white/50 hover:text-white/80 hover:bg-white/[0.04]">
              <img src="/vikingIA.png" alt="IA" className="max-w-12 max-h-12 w-auto h-auto object-contain flex-shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Asistente IA</span>}
            </button>
          </div>
        </div>
        </>
      )}

      {open && typeof window === "object" && createPortal(
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <div className="relative flex flex-col w-full max-w-[420px] mx-auto h-full bg-bg-primary sm:max-h-[600px] sm:mt-8 sm:border sm:border-white/[0.08] sm:rounded-2xl shadow-2xl">
            <div className="flex items-center gap-3 px-4 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top,10px))] border-b border-white/[0.06]">
              <button onClick={() => setOpen(false)} className="flex items-center justify-center w-8 h-8 rounded-xl text-white/40 hover:text-white hover:bg-white/[0.06] transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15 19l-7-7 7-7"/></svg>
              </button>
              <img src="/vikingIA.png" alt="IA" className="w-10 h-10 object-contain flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-white">Asistente Viking</p>
                <p className="text-[10px] text-white/30">Groq IA</p>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => {
                const isLastAssistant = m.role === "assistant" && i === messages.length - 1 && i > 0 && !loading;
                return (
                  <div key={i}>
                    <div className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} items-end gap-2`}>
                      {m.role === "assistant" && (
                        <img src="/vikingIA.png" alt="IA" className="max-w-8 max-h-8 w-auto h-auto object-contain flex-shrink-0" />
                      )}
                      <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                        m.role === "user"
                          ? "bg-accent/20 text-white border border-accent/20"
                          : "bg-white/[0.04] text-white/80 border border-white/[0.06]"
                      }`}>
                        {m.content}
                      </div>
                    </div>
                    {isLastAssistant && !isCoach && coach && coach.telefono && (
                      <div className="flex mt-1.5 mb-1 ml-10">
                        <a href={`https://wa.me/${coach.telefono.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Hola " + coach.nombre + ", quería consultarte sobre algo de mi entrenamiento")}`}
                          target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20 transition-all">
                          <span>💬</span> Preguntale a {coach.nombre}
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white/[0.04] rounded-2xl px-4 py-2.5 text-sm text-white/40 border border-white/[0.06]">
                    <span className="inline-block animate-pulse">Escribiendo...</span>
                  </div>
                </div>
              )}

              {messages.length === 1 && (
                <div>
                  <p className="text-[10px] text-white/20 uppercase tracking-wider mb-2">Sugerencias</p>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.06] text-white/50 hover:text-white/80 hover:border-accent/30 transition-all">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="sticky bottom-0 p-4 border-t border-white/[0.06] bg-bg-primary" style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))" }}>
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  placeholder="Escribí tu consulta..."
                  style={{ fontSize: "16px" }}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); document.getElementById("chat-send-btn")?.click(); } }}
                  autoFocus
                />
                <button id="chat-send-btn" disabled={loading || !input.trim()} className="btn-primary text-sm !px-4" onClick={() => ask(input)}>
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
