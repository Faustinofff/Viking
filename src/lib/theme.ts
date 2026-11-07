export const PILOTO_TEMA_CLARO_EMAILS = [
  "faustinofiordalisi@gmail.com",
  "faustinofiordalisi5@gmail.com",
];

export function esPilotoTemaClaro(email?: string | null) {
  if (!email) return false;
  return PILOTO_TEMA_CLARO_EMAILS.includes(email.toLowerCase());
}
