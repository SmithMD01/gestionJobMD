# Preparación de un proyecto QA

El agente y la skill viven en OptiTrabajo. Los casos y mejoras redactados por el usuario y sus resultados viven en el Google Sheets abierto dentro del grupo `ChatGPT` del perfil de Chrome indicado en cada ejecución. El reporte se guarda primero en `OptiTrabajo/reports/` y luego se sube como archivo `.md` a la pestaña `Reportes` de Google Drive del mismo grupo. El README es una guía humana y no se lee como requisito funcional.

Estructura de referencia:

```text
Drive: QA - Nombre del proyecto/
├── README (guía humana opcional)
├── Google Sheets de QA (Casos de prueba y Mejoras)
├── documentación o evidencias existentes (opcional)
└── Reportes/
    └── QA-AAAA-MM-DD-<Proyecto>-<Versión>.md

OptiTrabajo/
└── reports/
    └── QA-AAAA-MM-DD-<Proyecto>-<Versión>.md
```

Si hay documentación funcional, el usuario puede señalarla expresamente o citarla en los casos. Las dudas y decisiones viven en `Consultas`, con una o varias filas por caso cuando son preguntas distintas. El libro sigue siendo la fuente de verdad de estados y defectos. No crear una hoja `Datos de prueba` ni una hoja `Consultas` por iniciativa propia; si esta última falta, pedir indicaciones. Tomar la versión del reporte de `Versión` en `Resumen` cuando exista o del `Ciclo` explícito del libro; si no se puede identificar ninguno, consultarla antes de nombrar el archivo.

## Invocación manual en un chat del proyecto

```text
[@Chrome seleccionado desde el menú de menciones]
Ejecuta QA en el grupo de Chrome "ChatGPT".
Correo del perfil de Chrome: [correo].
Alcance: [opcional; si se omite, todas las filas no aprobadas ni canceladas de Casos de prueba y Mejoras].
Documentación funcional adicional: [URL opcional].
```

Antes de cada ejecución el usuario prepara el grupo `ChatGPT` en el perfil indicado con las pestañas del sistema ya autenticado, del Sheet de QA y de la subcarpeta `Reportes` de Drive. Solo envía el correo del perfil y usa una mención real de `@Chrome`; no necesita repetir los enlaces. `AGENTS.md` dirige al agente, y el agente a la skill; no hace falta repetir sus rutas. No se usa una tarea programada. Para subir el reporte, aplicar `report-delivery.md`: seleccionar por ruta absoluta el archivo `.md` recién guardado en `OptiTrabajo/reports/`, no descargar ni subir una copia del Google Sheets. Si no hay un método disponible para seleccionar el archivo local, informar el bloqueo y conservar la copia local.
