"use client";
import { useState, useEffect } from "react";

export function usePersistState<T>(key: string, defaultValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultValue;
    try {
      const saved = sessionStorage.getItem(`page_${key}`);
      if (saved === null) return defaultValue;
      const parsed = JSON.parse(saved, (_k, v) =>
        v !== null && typeof v === "object" && v._type === "Set" ? new Set(v.values) : v
      );
      return parsed;
    } catch { return defaultValue; }
  });

  useEffect(() => {
    const serialized = JSON.stringify(state, (_k, v) =>
      v instanceof Set ? { _type: "Set", values: [...v] } : v
    );
    try { sessionStorage.setItem(`page_${key}`, serialized); } catch {}
  }, [key, state]);

  return [state, setState];
}
