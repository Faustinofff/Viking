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

      <footer className="border-t border-white/[0.06] py-6 md:py-8 px-4 md:px-8">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/Viking.png" alt="Viking" className="w-8 h-8 object-contain opacity-40" />
            <span className="text-white/20 text-sm">Viking Fit © {new Date().getFullYear()}</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="https://instagram.com/viking.app" target="_blank" rel="noopener noreferrer" className="text-white/30 hover:text-accent text-sm transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
              @viking.app
            </a>
            <a href="mailto:fitviking8@gmail.com" className="text-white/30 hover:text-accent text-sm transition-colors flex items-center gap-1.5">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>
              fitviking8@gmail.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
