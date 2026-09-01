"use client";
import { useEffect, useState, useMemo } from "react";
import { useConfirmToast } from "@/components/toast";

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
  isFreeCoach?: boolean;
}

type Tab = "coaches" | "students";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("coaches");
  const [search, setSearch] = useState("");
  const [confirmModal, setConfirmModal] = useState<{ user: UserRow; action: "activate" | "deactivate" } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [daysInput, setDaysInput] = useState<string>("");
  const { toast, ToastUI } = useConfirmToast();

  const loadUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/admin/users?ts=${Date.now()}`, { cache: "no-store" });
      const data = await r.json();
      if (data.error) {
        setError(data.error);
        setUsers([]);
      } else {
        setUsers(data.users ?? []);
      }
    } catch (e: any) {
      setError(e?.message ?? "Error de conexión");
      setUsers([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadUsers();
    const id = setInterval(loadUsers, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const onVisible = () => {
      if (!document.hidden) loadUsers();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      if (tab === "coaches" && u.role !== "coach") return false;
      if (tab === "students" && u.role !== "student") return false;
      if (q && !u.email.toLowerCase().includes(q) && !u.display_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, tab, search]);

  const handleActivate = async (user: UserRow) => {
    const daysNum = Number(daysInput);
    if (!Number.isInteger(daysNum) || daysNum <= 0) {
      toast("Ingresá una cantidad de días mayor a 0", "error");
      return;
    }
    setProcessing(true);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "activate", days: daysNum }),
      });
      const data = await r.json();
      if (data.error) {
        toast(data.error, "error");
      } else if (data.expiresAt) {
        const fecha = new Date(data.expiresAt).toLocaleDateString("es-AR");
        toast(`Premium activado correctamente hasta ${fecha}`);
      }
      loadUsers();
    } catch {
      toast("Error al activar premium", "error");
    }
    setProcessing(false);
    setConfirmModal(null);
  };

  const handleDeactivate = async (user: UserRow) => {
    setProcessing(true);
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action: "deactivate" }),
      });
      toast("Premium desactivado");
      loadUsers();
    } catch {
      toast("Error al desactivar premium", "error");
    }
    setProcessing(false);
    setConfirmModal(null);
  };

  const handleConfirm = async () => {
    if (!confirmModal) return;
    if (confirmModal.action === "activate") {
      await handleActivate(confirmModal.user);
    } else {
      await handleDeactivate(confirmModal.user);
    }
  };

  const openActivateModal = (user: UserRow) => {
    setDaysInput("");
    setConfirmModal({ user, action: "activate" });
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <h1 className="text-xl font-bold text-white">Usuarios</h1>

      {error && (
        <div className="card bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex gap-2 border-b border-white/[0.06] pb-2">
        {(["coaches", "students"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === t ? "bg-accent/10 text-accent border border-accent/20" : "text-white/40 hover:text-white/60"
            }`}>
            {t === "coaches" ? `Coaches (${users.filter(u => u.role === "coach").length})` : `Alumnos (${users.filter(u => u.role === "student").length})`}
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
                  {u.isFreeCoach ? (
                    <span className="text-[10px] font-bold bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">
                      Gratuito
                    </span>
                  ) : isPremium ? (
                    <>
                      <span className="text-[10px] font-bold bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">
                        Premium
                      </span>
                      <span className="text-[10px] text-white/30">
                        vence {new Date(u.premium!.premiumExpiresAt).toLocaleDateString("es-AR")}
                      </span>
                    </>
                  ) : null}
                  {!u.isFreeCoach && (
                    isPremium ? (
                      <button
                        onClick={() => setConfirmModal({ user: u, action: "deactivate" })}
                        className="text-[10px] font-bold bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full hover:bg-red-500/20 transition-all"
                      >
                        Desactivar
                      </button>
                    ) : u.role === "coach" ? (
                      <button
                        onClick={() => openActivateModal(u)}
                        className="text-[10px] font-bold bg-green-500/10 text-green-400 px-2 py-0.5 rounded-full hover:bg-green-500/20 transition-all"
                      >
                        Activar Premium
                      </button>
                    ) : null
                  )}
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
            <div className="space-y-1">
              <p className="text-sm font-medium text-white">{confirmModal.user.display_name}</p>
              <p className="text-xs text-white/40 break-all">{confirmModal.user.email}</p>
            </div>
            {confirmModal.action === "activate" ? (
              <div>
                <label className="block text-xs text-white/50 mb-1.5">
                  Cantidad de días de Premium
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  value={daysInput}
                  onChange={(e) => setDaysInput(e.target.value)}
                  placeholder="Ej: 30, 90, 365"
                  className="input w-full"
                />
                {daysInput && Number(daysInput) > 0 && (
                  <p className="text-xs text-white/40 mt-2">
                    ¿Activar Premium a {confirmModal.user.email} por {daysInput} días?
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-white/60">
                ¿Desactivar premium para {confirmModal.user.display_name}? Perderá acceso a funciones premium.
              </p>
            )}
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmModal(null)} disabled={processing}
                className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-all">
                Cancelar
              </button>
              <button onClick={() => handleConfirm()} disabled={processing}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  confirmModal.action === "activate"
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : "bg-red-500 text-white hover:bg-red-600"
                } ${processing ? "opacity-50" : ""}`}>
                {processing ? "Procesando..." : confirmModal.action === "activate" ? "Activar Premium" : "Desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
      {ToastUI}
    </div>
  );
}
