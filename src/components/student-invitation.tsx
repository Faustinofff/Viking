"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CircleCheck, Copy, Link2 } from "lucide-react";
import { STUDENT_INVITATION_MESSAGE, VIKING_ACCESS_TEXT } from "@/lib/viking-links";

type CopyState = "idle" | "copied" | "error";

async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Algunos navegadores móviles niegan el permiso; probamos el fallback.
    }
  }
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const ok = document.execCommand("copy");
    document.body.removeChild(textarea);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Invitación permanente para alumnos que todavía no se registraron.
 * Se usa desde Alumnos y desde el onboarding del coach.
 */
export function StudentInvitation({ onBack }: { onBack?: () => void }) {
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleCopy = async () => {
    const ok = await copyToClipboard(STUDENT_INVITATION_MESSAGE);
    if (!ok) {
      setCopyState("error");
      requestAnimationFrame(() => {
        textRef.current?.focus();
        textRef.current?.select();
      });
      return;
    }
    setCopyState("copied");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopyState("idle"), 2600);
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 id="viking-students-title" className="text-lg font-bold text-white">Invitar a un alumno</h2>
        <p className="text-sm text-white/50 mt-1 leading-relaxed">
          Copiá el mensaje y compartilo con tus alumnos para que creen su cuenta en Viking.
        </p>
      </div>

      <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
        <p className="label mb-2">Link de acceso</p>
        <p className="inline-flex max-w-full items-center gap-2 break-all font-medium text-accent">
          <Link2 className="h-3.5 w-3.5 shrink-0" />
          {VIKING_ACCESS_TEXT}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
          Es solo para copiar y pegar: dentro de la app no se abre como enlace.
        </p>
      </div>

      <div>
        <p className="label mb-2">Mensaje listo para compartir</p>
        <textarea
          ref={textRef}
          readOnly
          rows={7}
          value={STUDENT_INVITATION_MESSAGE}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Mensaje de invitación para copiar"
          className="input !text-[13px] !leading-relaxed resize-none w-full"
        />
        <p className="text-[11px] text-white/30 mt-1.5">
          Podés seleccionar el texto y copiarlo manualmente si lo preferís.
        </p>
      </div>

      <div aria-live="polite" className="min-h-[20px]">
        {copyState === "error" && (
          <p className="text-xs text-amber-300 leading-relaxed">
            No pudimos acceder al portapapeles. El texto quedó seleccionado: copialo con tu navegador.
          </p>
        )}
        {copyState === "copied" && (
          <p className="text-xs text-accent flex items-center gap-1.5">
            <CircleCheck className="w-3.5 h-3.5" /> Mensaje copiado. Ya podés pegarlo en tu chat.
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={`btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2 ${copyState === "copied" ? "!bg-accent/90" : ""}`}
        >
          {copyState === "copied" ? <CircleCheck className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copyState === "copied" ? "¡Invitación copiada!" : "Copiar invitación"}
        </button>
        {onBack && (
          <button type="button" onClick={onBack} className="btn-secondary w-full sm:w-auto inline-flex items-center justify-center gap-2">
            <ArrowLeft className="w-4 h-4" /> Volver
          </button>
        )}
      </div>
    </div>
  );
}
