# Gestión del trabajo

Base del MVP de gestión de proyectos, actividades, horas y documentos. La [planificación](docs/planificacion-mvp.md) define las fases. Esta versión incluye la preparación (Fase 0) y el acceso privado (Fase 1). Los módulos de datos de negocio llegan después.

## Requisitos

- Node.js 20.9 o superior y npm.
- Docker Engine con Docker Compose para PostgreSQL local.

## Puesta en marcha local

1. Clonar el repositorio y entrar en su raíz.
2. Copiar `.env.example` a `.env` (`Copy-Item .env.example .env` en PowerShell, o `cp .env.example .env` en Linux). Cambiar `POSTGRES_PASSWORD` y el mismo valor dentro de `DATABASE_URL`. Si la contraseña contiene caracteres especiales de URL, codificarlos en `DATABASE_URL`. Reemplazar `BETTER_AUTH_SECRET` con al menos 32 caracteres aleatorios. En PowerShell se puede generar con `[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))`; ejecutar la expresión en tu propia terminal y pegar el valor solo en `.env`. Configurar `BETTER_AUTH_URL` con la URL pública real de la aplicación al desplegar.
3. Ejecutar `npm ci`.
4. Ejecutar `docker compose up -d postgres` y esperar el estado `healthy` (`docker compose ps`). PostgreSQL escucha solo en `127.0.0.1:5433` del equipo local.
5. Ejecutar `npm run db:migrate` y `npm run db:check`.
6. Ejecutar `npm run dev` y abrir <http://localhost:3000>.

## Primer administrador y acceso

Después de aplicar migraciones, crear una sola vez el primer administrador desde una terminal propia:

```powershell
npx auth@1.7.12 create-admin --config ./src/lib/auth.ts --email TU_CORREO --name "Tu nombre" --role admin
```

La CLI pide la contraseña de forma interactiva. No usar `--password` para evitar que quede en el historial del shell o en la lista de procesos. En el primer acceso, ir a `/security/totp`, escanear el QR con una aplicación autenticadora, verificar un código y guardar los códigos de recuperación fuera del servidor. Hasta activar TOTP, la cuenta admin no puede abrir el panel de usuarios. Si la CLI informa que ya hay usuarios, no usar `--force` sin comprobar antes la situación.

El registro público está deshabilitado. El administrador crea usuarios desde `/users`; la aplicación muestra una contraseña temporal una sola vez para comunicarla por un canal seguro. La desactivación de una cuenta revoca sus sesiones. El login exige el segundo factor a las cuentas que lo hayan activado; los administradores deben inscribirlo. `/security/sessions` permite cerrar las demás sesiones. El cambio de contraseña exige contraseña actual y código TOTP y cierra las otras sesiones.

La recuperación por correo, el cambio de correo y la sustitución del segundo factor permanecen cerrados hasta configurar un proveedor de correo y un procedimiento de confirmación seguro. No hay integración SMTP todavía. No eliminar los códigos de recuperación.

Los accesos y acciones administrativas importantes se registran en `security_event` con actor, acción, usuario afectado y fecha. No se registran contraseñas, códigos TOTP ni enlaces de verificación.

En otro terminal, `npm run lint`, `npm run typecheck` y `npm run build` verifican el código. `npm run start` sirve el build de producción.

Con la aplicación y PostgreSQL locales en marcha, ejecutar `$env:AUTH_FLOW_TEST='1'; npm run auth:verify-local` en PowerShell para comprobar acceso, TOTP, roles, desactivación y cambio de contraseña. La prueba usa cuentas descartables y las elimina al terminar; se niega a ejecutarse fuera de la base local prevista.

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

Antes de exponer el servicio en Internet, configurar un proxy HTTPS que sobrescriba `x-real-ip` con la IP del cliente y no permita acceso directo a la aplicación. Better Auth usa esa cabecera para los límites de intentos. PostgreSQL debe permanecer solo en la red privada del despliegue. `BETTER_AUTH_SECRET` debe ser estable entre reinicios y distinto por entorno.
