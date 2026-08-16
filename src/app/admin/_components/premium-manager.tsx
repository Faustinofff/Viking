"use client";
import { useState } from "react";
import { Modal, Badge } from "./ui";
import type { AdminCoach } from "@/lib/admin-types";
import { formatDate } from "./ui";

export function PremiumManager({
  coach,
  onClose,
  onSaved,
}: {
  coach: AdminCoach;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [daysInput, setDaysInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = coach.isPremiumActive && !coach.isFreeCoach;

  const activate = async () => {
    const daysNum = Number(daysInput);
    if (!Number.isInteger(daysNum) || daysNum <= 0) {
      setError("Ingresá una cantidad de días mayor a 0");
      return;
    }
    setProcessing(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: coach.id, action: "activate", days: daysNum }),
      });
      const data = await r.json();
      if (data.error) {
        setError(data.error);
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError("Error al activar premium");
    }
    setProcessing(false);
  };

  const deactivate = async () => {
    setProcessing(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: coach.id, action: "deactivate" }),
      });
      const data = await r.json();
      if (data.error) {
        setError(data.error);
      } else {
        onSaved();
        onClose();
      }
    } catch {
      setError("Error al desactivar premium");
    }
    setProcessing(false);
  };

  return (
    <Modal open onClose={onClose} title="Gestión Premium">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white truncate">{coach.name}</p>
            <p className="text-xs text-white/40 truncate">{coach.email}</p>
          </div>
          {coach.isFreeCoach ? (
            <Badge tone="purple">Gratuito</Badge>
          ) : isActive ? (
            <Badge tone="yellow">Premium activo</Badge>
          ) : (
            <Badge tone="gray">Sin Premium</Badge>
          )}
        </div>

        {coach.premium && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-white/40">Plan</span>
              <span className="text-white/80">{coach.premium.planName || coach.premium.planId || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Vencimiento</span>
              <span className="text-white/80">{formatDate(coach.premium.premiumExpiresAt)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Días restantes</span>
              <span className={coach.premiumDaysLeft !== null && coach.premiumDaysLeft <= 7 ? "text-yellow-400" : "text-white/80"}>
                {coach.premiumDaysLeft !== null && coach.premiumDaysLeft >= 0 ? `${coach.premiumDaysLeft} días` : "Vencido"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Activación</span>
              <span className="text-white/80">{formatDate(coach.premium.paymentDate)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{error}</div>
        )}

        {coach.isFreeCoach ? (
          <p className="text-xs text-white/50">
            Este coach usa Viking de forma gratuita y no requiere Premium.
          </p>
        ) : isActive ? (
          <div className="flex gap-2">
            <button
              onClick={deactivate}
              disabled={processing}
              className="btn-danger flex-1 disabled:opacity-50"
            >
              {processing ? "Procesando..." : "Desactivar Premium"}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Cantidad de días de Premium</label>
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
            </div>
            <button
              onClick={activate}
              disabled={processing || !daysInput}
              className="btn-primary w-full disabled:opacity-50"
            >
              {processing ? "Procesando..." : "Activar Premium"}
            </button>
          </div>
        )}

        <button onClick={onClose} disabled={processing} className="btn-ghost w-full text-center">
          Cerrar
        </button>
      </div>
    </Modal>
  );
}
