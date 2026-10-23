# Plan de preparación y desarrollo del MVP de gestión del trabajo

**Estado:** plan de referencia para los próximos chats de desarrollo.

**Fecha:** 22 de octubre de 2026.

**Repositorio local:** `C:\Users\slozano\Desktop\Devs\gestionJobMD`.
**Origen:** conversaciones de planificación y `C:\Users\slozano\Desktop\Devs\plan-maestro-mejora-sistema.docx`.

## 1. Propósito y alcance

Construir una aplicación multiempresa para gestionar proyectos de trabajo, actividades, horas, documentos y transcripciones. Cada empresa debe mantener sus datos separados y un usuario con pertenencia a varias empresas podrá cambiar la empresa activa. El sistema debe mostrar pendientes y avances, conservar trazabilidad de los cambios y permitir automatizaciones futuras. La primera etapa de ejecución será **preparar el proyecto y desarrollar el acceso**; los demás módulos se incorporarán por fases.

Este documento distingue los acuerdos tomados de las propuestas y decisiones aún abiertas. El plan maestro original describe un ecosistema más amplio; no ordena implementar todas sus prioridades en el primer MVP.

### Incluido en el MVP completo

1. Autenticación y gestión interna de usuarios.
2. Proyectos: alta, edición, estado, descripción, objetivo, fechas y contactos con correo y teléfono.
3. Actividades: alta, edición, eliminación controlada, proyecto, estado, fecha, horas, observaciones y origen.
4. Documentos y transcripciones: carga, asociación a proyectos, versiones, descarga, revisión y aprobación manual.
5. Panel básico: pendientes, completadas, vencidas, horas y documentos pendientes de revisión.
6. Auditoría de acciones importantes, incluida la administración de usuarios y documentos.
7. Empresas, pertenencias de usuarios y separación de los datos de negocio por empresa.

### Fuera del primer desarrollo

Dictado de voz, generación documental con IA, integración con correo o calendario de trabajo, sincronización con ERP y agentes de revisión. n8n se reservará para automatizaciones posteriores. El correo transaccional de seguridad se configurará en una fase posterior del módulo de acceso; hasta entonces no se anunciarán como operativos la recuperación por correo ni el cambio de dirección.

## 2. Decisiones de arquitectura

| Tema | Decisión |
| --- | --- |
| Forma de la aplicación | Monolito modular: interfaz, API y reglas de negocio en una aplicación Next.js con TypeScript. Los módulos deben tener límites claros. |
| Navegación | Sidebar para las pantallas privadas, con Inicio, módulos disponibles y perfil del usuario. Navbar con empresa activa, tema, notificaciones y reloj. |
| Aislamiento multiempresa | Cada registro de negocio pertenece a una empresa. La selección de empresa se valida contra las pertenencias del usuario en el servidor; una cookie solo expresa la preferencia activa y nunca concede acceso por sí sola. |
| Automatización | n8n como servicio separado. Cuando corresponda, hablará con la API autenticada de la aplicación. No accederá directamente a las tablas de negocio. |
| Base de datos | PostgreSQL en Docker, con volumen persistente y migraciones versionadas. Una instancia puede alojar bases y usuarios independientes para la aplicación y n8n. |
| Archivos | Los binarios estarán en un volumen persistente del servidor; PostgreSQL guardará metadatos, relaciones, versiones y auditoría. Encapsular el acceso a archivos para poder cambiar de almacenamiento en el futuro. |
| Despliegue | Docker Compose en un servidor Linux, con proxy HTTPS delante de la aplicación. PostgreSQL no debe exponerse públicamente. |
| Escalado | No crear microservicios para el MVP. Separar un proceso o servicio solo cuando la carga o el despliegue independiente lo justifiquen. |

El servidor previsto tiene aproximadamente **4 CPU, 8 GB de RAM y 100 GB de almacenamiento** y también alojará n8n. Esta capacidad parece razonable para uso personal o un equipo pequeño y automatizaciones moderadas, pero es una hipótesis que debe comprobarse midiendo el uso real. No planificar procesamiento local de modelos de IA pesados en ese mismo servidor sin pruebas de capacidad. Evitar al inicio la pila completa de Supabase y el modo de cola de n8n, que añaden procesos y operación.

### Esquema de despliegue

```text
Internet
   │
Proxy HTTPS
   ├── Aplicación Next.js ── PostgreSQL: base de la aplicación
   │                    └── Volumen de documentos
   └── n8n ─────────────── PostgreSQL: base separada de n8n

n8n ── API autenticada de la aplicación (flujos futuros)
```

### Reglas técnicas para mantener la portabilidad

- No depender de funciones exclusivas de Vercel o Supabase para el núcleo del MVP.
- Usar variables de entorno para configuración y secretos; publicar solo un `.env.example` sin credenciales.
- Guardar esquema y migraciones en Git; no editar manualmente la base de producción para cambios ordinarios.
- Mantener separados desarrollo y producción.
- Configurar copias de seguridad externas de PostgreSQL y documentos y comprobar que se pueden restaurar.
- Vigilar espacio, memoria, CPU, fallos de aplicación y crecimiento de las ejecuciones de n8n.

## 3. Acceso y seguridad

### Usuarios y roles

- No existe registro público. Solo un administrador puede dar acceso a otros usuarios desde el módulo interno.
- El primer usuario será el propietario del proyecto, con rol `admin`. Se creará una sola vez mediante una herramienta de terminal de la biblioteca de autenticación, después de aplicar el esquema. Next.js no trae un comando propio de creación de usuarios.
- El administrador podrá crear, desactivar y gestionar usuarios. El usuario común no podrá administrar cuentas.
- Toda página, acción y API debe comprobar sesión y autorización **en el servidor**. Ocultar botones en la interfaz no constituye protección.
- Diseñar la información con autor/propietario y trazabilidad. La regla exacta de visibilidad entre usuarios y proyectos sigue pendiente; hasta definirla, negar acceso a registros ajenos por defecto.
- Un usuario puede pertenecer a varias empresas; el acceso a datos de una empresa exige comprobar esa pertenencia en cada página y API.

### Inicio y cierre de sesión

- Proponer Better Auth con correo y contraseña, sesiones guardadas en PostgreSQL y registro público deshabilitado.
- Exigir segundo factor para el administrador. La opción inicial propuesta es TOTP con códigos de recuperación de un solo uso; una llave de seguridad o passkey puede añadirse si se prefiere.
- Permitir cerrar la sesión actual y revocar otras sesiones. Registrar eventos de seguridad sin guardar contraseñas, códigos ni enlaces de verificación.
- Aplicar límites a intentos de login y segundo factor, y respuestas genéricas que no revelen si una cuenta existe. Configurar el proxy para que la aplicación reconozca correctamente la IP de origen.
- HTTPS obligatorio en producción, cookies de sesión seguras y secretos fuera del repositorio.

### Cambios y recuperación de cuenta

| Operación | Requisito previsto |
| --- | --- |
| Cambio de contraseña con sesión | Solicitar contraseña actual y comprobación reforzada; revocar las demás sesiones. |
| Cambio de correo | Nueva comprobación de identidad, aprobación desde el correo actual y verificación del nuevo correo antes de activarlo. |
| Sustitución del segundo factor | Confirmación con un factor ya inscrito y aviso al correo actual. No basta con una sesión abierta. |
| Pérdida del segundo factor | Códigos de recuperación guardados fuera del sistema; definir un procedimiento excepcional de recuperación administrativa. |
| Sospecha de cuenta comprometida | Revocar sesiones, cambiar credenciales, revisar auditoría y verificar el servidor. |

La confirmación por correo **no sustituye** al segundo factor independiente. Los enlaces de seguridad deberán tener vencimiento y uso único y no aparecer en logs. Si un atacante controla por completo el servidor, los controles implementados dentro de ese servidor no bastan para garantizar la seguridad de la cuenta; también importan la seguridad del correo, del dispositivo del segundo factor y de las copias externas.

El proveedor de correo queda **pendiente**. Gmail personal vía SMTP es una posibilidad de bajo volumen, no una dependencia irrevocable. Implementar el envío mediante una interfaz sustituible. Antes de activar cambios de correo o recuperación, configurar el proveedor real y probar entrega, errores y límites de solicitudes. No basar el diseño en la suposición de un cupo mensual de 100 correos.

## 4. Documentos y archivado manual

- Tamaño previsto de documentos funcionales: hasta **20 MB por archivo** como límite inicial configurable. Muchos tendrán entre 70 y 100 páginas, pero el número de páginas no determina por sí solo el tamaño.
- Guardar mientras se elabora la transcripción original, borradores, observaciones, versiones corregidas y versión aprobada. La aprobación siempre será humana.
- Mantener estados documentales separados de los estados de actividad: borrador, en revisión, observado, corregido, pendiente de aprobación, aprobado y obsoleto son la referencia inicial del plan maestro.
- Cada versión debe tener nombre, tamaño, tipo, fecha, autor, estado e identificador; verificar el tipo y el tamaño del archivo al recibirlo. El archivo físico no debe depender del nombre original para su ruta interna.
- El usuario descargará manualmente los documentos que quiera conservar, los subirá a OneDrive por su cuenta y después los eliminará del sistema. **No habrá integración con OneDrive.**
- La eliminación debe retirar el binario del almacenamiento del sistema y dejar una traza mínima de auditoría. Es deseable permitir marcar un documento como archivado externamente y guardar una referencia textual opcional, sin afirmar que la copia externa fue verificada automáticamente.
- Definir y mostrar claramente si la acción elimina una versión o todas las versiones. Las copias de seguridad pueden conservar archivos eliminados hasta que venza su propia retención.
- Respaldar el material que aún se encuentra en trabajo; el archivado manual posterior no reemplaza esas copias.

Ejemplo de cálculo: 100 documentos × 5 versiones × 20 MB ≈ **10 GB de archivos**, antes de base de datos, sistema operativo, n8n y respaldos. Medir el consumo y establecer alertas antes de llenar el disco.

## 5. Modelo funcional inicial

Entidades mínimas a diseñar: `users`, `projects`, `activities`, `time_entries` o registro explícito de horas, `documents`, `document_versions`, `transcripts`, `audit_events` y sesiones/tablas de autenticación. El chat de implementación decidirá nombres finales y relaciones mediante migraciones. No duplicar horas sin una regla clara: una actividad puede tener una duración simple en el primer corte o varios registros de tiempo si se necesita trabajo en varios días.

Los estados de la actividad propuestos por el plan maestro son: por validar, pendiente, en progreso, bloqueada, completada y cancelada. **La sincronización con ERP es un estado aparte**, no un estado de actividad. El campo `origen` debe admitir manual, voz, correo, reunión o automatización, aunque solo se use `manual` al principio.

La auditoría inicial debe cubrir altas, modificaciones, cambios de estado, eliminaciones, aprobaciones y acciones administrativas. Guardar actor, acción, entidad, identificador y fecha. No incluir secretos ni el contenido completo de documentos en la auditoría.

## 6. Dependencias previstas

La siguiente lista identifica paquetes y servicios; **no fija versiones**. En la preparación se deben seleccionar versiones estables compatibles, registrarlas en `package.json` y bloquear el árbol en el archivo de dependencias. No instalar paquetes opcionales antes de necesitarlos.

| Grupo | Dependencias |
| --- | --- |
| Base de aplicación | `next`, `react`, `react-dom`, `typescript`, `@types/node`, `@types/react`, `@types/react-dom` |
| Calidad de código | `eslint`, `eslint-config-next` |
| Estilos | `tailwindcss`, `@tailwindcss/postcss`, `postcss`; definir estilos básicos reutilizables y accesibles. Evitar una biblioteca de componentes adicional hasta necesitarla. |
| Datos | `drizzle-orm`, `pg`, `drizzle-kit`, `@types/pg` |
| Validación | `zod` |
| Autenticación | `better-auth`, con complementos de administración y segundo factor incluidos en la biblioteca. |
| Correo transaccional, cuando se habilite | `nodemailer`, `@types/nodemailer` si se elige SMTP. |
| Passkeys, solo si se eligen | `@better-auth/passkey`. |
| Infraestructura | Docker Engine, Docker Compose, imagen oficial de PostgreSQL, proxy HTTPS y n8n en servicio separado. |

La carga y descarga básica de archivos puede implementarse con capacidades del servidor sin añadir inicialmente un SDK de almacenamiento externo. Las pruebas se añadirán según el riesgo real de cada módulo; el flujo crítico de acceso y autorización sí merece verificación automatizada.

## 7. Secuencia de trabajo y criterios de aceptación

### Fase 0: preparación del repositorio

1. Revisar el remoto y el estado de Git antes de crear commits. El repositorio local tiene `origin` configurado como `https://github.com/SmithMD01/gestionJobMD.git`, pero al redactar este plan todavía no tiene commits locales.
2. Inicializar la aplicación Next.js **en este repositorio**, con TypeScript, App Router, ESLint y Tailwind. Evitar crear una carpeta anidada innecesaria.
3. Elegir un gestor de paquetes, generar su archivo de bloqueo y documentar los comandos de instalación, desarrollo, lint y build.
4. Crear `.gitignore`, `.env.example`, configuración de entorno validada, estructura modular inicial y README con puesta en marcha local.
5. Preparar Compose para PostgreSQL local, volumen persistente, red privada y comprobación de salud; no publicar el puerto de PostgreSQL en el servidor de producción.
6. Configurar Drizzle y una migración inicial. Documentar cómo aplicar y revertir cambios de esquema de forma segura.

**Aceptación:** otra persona o chat puede clonar el repositorio, configurar el entorno de ejemplo, levantar PostgreSQL, aplicar migraciones, iniciar la aplicación, ejecutar lint y generar el build siguiendo el README. No se requieren cuentas externas para esta fase.

### Fase 1: acceso y administración inicial

1. Integrar Better Auth con PostgreSQL y generar/aplicar sus tablas mediante el flujo compatible con Drizzle.
2. Deshabilitar el registro público e incorporar el rol de administrador.
3. Documentar y ejecutar la creación controlada del primer admin desde la terminal, sin escribir la contraseña en el repositorio ni en logs.
4. Construir formulario de login, cierre de sesión, página privada mínima y protección del lado del servidor para páginas y API.
5. Añadir TOTP y códigos de recuperación para el administrador, gestión y revocación de sesiones, y límites de intentos.
6. Crear un primer módulo interno para alta, listado y desactivación de usuarios. Definir la entrega segura de la contraseña inicial; no enviar contraseñas por correo en texto plano.
7. El correo transaccional y su interfaz se aplazan hasta elegir proveedor; recuperación y cambio de correo permanecen deshabilitados.

**Aceptación:** un visitante no autenticado no puede leer ni modificar datos privados; el admin entra con segundo factor, puede cerrar y revocar sesiones y crear/desactivar usuarios; un usuario común no puede usar acciones de administración; las solicitudes excesivas reciben límites; la aplicación puede volver a desplegarse sin perder usuarios ni sesiones de forma inesperada.

### Fase 2: proyectos

Crear, editar, listar y consultar proyectos con estado, objetivo, descripción, fechas y contactos con correo y teléfono. Añadir comprobaciones de autorización y auditoría. Definir antes de exponerlo a usuarios comunes qué proyectos puede ver cada uno.

**Primer corte:** acceso exclusivo para administradores con segundo factor activo y pertenencia a la empresa seleccionada. Los estados son planificado, en curso, en pausa, completado y cancelado. La asignación y visibilidad para usuarios comunes se decidirán antes de habilitar su acceso.

### Fase 3: actividades y horas

Registrar actividades ligadas a proyectos, estado, origen, fecha, observaciones y tiempo. Permitir consulta por proyecto y por periodo; auditar cambios y eliminaciones.

### Fase 4: documentos y transcripciones

Implementar carga, descarga, versiones, asociación a proyectos, revisión, aprobación, eliminación de binarios y traza de archivado manual. Probar límite de archivo, permisos y persistencia tras reiniciar contenedores.

### Fase 5: panel y despliegue

Mostrar indicadores básicos; preparar Compose de producción, HTTPS, respaldo externo, restauración comprobada y monitoreo simple. Medir consumo de RAM, CPU y disco con la aplicación y n8n en el servidor previsto. Configurar la retención de ejecuciones de n8n antes de poner flujos permanentes.

## 8. Decisiones pendientes que no deben inventarse durante la implementación

1. **Visibilidad multiusuario:** definir si cada usuario ve solo proyectos asignados, todos los proyectos internos o un conjunto configurable. Hasta resolverlo, acceso mínimo y denegación por defecto.
2. **Política de tiempo:** decidir si una actividad tiene una sola duración o varios registros de horas por fecha. La segunda opción soporta mejor trabajo repartido en días.
3. **Proveedor de correo:** posiblemente Gmail SMTP para bajo volumen; confirmar cuenta, disponibilidad de acceso SMTP, dirección remitente y políticas de entrega. Mantenerlo sustituible.
4. **Segundo factor:** TOTP es la propuesta inicial. Confirmar si se quiere además passkey o llave física, sobre todo para el administrador.
5. **Retención:** plazo de copias de seguridad, auditoría y archivos eliminados; definirlo antes de operar con documentación sensible.
6. **Dominio y servidor:** datos exactos del host, DNS, proxy y mecanismo de respaldo externo para producción.

Estas decisiones no bloquean la preparación del repositorio. El chat de implementación debe señalar cuándo una fase dependa de alguna de ellas y proponer una opción concreta antes de continuar con esa parte.

## 9. Encargo para el siguiente chat

> Usa este documento como plan de referencia. Comienza por la **Fase 0: preparación del repositorio** en `gestionJobMD`. Revisa primero el estado de Git y el remoto; inicializa Next.js en la raíz con TypeScript, ESLint y Tailwind; prepara PostgreSQL con Docker Compose, Drizzle, migraciones, `.env.example`, README y comandos de verificación. Selecciona versiones estables compatibles y fija el archivo de bloqueo. Ejecuta lint, build y una prueba real de conexión/migración. No avances al módulo de login hasta dejar la preparación ejecutable y documentada; después continúa con la Fase 1 siguiendo los criterios de seguridad y aceptación de este plan. No habilites registro público ni inventes reglas de visibilidad multiusuario.

## 10. Referencias técnicas verificadas

- [Despliegue propio de Next.js](https://nextjs.org/docs/app/getting-started/deploying)
- [Instalación de Tailwind con Next.js](https://tailwindcss.com/docs/installation/framework-guides/nextjs)
- [PostgreSQL con Drizzle](https://orm.drizzle.team/docs/get-started/postgresql-new)
- [Imagen oficial de PostgreSQL](https://hub.docker.com/_/postgres)
- [Better Auth: administración](https://better-auth.com/docs/plugins/admin), [segundo factor](https://better-auth.com/docs/plugins/2fa), [cambio de correo](https://better-auth.com/docs/concepts/users-accounts) y [límites de solicitudes](https://better-auth.com/docs/concepts/rate-limit)
- [n8n con PostgreSQL](https://docs.n8n.io/deploy/host-n8n/configure-n8n/choose-n8ns-database/) y [retención de ejecuciones](https://docs.n8n.io/deploy/host-n8n/configure-n8n/scaling/manage-execution-data/)
- [OWASP: verificación de correo](https://cheatsheetseries.owasp.org/cheatsheets/Email_Validation_and_Verification_Cheat_Sheet.html) y [autenticación multifactor](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)
