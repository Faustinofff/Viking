"use client";
import { useState } from "react";

const SECCIONES = [
  {
    id: "agregar-alumnos",
    titulo: "Cómo agregar a mis alumnos?",
    pasos: [
      "Andá a la sección de Alumnos y presioná 'Agregar'.",
      "Seleccioná o creá la red de entrenamiento del alumno (ej: 'Alumnos de Sportclub').",
      "Presioná '+ Nuevo Alumno'.",
      "Completá los datos del alumno y agregalo usando el mail con el que se registró en Viking.",
      "Importante: Tu alumno debe iniciar sesión en Viking primero. El mail que usó para acceder es el que tenés que poner para agregarlo.",
    ],
  },
  {
    id: "crear-rutinas",
    titulo: "Cómo crear rutinas?",
    pasos: [
      "Andá a Rutinas en el menú lateral.",
      "Presioná '+ Nueva Rutina' (arriba a la derecha).",
      "Escribí el nombre de la rutina (ej: 'Push Pull Piernas').",
      "Elegí Alumnos: tildá los que van a tener esta rutina. Si querés guardarla sin asignar todavía, marcá 'No asignar por ahora'.",
      "En 'Días de la semana', presioná '+ Agregar Día' (máximo 7). Para cada día: seleccioná el día de la semana y poné un nombre (ej: 'Día de Pecho').",
      "Dentro de cada día, presioná '+ Agregar ejercicio'. Buscá por nombre o filtrá por grupo muscular. Tocá el '+' del ejercicio. Ajustá series × reps, descanso (segundos) y URL de video (opcional). Podés cambiar valores por semana.",
      "(Opcional) Presioná '+ Agregar indicaciones semanales' para escribir notas distintas cada semana.",
      "Presioná 'Asignar Rutina' (o 'Guardar (sin asignar)' si marcaste 'No asignar por ahora').",
    ],
  },
  {
    id: "asignar-rutinas",
    titulo: "Cómo asignar rutinas ya guardadas?",
    pasos: [
      "Andá a Rutinas en el menú lateral.",
      "Buscá la rutina que tiene el botón 'Asignar'.",
      "Presioná 'Asignar' y elegí el alumno de la lista.",
      "La rutina se asigna al instante.",
    ],
  },
  {
    id: "asignar-rutinas-reutilizar",
    titulo: "Cómo asignar una rutina que ya está asignada a otro alumno?",
    pasos: [
      "Andá a Rutinas en el menú lateral.",
      "Buscá la rutina que querés reutilizar y presioná el botón 'Editar' (lápiz).",
      "En el panel de edición, buscá la sección 'Alumnos' y tildá el nuevo alumno al que querés asignársela.",
      "También podés destildar alumnos si ya no deberían tenerla.",
      "Presioná 'Guardar Cambios' al final del formulario. La rutina se actualiza para todos los alumnos seleccionados al instante.",
    ],
  },
  {
    id: "crear-planes",
    titulo: "Cómo crear planes nutricionales?",
    pasos: [
      "Andá a Nutrición en el menú lateral.",
      "Presioná '+ Nuevo Plan' (arriba a la derecha).",
      "Escribí el nombre del plan (ej: 'Volumen 3500 kcal').",
      "Elegí Alumnos o marcá 'No asignar por ahora'.",
      "En 'Grupos de días', presioná '+ Agregar Grupo'. Tocá los días de la semana que comparten las mismas comidas (ej: Lun, Mié, Vie).",
      "Dentro del grupo, presioná '+ Agregar comida'. Seleccioná tipo (Desayuno, Almuerzo, Cena, etc.), escribí el nombre del plato y los alimentos separados por coma.",
      "(Opcional) Agregá instrucciones de preparación.",
      "Presioná 'Asignar Plan' (o 'Guardar (sin asignar)').",
    ],
  },
  {
    id: "asignar-planes",
    titulo: "Cómo asignar planes ya guardados?",
    pasos: [
      "Andá a Nutrición en el menú lateral.",
      "Buscá el plan que tiene el botón 'Asignar'.",
      "Presioná 'Asignar' y elegí el alumno de la lista.",
      "El plan se asigna al instante.",
    ],
  },
  {
    id: "crear-red",
    titulo: "Cómo crear una red de entrenamiento?",
    pasos: [
      "Andá a Alumnos en el menú lateral.",
      "Presioná '+ Agregar' (arriba a la derecha) o andá directo a Redes en el menú.",
      "Presioná '+ Nueva Red'.",
      "Escribí el nombre de la red (ej: 'Sportclub', 'Alumnos Online').",
      "Elegí el tipo: Presencial u Online.",
      "Presioná 'Crear Red'.",
      "Dentro de la red, presioná '+ Nuevo Alumno' para agregar alumnos nuevos.",
      "También podés usar '+ Agregar Existente' si el alumno ya está registrado en otra red.",
    ],
  },
  {
    id: "crear-ejercicios",
    titulo: "Cómo crear nuevos ejercicios?",
    pasos: [
      "Andá a Ejercicios en el menú lateral.",
      "Presioná '+ Nuevo Ejercicio' (arriba a la derecha).",
      "Completá: Nombre (ej: 'Press inclinado con mancuernas'), Grupo muscular y Equipo.",
      "Presioná 'Crear'.",
      "El ejercicio aparece en 'Tus Ejercicios' y ya se puede usar al crear rutinas.",
    ],
  },
  {
    id: "agenda",
    titulo: "Cómo agendar sesiones en la agenda?",
    pasos: [
      "Andá a Agenda en el menú lateral.",
      "Usá las flechas < > para ir al mes que quieras.",
      "Tocá un día en el calendario (se marca con borde).",
      "En el panel lateral derecho, presioná '+ Agendar sesión'.",
      "Completá: Fecha, Hora, Grupo Muscular, Título y seleccioná los Alumnos tocándolos.",
      "(Opcional) Marcá 'Repetir todos los días' si querés la misma sesión toda la semana.",
      "Presioná 'Crear Sesión'.",
    ],
  },
];

export default function AyudaPage() {
  const [abierta, setAbierta] = useState<string | null>(null);

  const toggle = (id: string) => setAbierta(abierta === id ? null : id);

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">Ayuda</h1>
        <p className="text-white/40 text-sm mt-1">Guía rápida para usar Viking</p>
      </div>

      <div className="space-y-3">
        {SECCIONES.map((sec) => {
          const isOpen = abierta === sec.id;
          return (
            <div key={sec.id} className="card !p-0 overflow-hidden">
              <button
                onClick={() => toggle(sec.id)}
                className="w-full flex items-center justify-between px-5 py-4 text-left text-white font-semibold hover:bg-white/[0.02] transition-colors"
              >
                <span>{sec.titulo}</span>
                <svg
                  className={`w-4 h-4 text-white/30 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
              {isOpen && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <ol className="list-decimal list-inside space-y-2 mt-4 text-sm text-white/70 leading-relaxed">
                    {sec.pasos.map((paso, i) => (
                      <li key={i}>{paso}</li>
                    ))}
                  </ol>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
