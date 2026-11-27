"use client";
import { useState, useCallback, useRef, useEffect } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface ToastOptions {
  title?: string;
  description?: string;
  details?: string[];
  duration?: number;
}

interface ToastState {
  message: string;
  type: ToastType;
  options?: ToastOptions;
}

interface ConfirmState {
  message: string;
  resolve: (v: boolean) => void;
}

const TOAST_STYLES: Record<ToastType, string> = {
  success: "border-accent/25 bg-[#0d1b18]/95 text-white",
  error: "border-red-500/30 bg-red-950/95 text-red-100",
  warning: "border-amber-500/30 bg-amber-950/95 text-amber-100",
  info: "border-sky-500/30 bg-sky-950/95 text-sky-100",
};

const TOAST_ICONS: Record<ToastType, typeof CircleCheck> = {
  success: CircleCheck,
  error: CircleAlert,
  warning: TriangleAlert,
  info: Info,
};

export function useConfirmToast() {
  const [toastMsg, setToastMsg] = useState<ToastState | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const clearToastTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = undefined;
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success", options?: ToastOptions) => {
    clearToastTimer();
    setToastMsg({ message, type, options });
    timerRef.current = setTimeout(() => setToastMsg(null), options?.duration ?? (options?.title ? 5200 : 3000));
  }, [clearToastTimer]);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  useEffect(() => clearToastTimer, [clearToastTimer]);

  const ToastUI = (
    <>
      {toastMsg && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-6 right-6 z-[120] animate-toast-in max-w-[calc(100vw-2rem)]"
        >
          <div className={`flex items-start gap-3 rounded-2xl border px-4 py-3.5 shadow-2xl backdrop-blur-xl ${TOAST_STYLES[toastMsg.type]}`}>
            {(() => {
              const Icon = TOAST_ICONS[toastMsg.type];
              return (
                <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                  toastMsg.type === "success" ? "bg-accent/15 text-accent animate-check-pop" :
                  toastMsg.type === "error" ? "bg-red-500/15 text-red-300" :
                  toastMsg.type === "warning" ? "bg-amber-500/15 text-amber-300" :
                  "bg-sky-500/15 text-sky-300"
                }`}>
                  <Icon className="h-4 w-4" strokeWidth={2.2} />
                </span>
              );
            })()}
            <div className="min-w-0 flex-1">
              {toastMsg.options?.title ? (
                <>
                  <p className="text-sm font-semibold text-white leading-snug">{toastMsg.options.title}</p>
                  <p className="text-xs text-white/60 mt-0.5 leading-relaxed">{toastMsg.message}</p>
                  {toastMsg.options.description && (
                    <p className="text-xs text-white/45 mt-1 leading-relaxed">{toastMsg.options.description}</p>
                  )}
                </>
              ) : (
                <p className="text-sm font-medium leading-relaxed">{toastMsg.message}</p>
              )}
              {toastMsg.options?.details && toastMsg.options.details.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {toastMsg.options.details.map((detail, i) => (
                    <span key={i} className="rounded-md border border-white/[0.08] bg-white/[0.05] px-2 py-0.5 text-[11px] text-white/65">
                      {detail}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => { clearToastTimer(); setToastMsg(null); }}
              aria-label="Cerrar notificación"
              className="-mr-1 -mt-1 rounded-lg p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      {confirmState && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Confirmar acción"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { confirmState.resolve(false); setConfirmState(null); }}
        >
          <div className="card max-w-sm w-full mx-4 p-6 animate-fade-in" onClick={(e) => e.stopPropagation()}>
            <p className="text-white font-medium mb-6 leading-relaxed">{confirmState.message}</p>
            <div className="flex gap-2">
              <button onClick={() => { confirmState.resolve(false); setConfirmState(null); }} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => { confirmState.resolve(true); setConfirmState(null); }} className="btn-primary flex-1">Aceptar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return { toast, confirm, ToastUI };
}
