# Módulo de calendario

**Estado de referencia:** comportamiento implementado en la aplicación al 4 de noviembre de 2026.

## 1. Propósito

El módulo permite consultar en un solo lugar eventos de calendario de las cuentas propias del usuario, organizados por empresa, y una vista centralizada que reúne fuentes habilitadas. Google Calendar y Microsoft Outlook se conectan mediante OAuth de solo lectura. Las cuentas de otros proveedores se pueden registrar como referencia, pero todavía no se sincronizan.

El calendario es **privado por usuario**. Cada consulta de eventos se limita al usuario autenticado; otras personas de la empresa no ven sus calendarios.

## 2. Conceptos y configuración

La configuración está en **Mi perfil → Configurar calendarios** (`/profile/calendar`). Los vínculos de cuenta y empresa pertenecen al usuario que los configura.

El modo de sincronización de la instalación se administra en **Configuración → Integración de calendarios** (`/settings/calendar-integration`). Cada servidor debe tener su propio modo: deja **Origen** solo en el servidor que consulta Google y Outlook; en una copia que no debe hacer llamadas, selecciona **Desactivar consultas**. Esa opción conserva la configuración y los eventos almacenados, pero bloquea las sincronizaciones manuales, las automáticas y los nuevos flujos OAuth. La distribución de eventos entre servidores mediante API corresponde a una fase posterior.

### 2.1 Cuentas registradas

Cada cuenta tiene un nombre de referencia, correo y proveedor. Por ejemplo, “Correo empresa A”, `nombre@empresa.com` y Google Calendar.

- **Google Calendar:** se conecta con OAuth y solicita el alcance `calendar.events.readonly` junto con identidad y correo.
- **Microsoft Outlook:** se conecta con OAuth y usa el permiso delegado `Calendars.Read` junto con identidad, correo y acceso renovable (`offline_access`).
- **Otra cuenta:** se puede registrar manualmente, pero no se consultan sus eventos.

Los tokens de actualización OAuth se cifran en el servidor. La cuenta conectada sigue siendo propiedad del usuario.

### 2.2 Cuenta destino

El usuario puede elegir una cuenta destino, una sola por usuario. En la versión actual esta cuenta funciona como una fuente personal adicional para consultar eventos en **Calendario centralizado**. La aplicación **no escribe ni copia eventos a esa cuenta**.

### 2.3 Calendario por empresa

Para cada empresa se configuran tres opciones:

| Opción | Función |
|---|---|
| **Cuenta origen** | Cuenta Google u Outlook cuyos eventos se consultarán para esa empresa. |
| **Habilitado** | Incluye la fuente de esa empresa en la sincronización y permite usar su calendario propio si la cuenta está conectada. |
| **Estrella** | Hace que el botón para cambiar a la vista centralizada aparezca al entrar al calendario desde esa empresa. Al activarla, también habilita el calendario de esa empresa. |

Los cambios se aplican con **Guardar** en la fila de la empresa. La estrella controla dónde aparece el acceso a la vista centralizada. La sincronización centralizada consulta todas las empresas habilitadas a las que pertenece el usuario y para las que tiene acceso al módulo de calendario; no solo la empresa que muestra el botón.

### 2.4 Configuración OAuth del servidor

Las variables se definen en el entorno del servidor, no en el navegador ni en el repositorio. El ejemplo está en `.env.example`.

| Variable | Uso |
|---|---|
| `BETTER_AUTH_URL` | URL base pública de la aplicación. |
| `GOOGLE_CALENDAR_CLIENT_ID` | ID OAuth de Google. |
| `GOOGLE_CALENDAR_CLIENT_SECRET` | Secreto OAuth de Google. |
| `GOOGLE_CALENDAR_REDIRECT_URI` | Callback opcional; por defecto `${BETTER_AUTH_URL}/api/calendar/google/callback`. Debe coincidir exactamente con el URI registrado en Google Cloud. |
| `MICROSOFT_CALENDAR_CLIENT_ID` | ID de aplicación de Microsoft Entra. |
| `MICROSOFT_CALENDAR_CLIENT_SECRET` | Secreto de la aplicación de Microsoft Entra. |
| `MICROSOFT_CALENDAR_TENANT_ID` | ID del tenant, o un valor admitido como `common`, `organizations` o `consumers`. |
| `MICROSOFT_CALENDAR_REDIRECT_URI` | Callback opcional; por defecto `${BETTER_AUTH_URL}/api/calendar/microsoft/callback`. Debe coincidir exactamente con el URI Web de Entra. |
| `GOOGLE_CALENDAR_TOKEN_ENCRYPTION_KEY` | Clave AES de 32 bytes codificada en Base64 para cifrar tokens de Google y Microsoft. |

Callbacks predeterminados en desarrollo local:

```text
http://localhost:3000/api/calendar/google/callback
http://localhost:3000/api/calendar/microsoft/callback
```

En otro entorno, hay que usar la URL real de ese servidor y registrar el callback exacto en el proveedor. La clave de cifrado debe mantenerse estable y respaldarse de forma segura: cambiarla sin volver a conectar las cuentas impide descifrar los tokens guardados.

## 3. Vistas del calendario

El módulo está en **Calendario** (`/calendar`). Se puede cambiar entre **Empresa** y **Centralizado** si la vista centralizada está habilitada para la empresa activa y el rol del usuario tiene permiso.

### 3.1 Agenda

- Presenta los eventos de un día a la vez como una tabla ordenada por hora; no pagina la agenda.
- Abre en el día actual, que se resalta, y permite avanzar o retroceder por día con los controles de navegación. El botón **Hoy** vuelve a la fecha actual.
- Incluye eventos que atraviesan la medianoche en cada día que les corresponde.
- Muestra evento, empresa y cuenta de origen, fecha y hora, estado de sincronización y acceso al detalle.
- El detalle incluye descripción, fechas, empresa, cuenta de origen, estado y participantes que devolvió el proveedor, con su respuesta cuando está disponible.
- Los eventos cancelados se muestran después de los demás.

### 3.2 Semana

- Presenta siete días y las 24 horas, con desplazamiento vertical y horizontal cuando hace falta.
- Se desplaza inicialmente cerca de la hora actual y dibuja una línea de hora actual que se actualiza cada minuto.
- El color de cada bloque identifica la cuenta de origen; los cancelados se resaltan en rojo.
- Un evento se puede seleccionar para abrir su detalle.
- Cuando hay eventos que se cruzan, se apilan visualmente. Los eventos de mayor duración quedan más atrás y los más cortos delante para conservar su visibilidad.
- Si coinciden más de tres eventos, se muestra un indicador adicional. Al abrirlo, aparece una lista para seleccionar cualquiera de ellos y consultar su detalle.

### 3.3 Mes

- Presenta una cuadrícula mensual de seis semanas.
- Muestra hasta tres eventos por día y un indicador de cuántos más hay.
- En esta vista los eventos son informativos; no se abre el detalle al seleccionarlos.

### 3.4 Colores y estados

El color de origen se asigna de forma estable a cada cuenta. Un punto separado comunica el estado:

| Estado | Significado |
|---|---|
| **Pendiente de sincronización** | Evento creado dentro del sistema, aún sin sincronización externa. |
| **Sincronizado** | Evento leído correctamente desde el proveedor. |
| **Error de sincronización** | No se pudo actualizar correctamente. |
| **Cancelado** | El proveedor reportó que cancelaron el evento; queda visible con tratamiento rojo y menor prioridad visual. |

## 4. Qué eventos se muestran

### Calendario de empresa

Muestra los eventos del usuario asociados a la empresa activa: eventos internos creados en el sistema y eventos de la cuenta origen habilitada para esa empresa.

### Calendario centralizado

Reúne:

1. Eventos internos asociados a las empresas habilitadas, si el usuario pertenece a ellas y puede acceder a su calendario.
2. Eventos leídos de las cuentas origen configuradas para esas empresas habilitadas.
3. Eventos de la cuenta destino personal, si está configurada y no está ya incluida como cuenta origen habilitada.

La empresa activa sirve para validar el permiso y mostrar el botón de acceso. La consulta de la vista centralizada reúne las fuentes habilitadas del usuario según las reglas anteriores.

## 5. Sincronización

### 5.1 Sincronización manual

Los botones están en **Mi perfil → Configurar calendarios**, dentro de cada fila de empresa, y en la sección de Calendario centralizado:

- **Sincronizar** en una fila actualiza la cuenta origen de esa empresa.
- **Sincronizar centralizado** consulta las cuentas de las empresas habilitadas y la cuenta destino personal según corresponda.
- Los cambios de configuración de una empresa deben guardarse antes de sincronizarla.

La interfaz muestra el resultado, cuentas procesadas, eventos consultados, solicitudes a la API, elementos omitidos y errores por cuenta cuando corresponda.

### 5.2 Sincronización automática

El espacio intenta sincronizar cada **20 minutos** desde el navegador mientras el espacio de trabajo está abierto y la pestaña está visible. También intenta al enfocar o volver a mostrar la pestaña si ya pasó el intervalo. El control local evita repetir una solicitud dentro del mismo intervalo por usuario y alcance.

No es una tarea de servidor en segundo plano: si el usuario cierra el navegador, no se ejecuta una actualización periódica hasta que vuelva a abrir el sistema. No es tiempo real.

### 5.3 Ventana y reconciliación de eventos

Cada ejecución vuelve a consultar una ventana móvil de **un mes antes y un mes después** de la fecha actual. Se leen las páginas de eventos del calendario principal del proveedor, se insertan nuevos eventos y se actualizan los existentes usando la cuenta origen y el ID externo como identidad. Una sincronización repetida actualiza el registro existente; no crea copias por cada ejecución.

- En Google se lee `primary` y se recorren páginas de hasta 200 eventos.
- En Microsoft Graph se lee la vista del calendario principal del usuario y se recorren páginas de hasta 1,000 eventos.
- Si el proveedor marca un evento como cancelado, se conserva con estado **Cancelado**.
- Si un evento que antes existía ya no aparece en la ventana devuelta por el proveedor, se elimina del almacenamiento local.
- Los cambios anteriores a la ventana móvil no se vuelven a consultar en esa ejecución.

Este mecanismo es una reconciliación periódica por rango, no una suscripción push ni una sincronización incremental con `syncToken` o delta token.

### 5.4 Solicitudes API

Una solicitud contada en el seguimiento representa una llamada de página de eventos al proveedor. No representa una reunión ni un evento individual. Si una cuenta devuelve varias páginas, una ejecución puede usar varias solicitudes. La renovación de tokens OAuth no se cuenta en `apiRequests`.

## 6. Seguimiento administrativo del consumo

La opción **Configuración → Consumo de calendario** (`/calendar-monitor`) es administrativa. Presenta:

- Consultas de página a Google Calendar de hoy, comparadas con un umbral diario de referencia de un millón para el proyecto de Google. La cuota vigente debe revisarse en Google Cloud.
- Registros de cuentas procesadas hoy. Una sincronización centralizada puede crear un registro por cuenta y, por ello, no equivale al número de clics.
- Incidencias de sincronización del día y la última ejecución automática registrada.
- Detalle de ejecuciones de los últimos 30 días, con proveedor, cuenta, usuario, empresa, origen manual o automático, estado, solicitudes, eventos recibidos y errores.

El registro conserva los resultados por cuenta. Los eventos individuales y los tokens no cuentan como solicitudes.

## 7. Permisos y privacidad

Los permisos se asignan por rol y empresa:

- **Calendario (`calendar`)** controla la vista de la empresa y sus acciones relacionadas.
- **Calendario centralizado (`calendar.centralized`)** controla el acceso a la vista que combina fuentes.
- **Consumo de calendario (`settings.calendar-usage`)** da acceso administrativo al panel de seguimiento.

Además del permiso del rol, el usuario debe pertenecer a la empresa correspondiente. Las rutas consultan eventos filtrando por el usuario autenticado; las cuentas, tokens y eventos no se comparten con otros usuarios.

## 8. Crear un evento en el sistema

El botón **Nuevo evento** crea un registro interno asociado a la empresa activa, con título, inicio, fin y descripción. El campo de descripción puede guardar el contexto y los participantes como texto informativo.

Esta acción **no crea ni modifica un evento en Google Calendar ni en Outlook**, no invita a participantes ni sincroniza la reunión hacia la cuenta destino. Los eventos importados desde proveedores sí muestran los participantes que estos devuelvan.

## 9. Límites actuales y evolución

- Solo se lee el calendario principal del usuario en Google y Microsoft; no se presenta un selector de calendarios secundarios.
- “Otra cuenta” solo queda registrada como referencia y no tiene conector de sincronización.
- La cuenta destino es única por usuario y actualmente se usa para incluir esa fuente en la vista centralizada; no recibe escrituras del sistema.
- La actualización periódica depende de que el espacio de trabajo permanezca abierto en el navegador.
- El rango se limita a un mes atrás y un mes adelante. La sincronización no usa los tokens incrementales de los proveedores.
- La vista mensual no abre el detalle del evento.
- La aplicación no genera enlaces de reunión ni invita asistentes desde el calendario.

Posibles evoluciones son webhooks o delta tokens, un trabajador programado del lado del servidor, lectura de calendarios secundarios, escritura controlada a una cuenta y detalles interactivos desde la vista mensual. Cada una requiere definir su comportamiento de permisos, privacidad, conflictos y consumo antes de implementarse.

## 10. Diagnóstico de problemas comunes

| Síntoma | Revisar |
|---|---|
| `redirect_uri_mismatch` | Que el callback configurado en Google Cloud o Entra coincida exactamente con la URL calculada para el servidor, incluidos protocolo, dominio, ruta y puerto. |
| La cuenta dice conectada, pero no hay eventos | Ejecutar la sincronización manual desde Configurar calendarios; confirmar la cuenta origen, que la fila esté habilitada, que el permiso exista y que los eventos caigan dentro de la ventana de ±1 mes. |
| El calendario centralizado no aparece | En la empresa activa, habilitar la estrella y guardar; confirmar el permiso `calendar.centralized` para el rol. |
| La sincronización centralizada es parcial | Revisar en el resultado qué empresa no tiene cuenta origen, cuenta activa o permiso para calendario; un proveedor manual todavía no se sincroniza. |
| Error de renovación o cuenta desconectada | Volver a conectar con OAuth. La aplicación necesita recibir y conservar un refresh token renovable. |
| No aparece una persona invitada | El proveedor puede omitir la lista de asistentes o no devolver esos datos para ese evento. |

## 11. Puntos de implementación

- Pantalla: `src/app/(workspace)/calendar/`
- Configuración por usuario: `src/app/(workspace)/profile/calendar/`
- Seguimiento administrativo: `src/app/(workspace)/calendar-monitor/`
- OAuth y llamadas de proveedor: `src/modules/calendar/google-oauth.ts` y `src/modules/calendar/microsoft-oauth.ts`
- Esquema de datos: `src/modules/calendar/schema.ts`
- API: `src/app/api/calendar/` y `src/app/api/profile/calendar/`
