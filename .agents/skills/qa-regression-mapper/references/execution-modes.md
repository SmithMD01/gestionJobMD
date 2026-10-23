# Política de ejecución por entorno

## Desarrollo

Habilitar altas y ediciones de datos ficticios que correspondan a los casos del ciclo, incluso si sirven como precondición de módulos futuros. Etiquetar los registros como QA cuando el sistema lo permita y registrar IDs, dependencias y resultado en campos existentes adecuados de `Casos de prueba` y en el reporte; no crear una hoja adicional. No limpiar registros por defecto. Borrados, inactivaciones, cambios de permisos y otras acciones con efecto irreversible solo cuando sean parte de un caso explícito y el alcance del entorno esté verificado. Evitar correos reales, pagos y datos personales reales aunque el entorno sea desarrollo.

## Producción

Modo predeterminado de solo lectura y pruebas no persistentes. No crear, editar, inactivar ni borrar registros; no enviar mensajes ni activar integraciones. Para una excepción se necesita alcance preciso y autorización explícita del usuario para la operación y el ciclo; registrar el permiso y sus límites. Si un caso requiere persistencia y no hay autorización, marcar `No ejecutado` con causa, sin simular su resultado.

## Entorno no verificado o discrepante

Si la etiqueta del libro, URL esperada y entorno observado no coinciden, detener toda escritura. Registrar la discrepancia en `Consultas` o reportarla al usuario si el libro tampoco puede editarse. No resolverla suponiendo que una IP, dominio o nombre de pestaña es desarrollo.
