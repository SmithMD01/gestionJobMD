---
name: table-standard
description: Define la estructura, estilos y comportamiento estándar de las tablas del sistema.
---

# Tablas estándar

## Descripción / objetivo

Garantizar que las tablas mantengan una estructura, apariencia y comportamiento consistentes.

Esta skill es autosuficiente para crear o revisar tablas.

## Cuándo se utiliza

Utilizar al:

- Crear una tabla.
- Modificar una tabla existente.
- Agregar filtros.
- Agregar paginación.
- Agregar acciones a filas.
- Revisar la consistencia de una tabla.

## Entrada esperada

- Vista o módulo donde aparecerá la tabla.
- Entidad y datos que se mostrarán.
- Columnas requeridas.
- Filtros necesarios.
- Acciones disponibles.
- Reglas de permisos.
- Componente de tabla existente.

## Estructura estándar

Una tabla debe contemplar, cuando corresponda:

1. Título o contexto.
2. Sección de filtros encima de la tabla.
3. Campo de búsqueda cuando sea necesario.
4. Encabezados claros.
5. Acciones generales o acciones por fila.
6. Estados de carga, vacío y error.
7. Paginación.
8. Selector de cantidad de filas.

## Funcionalidad estándar

La tabla debe:

- Mostrar 20 filas inicialmente.
- Permitir seleccionar 30, 40 o 50 filas.
- Incluir paginación.
- Mantener los filtros al cambiar de página.
- Mostrar un mensaje cuando no existan resultados.
- Mostrar un estado de carga mientras obtiene datos.
- Mostrar un mensaje comprensible cuando ocurra un error.
- Ser responsive y accesible.
- Utilizar los tokens visuales del proyecto.

## Reglas de reutilización y estilos

1. Buscar primero un componente `DataTable` o equivalente.
2. Reutilizarlo si cubre el requerimiento.
3. Crear una variante solo si la diferencia es reutilizable.
4. Utilizar tokens semánticos para fondos, texto, bordes y estados.
5. No utilizar colores directos.
6. No crear estilos aislados para una sola tabla.
7. No modificar globalmente el componente para resolver un caso local sin evaluar sus impactos.

## Qué puede decidir

- El orden visual de los filtros.
- El ancho razonable de las columnas.
- La alineación de textos, fechas, números y acciones.
- La configuración técnica del paginado.
- Los mensajes de estado vacío y error cuando no estén definidos.
- La distribución de acciones cuando el requerimiento sea claro.

## Qué debe preguntar

- Si no existe un componente de tabla reutilizable.
- Si la tabla necesita un comportamiento distinto.
- Si no están definidas las columnas.
- Si no está claro qué filtros deben existir.
- Si no se sabe qué acciones puede realizar el usuario.
- Si la paginación debe ser local o del servidor.
- Si el valor inicial u opciones de filas deben ser diferentes.
- Si existen reglas especiales de permisos.
- Si el diseño contradice otra tabla existente.

## Formato de salida

```text
Tabla implementada o revisada:

Componente reutilizado:

Columnas configuradas:

Filtros implementados:

Paginación y cantidad de filas:

Acciones disponibles:

Estados implementados:

Validaciones ejecutadas:

Dudas y decisiones pendientes:

Excepciones al estándar: