"use client";
import { useEffect, useState, useMemo } from "react";
import { getAuthHeaders } from "@/lib/admin-client";

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  role: string;
  created_at: string;
  premium?: {
    planId: string;
    premiumExpiresAt: string;
    planName: string;
  } | null;
}

type Tab = "coaches" | "students";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("coaches");
  const [search, setSearch] = useState("");
  const [confirmModal, setConfirmModal] = useState<{ user: UserRow; action: "activate" | "deactivate" } | null>(null);
  const [processing, setProcessing] = useState(false);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const headers = await getAuthHeaders();
      const r = await fetch("/api/admin/users", { headers });
      const data = await r.json();
      setUsers(data.users ?? []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { loadUsers(); }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (tab === "coaches" && u.role !== "coach") return false;
      if (tab === "students" && u.role !== "student") return false;
      if (q && !u.email.toLowerCase().includes(q) && !u.display_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, tab, search]);

  const handleTogglePremium = async (user: UserRow, action: "activate" | "deactivate") => {
    setProcessing(true);
    try {
      const headers = await getAuthHeaders();
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...headers },
        body: JSON.stringify({ userId: user.id, action }),
      });
      loadUsers();
    } catch {}
    setProcessing(false);
    setConfirmModal(null);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white">Usuarios</h1>

      <div className="flex gap-2 border-b border-white/[0.06] pb-2">
        {(["coaches", "students"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-accent/10 text-accent border border-accent/20" : "text-white/40 hover:text-white/60"
            }`}>
            {t === "coaches" ? "Coaches" : "Alumnos"}
          </button>
        ))}
      </div>

      <input
        type="text"
        placeholder="Buscar por nombre o email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="input w-full"
      />

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12 text-white/40 text-sm">
          No se encontraron {tab === "coaches" ? "coaches" : "alumnos"}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((u) => {
            const isPremium = u.premium && new Date(u.premium.premiumExpiresAt) > new Date();
            return (
              <div key={u.id} className="card flex flex-col md:flex-row md:items-center gap-3 p-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-accent/20 flex items-center justify-center text-sm font-medium text-accent flex-shrink-0">
                    {u.display_name?.[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{u.display_name}</p>
                    <p className="text-xs text-white/40 truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    u.role === "coach" ? "bg-accent/20 text-accent" : "bg-blue-500/20 text-blue-400"
                  }`}>
                    {u.role === "coach" ? "Coach" : "Alumno"}
                  </span>
                  {isPremium ? (
                    <>
                      <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                      <span className="text-[10px] text-white/30">
                        vence {new Date(u.premium!.premiumExpiresAt).toLocaleDateString("es-AR")}
                      </span>
                      <button
                        onClick={() => setConfirmModal({ user: u, action: "deactivate" })}
                        className="text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full hover:bg-red-500/20 transition-all"
                      >
                        Desactivar
                      </button>
                    </>
                  ) : u.role === "coach" ? (
                    <button
                      onClick={() => setConfirmModal({ user: u, action: "activate" })}
                      className="text-[10px] font-bold bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-500/20 transition-all"
                    >
                      Activar Premium
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {confirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => !processing && setConfirmModal(null)} />
          <div className="relative card max-w-sm w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">
              {confirmModal.action === "activate" ? "Activar Premium" : "Desactivar Premium"}
            </h3>
            <p className="text-sm text-white/60">
              {confirmModal.action === "activate"
                ? `¿Activar premium para ${confirmModal.user.display_name}? Se creará un plan anual de 365 días.`
                : `¿Desactivar premium para ${confirmModal.user.display_name}? Perderá acceso a funciones premium.`}
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmModal(null)} disabled={processing}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-all">
                Cancelar
              </button>
              <button onClick={() => handleTogglePremium(confirmModal.user, confirmModal.action)} disabled={processing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  confirmModal.action === "activate"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                } ${processing ? "opacity-50" : ""}`}>
                {processing ? "Procesando..." : confirmModal.action === "activate" ? "Activar" : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
