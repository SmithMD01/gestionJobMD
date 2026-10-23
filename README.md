# Gestión del trabajo

Base del MVP multiempresa de gestión de proyectos, actividades, horas y documentos. La [planificación](docs/planificacion-mvp.md) define las fases. Esta versión incluye la preparación (Fase 0), el acceso privado (Fase 1) y el módulo inicial de proyectos (Fase 2).

La interfaz usa una paleta neutra de negro, blanco y grises. El botón **Modo claro / Modo oscuro** está disponible en todas las páginas; la elección se guarda en el navegador. Si aún no hay una elección, se usa la preferencia del sistema. Los colores compartidos se definen en `src/app/globals.css` mediante variables para Tailwind.

El sidebar privado se puede contraer: los iconos de navegación permanecen visibles. El logo se amplía o reduce al pulsarlo, de forma independiente. La marca provisional está en `public/brand.svg`; se puede sustituir por una imagen o GIF cambiando la ruta en `src/app/(workspace)/sidebar.tsx`.

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

## Proyectos

Primero crea una empresa en `/companies`. El sidebar de las pantallas privadas muestra Inicio y Proyectos; el navbar contiene el selector de empresa activa, el cambio de tema, las notificaciones y un reloj. El perfil al pie del sidebar permite cerrar sesión. El administrador puede crear varias empresas y cambiar entre ellas; cada lista, detalle y edición de proyectos se filtra por la empresa seleccionada. La cookie de selección no concede permisos: el servidor comprueba la pertenencia del usuario a la empresa en cada solicitud.

El administrador puede crear, listar, consultar y editar proyectos en `/projects`. Cada proyecto tiene nombre, objetivo, descripción, estado, fecha de inicio y fecha de fin prevista. Las operaciones de creación y edición quedan registradas en `project_audit_event` dentro de la misma transacción que cambia el proyecto. La interfaz y las rutas `/api/projects` exigen una sesión de administrador con segundo factor activo y pertenencia a la empresa.

El acceso de usuarios comunes a proyectos permanece cerrado hasta definir una regla de visibilidad y asignación. El esquema ya admite pertenencia a varias empresas; la gestión de esas asignaciones para usuarios comunes llegará con la definición de sus permisos. Los estados iniciales son planificado, en curso, en pausa, completado y cancelado. No hay eliminación de proyectos en esta fase.

En otro terminal, `npm run lint`, `npm run typecheck` y `npm run build` verifican el código. `npm run start` sirve el build de producción.

Con la aplicación y PostgreSQL locales en marcha, ejecutar `$env:AUTH_FLOW_TEST='1'; npm run auth:verify-local` en PowerShell para comprobar acceso, TOTP, roles, desactivación, cambio de contraseña y aislamiento de proyectos entre dos empresas. La prueba usa cuentas, empresas y proyectos descartables y los elimina al terminar; se niega a ejecutarse fuera de la base local prevista.

Los comandos `dev` y `build` usan Webpack: con la versión actual de Next.js, Turbopack falló al lanzar el procesador de Tailwind en este entorno Windows; el build con Webpack sí se verificó.

## Base de datos y migraciones

El esquema fuente está en `src/db/schema.ts`; `drizzle/` contiene migraciones SQL versionadas. Tras cambiar el esquema, ejecutar `npm run db:generate`, revisar el SQL generado y confirmar tanto esquema como migración en Git. Aplicar con `npm run db:migrate` primero en desarrollo, después en un entorno de prueba y finalmente en producción con una copia de seguridad previa. Las migraciones aplicadas se registran en la propia base.

No hay un comando de reversión automática: antes de desplegar una migración, preparar un SQL inverso revisado o un plan de restauración probado. Para cambios destructivos, usar migraciones en varios pasos (añadir, trasladar datos y retirar) y conservar una copia externa de PostgreSQL. `docker compose down` detiene los contenedores sin eliminar el volumen; no usar `down -v` sobre datos que se deban conservar.

## Configuración y estructura

`.env` queda fuera de Git. `DATABASE_URL` es solo de servidor y se valida al abrir una conexión o ejecutar Drizzle. El volumen `postgres_data` conserva los datos locales al reiniciar el contenedor. El servicio utiliza una red privada de Compose; el puerto publicado está limitado al bucle local para desarrollo. En producción, no se debe publicar el puerto de PostgreSQL y la aplicación debe conectarse por la red interna del despliegue.

- `src/app`: interfaz y rutas de Next.js.
- `src/db`: esquema y cliente de PostgreSQL.
- `src/lib`: configuración compartida del servidor.
- `src/modules`: módulos de negocio.
- `src/modules/projects`: esquema, validación y autorización del módulo de proyectos.
- `src/modules/companies`: esquema de empresas y pertenencias y resolución de la empresa activa.
- `scripts`: comprobaciones operativas.

Antes de exponer el servicio en Internet, configurar un proxy HTTPS que sobrescriba `x-real-ip` con la IP del cliente y no permita acceso directo a la aplicación. Better Auth usa esa cabecera para los límites de intentos. PostgreSQL debe permanecer solo en la red privada del despliegue. `BETTER_AUTH_SECRET` debe ser estable entre reinicios y distinto por entorno.
