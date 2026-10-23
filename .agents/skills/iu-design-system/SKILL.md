---
name: ui-design-system
description: Define y mantiene los tokens y reglas visuales globales de un proyecto.
---

# Sistema de diseño de interfaz

## Descripción / objetivo

Definir la identidad visual y las reglas globales de un proyecto mediante tokens de colores, tipografías, espaciados, bordes, sombras y estados.

Esta skill define el sistema visual global. No implementa el comportamiento específico de botones, tablas, modales o toasts.

## Cuándo se utiliza

Utilizar cuando se necesite:

- Crear la paleta visual de un proyecto.
- Definir o modificar tokens de diseño.
- Crear un tema claro u oscuro.
- Definir tipografías y escalas de texto.
- Definir espaciados, bordes, radios y sombras.
- Revisar la consistencia visual global.
- Resolver conflictos entre componentes y la identidad visual del proyecto.
- Evaluar contraste y accesibilidad a nivel del sistema de diseño.

No es necesario cargar esta skill para una implementación rutinaria que solo utiliza tokens ya existentes.

## Entrada esperada

- Identidad visual del proyecto.
- Referencias de diseño aprobadas.
- Tokens o variables existentes.
- Componentes globales.
- Requisitos de accesibilidad.
- Necesidad de crear o modificar un tema.

## Reglas obligatorias

1. Definir tokens semánticos en lugar de depender de colores directos.
2. Separar los valores concretos de su significado funcional.
3. Mantener una jerarquía entre fondo de aplicación, superficies, tarjetas, formularios y elementos elevados.
4. Definir estados visuales consistentes.
5. Mantener contraste y legibilidad.
6. Evitar tokens duplicados con el mismo propósito.
7. Evaluar el impacto de modificar tokens globales.
8. Permitir que cada proyecto tenga una paleta diferente sin cambiar la estructura de los componentes.

## Tokens recomendados

```text
background-app
background-surface
background-elevated
background-input

text-primary
text-secondary
text-muted
text-inverse
text-disabled

border-default
border-subtle
border-strong
border-focus

action-primary
action-secondary
action-success
action-warning
action-danger

status-success
status-warning
status-danger
status-info