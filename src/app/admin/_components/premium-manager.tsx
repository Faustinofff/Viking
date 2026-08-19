"use client";
import { useState } from "react";
import { Modal, Badge, formatDate, useToast } from "./ui";
import type { AdminCoach } from "@/lib/admin-types";

export function PremiumManager({
  coach: initialCoach,
  onClose,
  onSaved,
}: {
  coach: AdminCoach;
  onClose: () => void;
  onSaved: () => Promise<AdminCoach | null>;
}) {
  const { toast } = useToast();
  const [coach, setCoach] = useState<AdminCoach>(initialCoach);
  const [daysInput, setDaysInput] = useState("");
  const [editMode, setEditMode] = useState(false);
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
        setProcessing(false);
        return;
      }
      const fresh = await onSaved();
      if (fresh) setCoach(fresh);
      toast(`Premium activado por ${daysNum} días`);
      setProcessing(false);
      onClose();
    } catch {
      setError("Error de conexión");
      setProcessing(false);
    }
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
        setProcessing(false);
        return;
      }
      const fresh = await onSaved();
      if (fresh) setCoach(fresh);
      toast("Premium desactivado");
      setProcessing(false);
      onClose();
    } catch {
      setError("Error de conexión");
      setProcessing(false);
    }
  };

  const changeDays = async () => {
    const daysNum = Number(daysInput);
    if (!Number.isInteger(daysNum) || daysNum <= 0) {
      setError("Ingresá un número válido de días");
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
        setProcessing(false);
        return;
      }
      const fresh = await onSaved();
      if (fresh) setCoach(fresh);
      toast(`Premium actualizado a ${daysNum} días`);
      setDaysInput("");
      setEditMode(false);
      setProcessing(false);
    } catch {
      setError("Error de conexión");
      setProcessing(false);
    }
  };

  const handleRemove = async () => {
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
        setProcessing(false);
        return;
      }
      const fresh = await onSaved();
      if (fresh) setCoach(fresh);
      toast("Premium eliminado");
      setProcessing(false);
      onClose();
    } catch {
      setError("Error de conexión");
      setProcessing(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Gestión Premium" maxWidth="max-w-lg">
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
          ) : coach.premium ? (
            <Badge tone="red">Vencido</Badge>
          ) : (
            <Badge tone="gray">Sin Premium</Badge>
          )}
        </div>

        {coach.premium && (
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-4 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-white/40">Plan</span>
              <span className="text-white/80">{coach.premium.planName || coach.premium.planId || "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Vencimiento</span>
              <span className="text-white/80">{formatDate(coach.premium.premiumExpiresAt)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/40">Días restantes</span>
              {isActive && coach.premiumDaysLeft !== null && coach.premiumDaysLeft >= 0 ? (
                <span className={coach.premiumDaysLeft <= 7 ? "text-yellow-400 font-semibold" : "text-white/80"}>
                  {coach.premiumDaysLeft} días
                </span>
              ) : (
                <span className="text-red-400">Vencido</span>
              )}
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Pago</span>
              <span className="text-white/80">{coach.premium.paymentStatus}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/40">Fecha de activación</span>
              <span className="text-white/80">{formatDate(coach.premium.paymentDate)}</span>
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">{error}</div>
        )}

        {coach.isFreeCoach ? (
          <p className="text-xs text-white/50 py-2">
            Este coach usa Viking de forma gratuita y no requiere Premium.
          </p>
        ) : isActive ? (
          <div className="space-y-3">
            {editMode ? (
              <div className="space-y-2">
                <p className="text-xs text-white/50">
                  Editar días de premium de <strong className="text-white">{coach.name}</strong>. Se reemplaza la fecha de vencimiento actual.
                </p>
                <div>
                  <label className="block text-xs text-white/50 mb-1.5">Nueva cantidad de días</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    value={daysInput}
                    onChange={(e) => setDaysInput(e.target.value)}
                    placeholder="Ej: 30, 90, 365"
                    className="input w-full"
                    autoFocus
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={changeDays} disabled={processing || !daysInput} className="btn-primary flex-1 disabled:opacity-50">
                    {processing ? "Guardando..." : "Guardar"}
                  </button>
                  <button onClick={() => { setEditMode(false); setDaysInput(""); setError(null); }} disabled={processing} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => setEditMode(true)} disabled={processing} className="btn-primary flex-1 disabled:opacity-50">
                  Editar días
                </button>
                <button onClick={handleRemove} disabled={processing} className="btn-danger flex-1 disabled:opacity-50">
                  {processing ? "Procesando..." : "Desactivar Premium"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-white/50">Asignar Premium a <strong className="text-white">{coach.name}</strong></p>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Cantidad de días</label>
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
            <button onClick={activate} disabled={processing || !daysInput} className="btn-primary w-full disabled:opacity-50">
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
