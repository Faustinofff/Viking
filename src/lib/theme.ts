export const PILOTO_TEMA_CLARO_EMAIL = "faustinofiordalisi@gmail.com";

export function esPilotoTemaClaro(email?: string | null) {
  if (!email) return false;
  return email.toLowerCase() === PILOTO_TEMA_CLARO_EMAIL.toLowerCase();
}
