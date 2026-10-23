---
name: component-reuse
description: Define cómo analizar, seleccionar y reutilizar componentes compartidos antes de crear nuevas implementaciones.
---

# Reutilización de componentes

## Descripción / objetivo

Evitar duplicaciones y mantener una arquitectura de componentes consistente.

Esta skill se enfoca en decisiones generales de reutilización. No define el comportamiento específico de tablas, botones, modales o toasts.

## Cuándo se utiliza

Utilizar cuando se necesite:

- Analizar la estructura general de componentes.
- Buscar si ya existe una solución reutilizable.
- Decidir si crear una variante o un componente nuevo.
- Extraer lógica o estilos repetidos.
- Refactorizar componentes duplicados.
- Revisar el impacto de modificar un componente compartido.
- Definir patrones de composición para varias vistas.

No es necesario cargar esta skill para una tarea específica si ya existe una skill especializada autosuficiente, como `button-standard`, `table-standard` o `toast-standard`.

## Entrada esperada

- Requerimiento de la funcionalidad.
- Estructura actual del proyecto.
- Componentes potencialmente relacionados.
- Usos actuales de los componentes.
- Restricciones técnicas, visuales o de negocio.

## Reglas obligatorias

1. Buscar implementaciones existentes antes de crear una nueva.
2. Revisar dónde se utiliza el componente encontrado.
3. Reutilizarlo cuando cubra el requerimiento.
4. Crear una variante si la diferencia es configurable y reutilizable.
5. Crear un componente nuevo solo cuando no exista una alternativa adecuada.
6. Extraer lógica compartida cuando exista duplicación real.
7. Evaluar el impacto de modificar un componente compartido.
8. Mantener nombres, propiedades y patrones de composición consistentes.
9. No fusionar componentes que tengan responsabilidades diferentes.

## Qué puede decidir

- Qué componente existente es técnicamente adecuado.
- Si una diferencia puede resolverse mediante una variante.
- Si una lógica repetida debe convertirse en una utilidad compartida.
- Cómo organizar internamente una implementación reutilizable.
- Qué componentes están duplicados o pueden consolidarse.

## Qué debe preguntar

- Si existen varias alternativas válidas y la elección afecta el diseño o comportamiento.
- Si no está claro si debe modificarse un componente compartido.
- Si una modificación puede romper otras vistas.
- Si no está definida la responsabilidad de un componente.
- Si el nuevo requerimiento contradice un patrón existente.
- Si la decisión afecta arquitectura o reglas de negocio.

## Formato de salida

```text
Componentes revisados:

Componentes reutilizables encontrados:

Decisión tomada:

Componentes o variantes creados:

Impacto en otros usos:

Validaciones ejecutadas:

Dudas y decisiones pendientes:

Limitaciones: