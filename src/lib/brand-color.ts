/**
 * Detecta si un color es blanco puro (hex de 3/6/8 dígitos, rgb/rgba o "white").
 * Se usa para que el nombre de marca configurado en blanco se muestre en negro
 * sobre el tema claro (donde el blanco sería invisible).
 */
export function esColorBlanco(color?: string | null): boolean {
  if (!color) return false;
  const c = color.trim().toLowerCase();

  if (c === "white" || c === "#fff" || c === "#ffffff") return true;

  const rgb = c.match(/^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})/);
  if (rgb) {
    return Number(rgb[1]) === 255 && Number(rgb[2]) === 255 && Number(rgb[3]) === 255;
  }

  const hex = c.match(/^#([0-9a-f]{6})(?:[0-9a-f]{2})?$/);
  if (hex) return hex[1] === "ffffff";

  return false;
}
