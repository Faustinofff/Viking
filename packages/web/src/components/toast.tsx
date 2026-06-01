"use client";
import { useState, useCallback, useRef } from "react";

type ToastType = "success" | "error" | "info";

interface ConfirmState {
  message: string;
  resolve: (v: boolean) => void;
}

export function useConfirmToast() {
  const [toastMsg, setToastMsg] = useState<{ message: string; type: ToastType } | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const toast = useCallback((message: string, type: ToastType = "success") => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToastMsg({ message, type });
    timerRef.current = setTimeout(() => setToastMsg(null), 3000);
  }, []);

  const confirm = useCallback((message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({ message, resolve });
    });
  }, []);

  const ToastUI = (
    <>
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[100] animate-fade-in">
          <div className={"px-5 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 backdrop-blur-xl " + (
            toastMsg.type === "error" ? "bg-red-900/80 border-red-500/30 text-red-200" :
            toastMsg.type === "info" ? "bg-blue-900/80 border-blue-500/30 text-blue-200" :
            "bg-green-900/80 border-green-500/30 text-green-200"
          )}>
            <span className="text-base">{toastMsg.type === "error" ? "✕" : toastMsg.type === "info" ? "i" : "v"}</span>
            {toastMsg.message}
          </div>
        </div>
      )}
      {confirmState && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { confirmState.resolve(false); setConfirmState(null); }}>
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
