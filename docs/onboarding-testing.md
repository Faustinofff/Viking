# Onboarding de entrenadores: estado y testing

## Dónde vive el estado

El onboarding es exclusivo de coaches y se persiste **por usuario** dentro del blob JSON que Viking ya usa en `profiles.avatar_url`, bajo la clave `coachOnboarding`. No se crearon tablas ni columnas nuevas.

Estados posibles:

- `not_started`: el coach nunca vio la bienvenida.
- `in_progress`: la guía se inició y se interrumpió; se conserva el paso y las acciones reales ya detectadas.
- `completed`: el coach terminó u omitió la etapa opcional de alumnos.
- `dismissed`: el coach eligió «Explorar por mi cuenta» o cerró la bienvenida.

Comportamiento importante:

- Los **coaches nuevos** reciben `not_started` al crearse su perfil (`createProfile`).
- Los **coaches preexistentes** no tienen la clave y se consideran `completed`: su experiencia no cambia.
- Un coach que interrumpe la guía **no la ve automáticamente** al volver a entrar; puede retomarla desde la checklist discreta del Dashboard.
- La checklist desaparece al completar o descartar la guía.

## Habilitar la prueba en una cuenta existente (mecanismo controlado)

Esto no está hardcoded en el código de producción. Para volver a probar el recorrido en una cuenta real, actualizá **solo** la clave `coachOnboarding` del blob de ese perfil, preservando todas las demás claves.

Ejemplo con el CLI de Supabase o el SQL editor (reemplazá el email):

```sql
-- Revisá primero el blob; no lo reemplaces completo.
SELECT id, email, avatar_url
FROM public.profiles
WHERE email = 'faustinofiordalisi@gmail.com';
```

Si `avatar_url` ya es un JSON (empieza con `{`), agregá/actualizá únicamente la clave:

```sql
UPDATE public.profiles
SET avatar_url = jsonb_set(
  avatar_url::jsonb,
  '{coachOnboarding}',
  '{"status":"not_started","phase":"tour","step":0,"completedSteps":[],"firstRoutineCreated":false,"studentsHandled":false,"checklistHidden":false}'::jsonb,
  true
)::text
WHERE email = 'faustinofiordalisi@gmail.com'
  AND avatar_url LIKE '{%%';
```

Si `avatar_url` fuera una URL de imagen en lugar de JSON, conservala en `_url`:

```sql
UPDATE public.profiles
SET avatar_url = json_build_object(
  '_url', avatar_url,
  'coachOnboarding', json_build_object(
    'status', 'not_started',
    'phase', 'tour',
    'step', 0,
    'completedSteps', '[]'::json,
    'firstRoutineCreated', false,
    'studentsHandled', false,
    'checklistHidden', false
  )
)::text
WHERE email = 'faustinofiordalisi@gmail.com'
  AND avatar_url NOT LIKE '{%%}';
```

No ejecutar ambas sentencias: cada una cubre un caso distinto. Ninguna toca rutinas, alumnos, pagos, branding ni otros usuarios.

Una vez completado o descartado el recorrido, el estado vuelve a comportarse normalmente. Repetir esta operación es el único modo explícito de volver a habilitar la prueba.
