"use client";
import { useState } from "react";
import Link from "next/link";

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-bg-primary flex flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <img src="/Viking.png" alt="Viking" className="w-16 h-16 md:w-28 md:h-28 object-contain" />
          <span className="text-white font-bold text-lg md:text-xl">Viking</span>
        </div>
        <div className="hidden md:flex gap-3">
          <Link href="/login" className="btn-ghost text-sm">Iniciar Sesión</Link>
          <Link href="/login" className="btn-primary text-sm">Comenzar</Link>
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-white/60 hover:text-white p-1" aria-label="Menú">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </nav>
      {menuOpen && (
        <div className="md:hidden flex flex-col items-center gap-3 px-4 pb-6 border-b border-white/[0.06] bg-bg-primary">
          <Link href="/login" className="btn-ghost text-sm w-full text-center" onClick={() => setMenuOpen(false)}>Iniciar Sesión</Link>
          <Link href="/login" className="btn-primary text-sm w-full text-center" onClick={() => setMenuOpen(false)}>Comenzar</Link>
        </div>
      )}

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-sm mb-8">
          <span>🚀</span>
          <span>Plataforma premium para coaches y alumnos</span>
        </div>
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
          Tu{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-accent/60">
            red de entrenamiento
          </span>{" "}
          inteligente
        </h1>
        <p className="text-sm sm:text-lg text-white/50 mt-6 max-w-xl leading-relaxed">
          Creá rutinas, asigná planes nutricionales, seguí el progreso de tus alumnos 
          y gestioná tu agenda desde un solo lugar.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 mt-10 w-full sm:w-auto">
          <Link href="/login" className="btn-primary text-base px-8 py-3 w-full sm:w-auto text-center">
            Acceder como Coach
          </Link>
          <Link href="/login" className="btn-secondary text-base px-8 py-3 w-full sm:w-auto text-center">
            Acceder como Alumno
          </Link>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-20 w-full">
          {[
            { icon: "📋", title: "Rutinas", desc: "Creá y asigná rutinas con ejercicios, series, repeticiones y descansos" },
            { icon: "🍽️", title: "Nutrición", desc: "Planes de comidas por día según el objetivo de cada alumno" },
            { icon: "📊", title: "Progreso", desc: "Seguí peso, agua, adherencia y logros de tus alumnos" },
          ].map((f) => (
            <div key={f.title} className="card text-left">
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-white/40">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
