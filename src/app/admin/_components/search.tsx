"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { SearchResults } from "@/lib/admin-types";
import { Avatar, TimeAgo } from "./ui";

export function GlobalSearchButton({ onOpen }: { onOpen: () => void }) {
  return (
    <button
      onClick={onOpen}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/[0.04] transition-all border border-transparent hover:border-white/[0.06] w-full"
      title="Buscar (Ctrl+K)"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <span className="text-xs">Buscar...</span>
      <kbd className="ml-auto text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/30">Ctrl K</kbd>
    </button>
  );
}

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults>({ coaches: [], students: [] });
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setResults({ coaches: [], students: [] });
    setTimeout(() => inputRef.current?.focus(), 60);
  }, [open]);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    const query = q.trim();
    if (query.length < 2) {
      setResults({ coaches: [], students: [] });
      return;
    }
    setLoading(true);
    timer.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        const data = await r.json();
        setResults(data);
      } catch {}
      setLoading(false);
    }, 250);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose();
      }
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!open) return null;

  const total = results.coaches.length + results.students.length;

  return (
    <div className="fixed inset-0 z-[95] flex items-start justify-center pt-[10vh] p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-bg-secondary border border-white/[0.08] rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
          <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar coach o alumno por nombre o email..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/30 outline-none"
          />
          {loading && <div className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />}
          <kbd className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/[0.06] border border-white/10 text-white/30">ESC</kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {q.trim().length < 2 ? (
            <p className="text-center text-xs text-white/30 py-8">Escribí al menos 2 caracteres para buscar</p>
          ) : total === 0 && !loading ? (
            <p className="text-center text-xs text-white/30 py-8">Sin resultados para "{q}"</p>
          ) : (
            <div className="space-y-4">
              {results.coaches.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-accent/70">Coaches</p>
                  <div className="space-y-0.5">
                    {results.coaches.map((c) => (
                      <Link
                        key={c.id}
                        href={`/admin/coaches/${c.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all"
                      >
                        <Avatar name={c.name} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{c.name}</p>
                          <p className="text-xs text-white/40 truncate">{c.email}</p>
                        </div>
                        <span className="text-[11px] text-white/35">{c.studentCount} alumnos</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {results.students.length > 0 && (
                <div>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400/70">Alumnos</p>
                  <div className="space-y-0.5">
                    {results.students.map((s) => (
                      <Link
                        key={s.id}
                        href={`/admin/students/${s.id}`}
                        onClick={onClose}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.05] transition-all"
                      >
                        <Avatar name={s.name} size={32} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-white truncate">{s.name}</p>
                          <p className="text-xs text-white/40 truncate">{s.email}</p>
                          {s.coachName && <p className="text-[11px] text-white/35 truncate">Coach: {s.coachName}</p>}
                        </div>
                        <TimeAgo date={s.lastActivityAt} className="text-[11px] text-white/35" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
