"use client";
import { useState, useEffect, useRef, ReactNode } from "react";
import Link from "next/link";

function FadeIn({ children, delay = 0, className = "" }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? "translateY(0)" : "translateY(24px)", transition: `opacity 0.7s ease-out, transform 0.7s ease-out`, transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

function LaptopFrame({ src, alt, onClick }: { src: string; alt: string; onClick?: () => void }) {
  return (
    <div className="relative mx-auto w-full max-w-3xl cursor-pointer" onClick={onClick}>
      <div className="relative rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.1] bg-bg-secondary shadow-2xl shadow-black/60 transition-transform duration-300 hover:scale-[1.01]">
        <div className="h-7 sm:h-9 bg-zinc-900/80 flex items-center gap-1.5 px-4 border-b border-white/[0.06]">
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500/60" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-yellow-500/60" />
          <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-green-500/60" />
        </div>
        <img src={src} alt={alt} className="w-full h-auto block" loading="lazy" />
      </div>
    </div>
  );
}

function PhoneFrame({ src, alt, large = false, onClick }: { src: string; alt: string; large?: boolean; onClick?: () => void }) {
  return (
    <div className={`relative mx-auto cursor-pointer ${large ? "max-w-[320px] sm:max-w-[380px]" : "max-w-[260px] sm:max-w-[300px]"}`} onClick={onClick}>
      <div className="rounded-[2rem] sm:rounded-[2.5rem] border-2 border-white/[0.1] bg-black shadow-2xl shadow-black/50 transition-transform duration-300 hover:scale-[1.01]">
        <div className="p-2 sm:p-3">
          <img src={src} alt={alt} className="w-full h-auto block rounded-lg" loading="lazy" />
        </div>
      </div>
    </div>
  );
}

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", handler); document.body.style.overflow = ""; };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 animate-fade-in"
      onClick={(e) => { if (e.target === ref.current) onClose(); }}
    >
      <div className="relative max-w-[95vw] max-h-[95vh] flex items-center justify-center">
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white/40 hover:text-white text-3xl p-2 transition-colors z-10"
          aria-label="Cerrar"
        >
          ✕
        </button>
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[85vh] w-auto h-auto object-contain rounded-xl shadow-2xl"
          style={{ animation: "fade-in 0.25s ease-out" }}
        />
      </div>
    </div>
  );
}

const coachShots = [
  { src: "/images/landing/coach-dashboard.webp", title: "Panel de control", desc: "Todo tu negocio en un vistazo: actividad, alumnos, redes y progreso en tiempo real." },
  { src: "/images/landing/coach-students.webp", title: "Gestión de alumnos", desc: "Administrá pagos, estados y perfiles. Cada alumno con su plan personalizado." },
  { src: "/images/landing/coach-routine-builder.webp", title: "Creador de rutinas", desc: "Armá entrenamientos con ejercicios, series, repeticiones y descansos en segundos." },
  { src: "/images/landing/coach-nutrition-builder.webp", title: "Plan nutricional", desc: "Diseñá planes de comidas por día ajustados al objetivo de cada alumno." },
  { src: "/images/landing/coach-networks.webp", title: "Redes de entrenamiento", desc: "Organizá alumnos presenciales y online en grupos. Todo desde un mismo lugar." },
  { src: "/images/landing/coach-ai.webp", title: "Asistente IA", desc: "Ideas de ejercicios, planificación y respuestas al instante. Tu copiloto personal." },
];

const studentShots = [
  { src: "/images/landing/student-home.webp", title: "Inicio del alumno", desc: "Rutina de hoy, nutrición, peso, agua y progreso semanal en una sola pantalla." },
  { src: "/images/landing/student-workouts.webp", title: "Entrenos diarios", desc: "Cada día con su entrenamiento listo. Solo abrí y empezá." },
  { src: "/images/landing/student-session.webp", title: "Sesión de entrenamiento", desc: "Ejercicio guiado con video, timer de descanso automático, tutorial y notas del coach.", large: true },
  { src: "/images/landing/student-nutrition.webp", title: "Nutrición diaria", desc: "El plan de comidas del día siempre disponible. Sabé qué comer en cada momento." },
  { src: "/images/landing/student-progress.webp", title: "Progreso automático", desc: "Peso, agua y entrenos completados. Cada actualización se refleja al instante en el coach." },
  { src: "/images/landing/student-ai.webp", title: "Asistente IA", desc: "Consultá dudas de entrenamiento, ejercicios o nutrición. Respuestas al instante." },
];

const traditional = ["Excel / PDF", "WhatsApp", "Rutinas perdidas", "Seguimiento manual", "Sin app para alumnos", "Escribí uno por uno"];
const viking = ["Plataforma profesional", "App guiada para alumnos", "Todo organizado por alumno", "Progreso automático", "Experiencia premium", "Comunicación en un clic"];

const benefits = [
  { icon: "🚀", title: "Más imagen profesional", desc: "Dale a tus alumnos una plataforma premium que eleva tu servicio por encima de la competencia." },
  { icon: "⭐", title: "Mejor experiencia para el alumno", desc: "Entrenamientos guiados, videos, temporizador y plan nutricional en una app que les encanta usar." },
  { icon: "⚡", title: "Menos trabajo administrativo", desc: "Olvidate de Excel, PDFs y cadenas de WhatsApp. Todo sincronizado y automático." },
  { icon: "🎯", title: "Más tiempo para entrenar", desc: "Automatizá lo repetitivo y dedicale más tiempo a lo que importa: entrenar a tus alumnos." },
];

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const pricingRef = useRef<HTMLElement>(null);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* ─── HERO ─── */}
      <section className="relative min-h-screen flex flex-col">
        <div className="absolute inset-0">
          <img
            src="/images/landing/hero-desktop.webp"
            alt=""
            className="hidden sm:block w-full h-full object-cover"
          />
          <img
            src="/images/landing/hero-mobile.webp"
            alt=""
            className="sm:hidden w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-bg-primary/60 via-bg-primary/20 to-bg-primary/60" />
        </div>
        <nav className="relative z-10 flex items-center justify-between px-4 md:px-8 py-3 md:py-5 max-w-6xl mx-auto w-full">
          <Link href="/" className="flex items-center gap-2.5">
            <img src="/Viking.png" alt="Viking" className="w-10 h-10 md:w-12 md:h-12 object-contain" />
            <span className="text-white font-bold text-lg md:text-xl tracking-tight">Viking</span>
          </Link>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-white/70 hover:text-white text-sm transition-colors">Iniciar Sesión</Link>
            <Link href="/login" className="btn-primary text-sm">Comenzar</Link>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white/60 hover:text-white p-1" aria-label="Menú">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
        </nav>
        {menuOpen && (
          <div className="relative z-10 md:hidden flex flex-col items-center gap-3 px-4 pb-6 border-b border-white/[0.06] bg-bg-primary">
            <Link href="/login" className="text-white/70 hover:text-white text-sm w-full text-center py-2" onClick={() => setMenuOpen(false)}>Iniciar Sesión</Link>
            <Link href="/login" className="btn-primary text-sm w-full text-center" onClick={() => setMenuOpen(false)}>Comenzar</Link>
          </div>
        )}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-2xl mx-auto">
          <FadeIn>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 backdrop-blur-sm border border-accent/20 text-accent text-sm mb-6">
              <span>🚀</span>
              <span>Plataforma premium para coaches</span>
            </div>
          </FadeIn>
          <FadeIn delay={100}>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold text-white leading-[1.05] tracking-tight">
              Tu negocio de
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent via-accent/80 to-accent/60">
                entrenamiento
              </span>
              <br />
              en un solo lugar
            </h1>
          </FadeIn>
          <FadeIn delay={200}>
            <p className="text-base sm:text-lg text-white/60 mt-5 max-w-lg leading-relaxed">
              Gestioná alumnos, rutinas, planes nutricionales, progreso y agenda 
              desde una única plataforma profesional.
            </p>
          </FadeIn>
          <FadeIn delay={300}>
            <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto">
              <Link href="/login" className="btn-primary text-base px-7 py-3 w-full sm:w-auto text-center shadow-glow hover:shadow-glow-strong transition-shadow">
                Acceder como Coach
              </Link>
              <Link href="/login" className="btn-secondary text-base px-7 py-3 w-full sm:w-auto text-center bg-white/[0.08] backdrop-blur-sm hover:bg-white/[0.12] border-white/[0.15]">
                Acceder como Alumno
              </Link>
            </div>
          </FadeIn>
          <FadeIn delay={400}>
            <div className="flex items-center justify-center gap-2 mt-5 text-sm text-white/40">
              <span>Probalo gratis hasta 3 alumnos</span>
              <span className="text-white/20">•</span>
              <button onClick={() => pricingRef.current?.scrollIntoView({ behavior: "smooth" })} className="text-accent hover:text-accent/80 transition-colors cursor-pointer underline underline-offset-2">
                Desde $14.999/mes
              </button>
            </div>
          </FadeIn>
          <FadeIn delay={500}>
            <div className="flex items-center gap-4 sm:gap-6 mt-6 text-white/40 text-xs">
              <span className="flex items-center gap-1.5">✓ Rutinas</span>
              <span className="flex items-center gap-1.5">✓ Nutrición</span>
              <span className="flex items-center gap-1.5">✓ Progreso</span>
              <span className="flex items-center gap-1.5">✓ Agenda</span>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── SECTION 2: COACH SHOWCASE ─── */}
      <section className="py-24 sm:py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16 sm:mb-24">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Todo tu negocio en un solo lugar.
            </h2>
            <p className="text-base sm:text-lg text-white/50 mt-4 max-w-2xl mx-auto">
              Gestioná alumnos, rutinas, alimentación, seguimiento y planificación desde una única plataforma.
            </p>
          </FadeIn>

          <div className="space-y-20 sm:space-y-28">
            {coachShots.map((shot, i) => (
              <div key={shot.title} className={`flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8 lg:gap-16`}>
                <FadeIn delay={100} className="w-full lg:w-[55%]">
                  <LaptopFrame src={shot.src} alt={shot.title} onClick={() => setLightbox({ src: shot.src, alt: shot.title })} />
                </FadeIn>
                <FadeIn delay={200} className="w-full lg:w-[45%] text-center lg:text-left">
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{shot.title}</h3>
                  <p className="text-base sm:text-lg text-white/50 leading-relaxed">{shot.desc}</p>
                </FadeIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 3: STUDENT EXPERIENCE ─── */}
      <section className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16 sm:mb-24">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Tus alumnos ya no reciben una rutina.
            </h2>
            <p className="text-3xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60 mt-2">
              Reciben una experiencia de entrenamiento.
            </p>
          </FadeIn>

          <div className="space-y-20 sm:space-y-28">
            {studentShots.map((shot, i) => (
              <div key={shot.title} className={`flex flex-col ${i % 2 === 0 ? "lg:flex-row" : "lg:flex-row-reverse"} items-center gap-8 lg:gap-16 ${shot.large ? "lg:gap-20" : ""}`}>
                <FadeIn delay={100} className={`w-full ${shot.large ? "lg:w-[60%]" : "lg:w-[50%]"} flex justify-center`}>
                  <PhoneFrame src={shot.src} alt={shot.title} large={shot.large} onClick={() => setLightbox({ src: shot.src, alt: shot.title })} />
                </FadeIn>
                <FadeIn delay={200} className={`w-full ${shot.large ? "lg:w-[40%]" : "lg:w-[50%]"} text-center lg:text-left`}>
                  <h3 className="text-2xl sm:text-3xl font-bold text-white mb-3">{shot.title}</h3>
                  <p className="text-base sm:text-lg text-white/50 leading-relaxed">{shot.desc}</p>
                </FadeIn>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 4: COMPARISON ─── */}
      <section className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Coaching tradicional vs. Viking
            </h2>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="grid grid-cols-2 gap-0 rounded-2xl overflow-hidden border border-white/[0.06]">
              <div className="p-6 sm:p-8 bg-white/[0.02]">
                <h3 className="text-lg sm:text-xl font-bold text-white/30 mb-6">Coaching Tradicional</h3>
                <ul className="space-y-4">
                  {traditional.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm sm:text-base text-white/40">
                      <span className="text-red-400/60 mt-0.5 shrink-0">✕</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-6 sm:p-8 bg-accent/[0.03] border-l border-white/[0.06]">
                <h3 className="text-lg sm:text-xl font-bold text-accent mb-6">Viking</h3>
                <ul className="space-y-4">
                  {viking.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm sm:text-base text-white">
                      <span className="text-accent mt-0.5 shrink-0">✓</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ─── SECTION 7: PRICING ─── */}
      <section id="precios" ref={pricingRef} className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Planes para tu negocio
            </h2>
            <p className="text-base sm:text-lg text-white/50 mt-4 max-w-2xl mx-auto">
              Elegí el plan que mejor se adapte a tu ritmo de trabajo
            </p>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { name: "Prueba", price: "1.000", desc: "Acceso premium completo por 24 horas", period: "", badge: null, popular: false, bestValue: false, features: ["Alumnos ilimitados", "Acceso premium completo", "Todas las funciones incluidas", "Sin límite de contenido"], cta: "Activar Prueba" },
              { name: "Mensual", price: "14.999", desc: "Flexibilidad mes a mes", period: "/mes", badge: null, popular: false, bestValue: false, features: ["Alumnos ilimitados", "Rutinas + nutrición", "Progreso automático", "Agenda integrada", "Asistente IA"], cta: "Elegir Mensual" },
              { name: "Trimestral", price: "24.999", desc: "Ahorrá 44% vs. el plan mensual", period: "/mes", badge: "Más popular", popular: true, bestValue: false, features: ["Todo el plan Mensual", "Descuento por trimestre", "Soporte prioritario", "Reportes avanzados"], cta: "Elegir Trimestral" },
              { name: "Semestral", price: "44.999", desc: "Ahorrá 50% vs. el plan mensual", period: "/mes", badge: null, popular: false, bestValue: false, features: ["Todo el plan Trimestral", "Descuento por semestre", "Soporte premium", "Exportación de datos"], cta: "Elegir Semestral" },
              { name: "Anual", price: "79.999", desc: "Ahorrá 55% vs. el plan mensual", period: "/mes", badge: "Mejor valor", popular: false, bestValue: true, features: ["Todo el plan Semestral", "Máximo descuento", "Soporte VIP 24/7", "Features beta anticipadas"], cta: "Elegir Anual" },
            ].map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 80}>
                <div className={`relative flex flex-col rounded-2xl border p-5 transition-all duration-300 hover:scale-[1.02] ${
                  plan.popular
                    ? "border-accent bg-accent/[0.04]"
                    : plan.bestValue
                    ? "border-accent/40 bg-white/[0.04]"
                    : "border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.05]"
                }`}>
                  {plan.badge && (
                    <div className={`absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                      plan.popular
                        ? "bg-accent text-bg-primary"
                        : "bg-accent/20 text-accent border border-accent/30"
                    }`}>
                      {plan.badge}
                    </div>
                  )}
                  <div className="mb-4">
                    <h3 className="text-base font-bold text-white">{plan.name}</h3>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed">{plan.desc}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-sm text-white/40">$</span>
                    <span className="text-2xl font-extrabold text-white">{plan.price}</span>
                    <span className="text-xs text-white/40">{plan.period}</span>
                  </div>
                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-xs text-white/60">
                        <span className="text-accent mt-0.5 shrink-0">✓</span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/login"
                    className={`w-full text-center text-sm font-semibold py-2.5 rounded-xl transition-all ${
                      plan.popular
                        ? "bg-accent text-bg-primary hover:bg-accent/90"
                        : "bg-white/[0.08] text-white hover:bg-white/[0.12] border border-white/[0.1]"
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={200} className="mt-16 text-center">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-white/40 text-sm">Pagos 100% seguros mediante</span>
              <span className="text-white font-semibold text-sm">Mercado Pago</span>
            </div>
            <p className="text-xs text-white/30 max-w-md mx-auto">
              Podés pagar con tarjetas de crédito, débito y todos los medios de pago disponibles en Mercado Pago.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ─── SECTION 5: BENEFITS ─── */}
      <section className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <FadeIn className="text-center mb-16">
            <h2 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
              Por qué elegir Viking
            </h2>
          </FadeIn>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {benefits.map((b, i) => (
              <FadeIn key={b.title} delay={i * 100}>
                <div className="card h-full hover:bg-white/[0.06] transition-all duration-300">
                  <div className="text-2xl sm:text-3xl mb-4">{b.icon}</div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{b.title}</h3>
                  <p className="text-sm sm:text-base text-white/50 leading-relaxed">{b.desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SECTION 6: CTA ─── */}
      <section className="py-24 sm:py-32 px-6 border-t border-white/[0.04]">
        <FadeIn className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight mb-4">
            Empezá gratis.
          </h2>
          <p className="text-lg sm:text-xl text-white/50 mb-10">
            Probá Viking gratis hasta 3 alumnos.
          </p>
          <Link href="/login" className="btn-primary text-base sm:text-lg px-10 py-4 inline-block">
            Comenzar ahora
          </Link>
        </FadeIn>
      </section>

      {/* ─── LIGHTBOX ─── */}
      {lightbox && <ImageLightbox src={lightbox.src} alt={lightbox.alt} onClose={() => setLightbox(null)} />}

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-white/[0.06] py-8 md:py-10 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/Viking.png" alt="Viking" className="w-6 h-6 object-contain opacity-30" />
            <span className="text-white/20 text-xs">Viking Fit © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://instagram.com/viking.app" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-accent text-xs sm:text-sm transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              @viking.app
            </a>
            <a href="mailto:fitviking8@gmail.com" className="text-white/30 hover:text-accent text-xs sm:text-sm transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              fitviking8@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
