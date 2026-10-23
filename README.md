# Gestión del trabajo

Base del MVP de gestión de proyectos, actividades, horas y documentos. La [planificación](docs/planificacion-mvp.md) define las fases; esta versión cubre la preparación del repositorio (Fase 0). Aún no ofrece autenticación ni datos de negocio.

## Requisitos

- Node.js 20.9 o superior y npm.
- Docker Engine con Docker Compose para PostgreSQL local.

## Puesta en marcha local

1. Clonar el repositorio y entrar en su raíz.
2. Copiar `.env.example` a `.env` (`Copy-Item .env.example .env` en PowerShell, o `cp .env.example .env` en Linux). Cambiar `POSTGRES_PASSWORD` y el mismo valor dentro de `DATABASE_URL`. Si la contraseña contiene caracteres especiales de URL, codificarlos en `DATABASE_URL`.
3. Ejecutar `npm ci`.
4. Ejecutar `docker compose up -d postgres` y esperar el estado `healthy` (`docker compose ps`). PostgreSQL escucha solo en `127.0.0.1:5433` del equipo local.
5. Ejecutar `npm run db:migrate` y `npm run db:check`.
6. Ejecutar `npm run dev` y abrir <http://localhost:3000>.

En otro terminal, `npm run lint`, `npm run typecheck` y `npm run build` verifican el código. `npm run start` sirve el build de producción.

Los comandos `dev` y `build` usan Webpack: con la versión actual de Next.js, Turbopack falló al lanzar el procesador de Tailwind en este entorno Windows; el build con Webpack sí se verificó.

## Base de datos y migraciones

El esquema fuente está en `src/db/schema.ts`; `drizzle/` contiene migraciones SQL versionadas. Tras cambiar el esquema, ejecutar `npm run db:generate`, revisar el SQL generado y confirmar tanto esquema como migración en Git. Aplicar con `npm run db:migrate` primero en desarrollo, después en un entorno de prueba y finalmente en producción con una copia de seguridad previa. Las migraciones aplicadas se registran en la propia base.

No hay un comando de reversión automática: antes de desplegar una migración, preparar un SQL inverso revisado o un plan de restauración probado. Para cambios destructivos, usar migraciones en varios pasos (añadir, trasladar datos y retirar) y conservar una copia externa de PostgreSQL. `docker compose down` detiene los contenedores sin eliminar el volumen; no usar `down -v` sobre datos que se deban conservar.

## Configuración y estructura

`.env` queda fuera de Git. `DATABASE_URL` es solo de servidor y se valida al abrir una conexión o ejecutar Drizzle. El volumen `postgres_data` conserva los datos locales al reiniciar el contenedor. El servicio utiliza una red privada de Compose; el puerto publicado está limitado al bucle local para desarrollo. En producción, no se debe publicar el puerto de PostgreSQL y la aplicación debe conectarse por la red interna del despliegue.

- `src/app`: interfaz y rutas de Next.js.
- `src/db`: esquema y cliente de PostgreSQL.
- `src/lib`: configuración compartida del servidor.
- `src/modules`: módulos de negocio en fases posteriores.
- `scripts`: comprobaciones operativas.

La fase de acceso añadirá Better Auth, usuarios, sesiones y administración interna. No existe registro público en la planificación.
