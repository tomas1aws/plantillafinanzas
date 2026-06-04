# Plantilla Finanzas

Aplicación web para administrar finanzas personales y compartidas. Está pensada para desplegarse en Vercel con Supabase Auth, Supabase Postgres y Row Level Security.

## Stack

- Next.js App Router + TypeScript
- Tailwind CSS y componentes estilo shadcn/ui
- Supabase Auth, SSR helpers y Postgres con RLS
- Recharts para gráficos del dashboard
- React Hook Form + Zod para formularios y validaciones

## Estructura

```txt
app/                     Rutas públicas, auth y dashboard privado
components/              Componentes reutilizables y formularios
components/ui/           Primitivas UI estilo shadcn/ui
lib/                     Acciones de servidor, data access y utilidades
lib/supabase/            Clientes Supabase browser/server y middleware
types/                   Tipos TypeScript del dominio
supabase/migrations/     Migraciones versionadas de Supabase
supabase/seed/           Datos semilla opcionales
```

## Configuración local

1. Instalar dependencias:

```bash
npm install
```

2. Crear variables de entorno:

```bash
cp .env.example .env.local
```

3. Completar `.env.local` con valores del proyecto Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

4. Aplicar migraciones:

```bash
supabase db push
```

Si usás un proyecto remoto, vinculalo antes con:

```bash
supabase link --project-ref <project-ref>
```

5. Correr la app:

```bash
npm run dev
```

Abrí `http://localhost:3000`.

## Supabase

La migración `supabase/migrations/202606030001_initial_schema.sql` crea:

- Workspaces personales y compartidos.
- Membresías con roles `owner`, `admin` y `member`.
- Invitaciones por email.
- Cuentas, categorías, movimientos y objetivos de ahorro.
- Triggers para crear el workspace personal automático al registrarse.
- Triggers para cuentas/categorías default por workspace.
- Triggers para aplicar movimientos al saldo actual de cuentas.
- Policies RLS para que cada usuario solo vea y modifique datos de workspaces donde participa.

## Datos semilla opcionales

El archivo `supabase/seed/demo_data.sql` incluye una guía mínima para sembrar defaults de un workspace de prueba. La app ya crea defaults automáticamente al crear usuarios o workspaces.

## Deploy en Vercel

1. Importar el repositorio en Vercel.
2. Configurar variables de entorno:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. En Supabase, agregar los dominios de Vercel en Authentication > URL Configuration:
   - Site URL: `https://tu-app.vercel.app`
   - Redirect URLs: `https://tu-app.vercel.app/**`
4. Ejecutar las migraciones en Supabase antes del primer deploy productivo.
5. Deployar desde Vercel.

## Funcionalidades incluidas

- Registro, login, logout y protección de rutas privadas.
- Dashboard con métricas mensuales, saldos, gráficos y movimientos recientes.
- Workspaces personales y compartidos.
- Invitaciones por email con control por rol.
- CRUD base de cuentas, categorías, movimientos y objetivos.
- Arquitectura preparada para presupuestos, tarjetas, cuotas, inversiones, CSV y notificaciones.

## Comandos útiles

```bash
npm run dev
npm run build
npm run typecheck
```

## Invitaciones y envío de email

Las invitaciones siempre se guardan en `workspace_invitations` y generan un link copiable con el formato `${NEXT_PUBLIC_SITE_URL}/invite/<token>`. El flujo funciona sin proveedor de email: la UI muestra el link para compartir manualmente y nunca revierte la creación por un error de envío.

Para enviar emails automáticamente se puede configurar [Resend](https://resend.com/):

```env
NEXT_PUBLIC_SITE_URL=https://plantillafinanzas.vercel.app
RESEND_API_KEY=re_...
INVITATION_EMAIL_FROM=Finanzas <invitaciones@tu-dominio.com>
```

`INVITATION_EMAIL_FROM` debe usar un dominio verificado en Resend. Si faltan estas variables o el proveedor responde con error, la invitación permanece pendiente y se muestra el modo “copiar link”. También asegurate de agregar `${NEXT_PUBLIC_SITE_URL}/**` en los Redirect URLs de Supabase Auth para que registro/login puedan volver a `/invite/<token>`.

La migración `supabase/migrations/202606040009_shared_workspace_invitations.sql` agrega tokens únicos, datos de aceptación/revocación y funciones SQL protegidas para crear, aceptar, revocar y administrar invitaciones y miembros.
