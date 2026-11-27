/**
 * URL pública y estable de acceso/registro de Viking.
 *
 * El flujo real de registro es `/login` (elegir rol → Google → /auth/onboarding).
 * La base por defecto es el dominio desplegado que ya usa la aplicación como
 * fallback en las rutas de pagos (`https://viking-web-beta.vercel.app`).
 * No usamos `window.location.origin`: en local o en un preview generaría
 * invitaciones con una URL que no corresponde a la app publicada.
 *
 * Si en el futuro se configura un dominio propio, basta con definir
 * `NEXT_PUBLIC_VIKING_APP_URL` en el entorno de despliegue.
 */
const configuredBase = (process.env.NEXT_PUBLIC_VIKING_APP_URL ?? "").trim().replace(/\/+$/, "");
const baseUrl = configuredBase || "https://viking-web-beta.vercel.app";

export const VIKING_ACCESS_URL = baseUrl.endsWith("/login") ? baseUrl : `${baseUrl}/login`;

export const STUDENT_INVITATION_MESSAGE = `¡Hola! Estoy utilizando Viking para organizar y hacer seguimiento de tus entrenamientos.

Necesito que crees tu cuenta desde este link para poder agregarte a mi lista de alumnos y asignarte tus rutinas:

${VIKING_ACCESS_URL}

Una vez que te registres, ya voy a poder incorporarte a la plataforma y gestionar tus entrenamientos por ahí.`;
