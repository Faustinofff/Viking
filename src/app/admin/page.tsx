"use client";
import { useEffect, useState } from "react";

interface Stats {
  totalCoaches: number;
  totalStudents: number;
  premiumCoaches: number;
  gratuitoCoaches: number;
  freeCoaches: number;
  totalUsers: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((data) => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-6">
        <div className="card text-center p-8">
          <p className="text-white/60">Error al cargar estadísticas</p>
        </div>
      </div>
    );
  }

  const cards = [
    { label: "Total Usuarios", value: stats.totalUsers, color: "text-white" },
    { label: "Coaches", value: stats.totalCoaches, color: "text-accent" },
    { label: "Alumnos", value: stats.totalStudents, color: "text-blue-400" },
    { label: "Premium", value: stats.premiumCoaches, color: "text-yellow-400" },
    { label: "Gratuito", value: stats.gratuitoCoaches, color: "text-purple-400" },
    { label: "Free", value: stats.freeCoaches, color: "text-green-400" },
  ];

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold text-white">Dashboard</h1>
        <span className="text-[10px] font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">Admin</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="card text-center p-4">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-white/40 mt-1">{c.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
