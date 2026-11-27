/**
 * Texto del link de acceso que se comparte con los alumnos.
 *
 * Se muestra como texto y se copia dentro del mensaje: no debe ser un enlace
 * cliqueable dentro de la app, porque en la PWA abre el sitio y rompe la
 * experiencia del coach. El dominio correcto es el que indica el equipo.
 */
export const VIKING_ACCESS_TEXT = "www.viking-fit.com/login";

export const STUDENT_INVITATION_MESSAGE =
  `¡Hola! Te invito a registrarte en mi nueva app para que recibas allí tu planificación 👇\n\n${VIKING_ACCESS_TEXT}\n\n1° Presiona “Continuar como alumno”.\n2° Regístrate con tu Gmail.`;
