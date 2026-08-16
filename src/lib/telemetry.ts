"use client";
import { getAuthHeaders } from "./admin-client";
import type { ActivityType, AdminEventMeta } from "./admin-types";

let lastLoginSentAt = 0;

export async function trackActivity(type: ActivityType, message: string, meta?: AdminEventMeta) {
  try {
    const headers = await getAuthHeaders();
    if (!headers.Authorization) return;
    if (type === "login") {
      const now = Date.now();
      if (now - lastLoginSentAt < 10000) return;
      lastLoginSentAt = now;
    }
    await fetch("/api/telemetry", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify({ type, message, meta }),
      keepalive: true,
    });
  } catch {}
}

export function trackLogin() {
  trackActivity("login", "Inició sesión");
}
