---
name: button-standard
description: Define las variantes, textos, estilos y comportamientos estándar de los botones del sistema.
---

# Botones estándar

## Descripción / objetivo

Mantener consistencia en los botones, sus variantes, textos, estados y acciones sin requerir la carga de otras skills para una tarea común de botones.

## Cuándo se utiliza

Utilizar al crear, modificar o revisar botones de vistas, tablas, formularios, modales, confirmaciones o acciones con iconos.

## Entrada esperada

- Acción que debe realizar el botón.
- Contexto donde aparecerá.
- Componente de botón existente.
- Tokens visuales del proyecto.
- Reglas de permisos o negocio.

## Reglas de reutilización y estilos

1. Buscar primero un componente `Button` existente.
2. Reutilizarlo si cubre el requerimiento.
3. Crear una variante solo si la diferencia es reutilizable.
4. Crear un componente nuevo únicamente si no existe una alternativa adecuada.
5. Utilizar los tokens semánticos del proyecto, nunca colores directos.
6. Mantener tamaños, iconos, espaciados y estados consistentes.

## Variantes estándar

- `primary`: acción principal.
- `secondary`: acción alternativa.
- `success`: aprobar, confirmar o completar.
- `warning`: advertir o requerir atención.
- `danger`: eliminar, rechazar o realizar una acción destructiva.
- `neutral`: acción sin significado positivo o negativo.
- `ghost`: acción secundaria con bajo impacto visual.

## Estados obligatorios

Mantener estados `hover`, `focus`, `disabled` y `loading`.

Desactivar el botón mientras se procesa una acción para evitar duplicados.

## Textos recomendados

```text
Crear
Guardar
Editar
Ver detalle
Cancelar
Volver
Eliminar
Rechazar
Aprobar
Confirmar
Reintentar
Descargar