# Guía de Implementación: Supabase + Google OAuth

## 1. Crear proyecto en Supabase

1. Andá a https://supabase.com → "Start your project"
2. Creá un proyecto nuevo (nombre: `viking`)
3. Guardá las credenciales de `Project Settings > API`:
   - `Project URL` → `EXPO_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `EXPO_PUBLIC_SUPABASE_ANON_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## 2. SQL Schema

Andá a `SQL Editor` y ejecutá el contenido de `docs/database-schema.sql` (está en el proyecto).

## 3. Google OAuth

1. En Supabase: `Authentication > Providers > Google` → Habilitar
2. Crear proyecto en https://console.cloud.google.com
3. `APIs & Services > Credentials > Create OAuth client ID`
4. Tipo: "Web application"
5. Orígenes: `http://localhost:3000`
6. Redirect URIs: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
7. Copiar `Client ID` y `Client Secret` en Supabase

## 4. Configurar variables de entorno

### packages/web/.env.local
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

### packages/mobile/.env
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

## 5. Código de autenticación real

Reemplazar `store.ts` con conexión a Supabase real.

### packages/web/src/lib/supabase.ts
```typescript
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

### packages/web/src/lib/auth.ts — Funciones de autenticación

```typescript
import { supabase } from "./supabase";

export async function signUp(email: string, password: string, name: string, rol: "coach" | "alumno") {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  if (data.user) {
    await supabase.from("profiles").insert({
      id: data.user.id,
      email,
      display_name: name,
      role: rol,
      onboarded: true,
    });
  }
  return data;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({ provider: "google" });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return profile;
}
```

## 6. Sincronizar Coach-Alumno por Email

Cuando el coach registra un alumno con su email, la app debe verificar si ese email ya tiene una cuenta. Si no, se crea un "pre-registro" y cuando el alumno se registre con ese email, se vincula automáticamente.

### packages/web/src/lib/coachService.ts
```typescript
import { supabase } from "./supabase";

export async function addStudent(coachId: string, data: {
  nombre: string;
  email: string;
  edad: number;
  peso: number;
  objetivo: string;
  plan: string;
  redId: string;
}) {
  // Buscar si el usuario ya existe por email
  const { data: existingProfile } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", data.email)
    .single();

  let studentId: string;

  if (existingProfile) {
    studentId = existingProfile.id;
  } else {
    // Crear un alumno "invitado" (sin auth)
    const { data: newAlumno } = await supabase
      .from("alumnos_invitados")
      .insert({ email: data.email, nombre: data.nombre })
      .select()
      .single();
    studentId = newAlumno.id;
  }

  // Crear el perfil del alumno
  await supabase.from("alumnos").insert({
    id: studentId,
    coach_id: coachId,
    red_id: data.redId,
    nombre: data.nombre,
    email: data.email,
    edad: data.edad,
    peso: data.peso,
    objetivo: data.objetivo,
    plan: data.plan,
  });

  return studentId;
}
```

## 7. Reemplazar Zustand persistente con Supabase

Estrategia:

1. **Fase 1 (ahora)**: Zustand en memoria — funciona, todo es local
2. **Fase 2**: Agregar Supabase Auth para login real con Google
3. **Fase 3**: Migrar datos a Supabase (rutinas, planes, progreso)
4. **Fase 4**: Quitar Zustand, usar React Query + Supabase como fuente de verdad

### Ejemplo: Cargar rutinas desde Supabase

```typescript
import { supabase } from "./supabase";

export async function loadStudentRoutines(studentId: string) {
  const { data, error } = await supabase
    .from("workout_plans")
    .select(`
      *,
      workout_days (
        *,
        workout_exercises (
          *,
          exercises (*)
        )
      )
    `)
    .eq("student_id", studentId)
    .eq("is_template", false);

  if (error) throw error;
  return data;
}
```

## 8. Flujo completo real

1. Coach se registra con Google → Supabase crea `profiles` con rol `coach`
2. Coach agrega alumno con email `alumno@email.com`
3. Sistema verifica si `alumno@email.com` existe en `profiles`
   - Si existe: lo vincula directamente
   - Si no: crea registro pendiente en `alumnos_invitados`
4. Alumno se registra con `alumno@email.com` (Google o email)
5. Al hacer login, el sistema busca:
   - `alumnos` donde su email coincida
   - Si encuentra, carga automáticamente sus rutinas, planes, etc.
6. Coach asigna rutina → se guarda en `workout_plans` con `student_id`
7. Alumno ve la rutina al instante

## 9. Package.json — Dependencias reales

Agregar al `packages/web/package.json`:
```json
"@supabase/supabase-js": "^2.39.0",
"@supabase/ssr": "^0.3.0"
```

Para Next.js con SSR:
```typescript
// src/lib/supabase.ts (versión SSR para Next.js)
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (name) => cookieStore.get(name)?.value } }
  );
}
```
