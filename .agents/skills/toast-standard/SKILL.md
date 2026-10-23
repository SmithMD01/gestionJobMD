---
name: toast-standard
description: Define la apariencia, comportamiento y duración de los mensajes temporales que informan el resultado de una operación.
---

# Toasts estándar

## Descripción / objetivo

Definir un comportamiento consistente para los mensajes temporales de éxito, error, advertencia e información.

Esta skill es autosuficiente para crear o revisar toasts sin requerir la carga de otras skills.

No aplica para notificaciones persistentes, bandejas de avisos ni mensajes que deban permanecer almacenados.

## Cuándo se utiliza

Utilizar al:

- Confirmar la creación, edición o eliminación de un registro.
- Informar que una operación fue exitosa.
- Mostrar errores de una operación.
- Mostrar advertencias temporales.
- Mostrar información contextual breve.
- Informar el resultado de una acción del usuario.

## Entrada esperada

- Tipo de mensaje.
- Texto que se mostrará.
- Acción que originó el mensaje.
- Duración correspondiente.
- Tokens visuales del proyecto.
- Componente de toast existente.

## Tipos estándar

- `success`: operación completada correctamente.
- `error`: operación fallida o con errores.
- `warning`: situación que requiere atención.
- `info`: información contextual o neutral.

## Posición y animación

1. Mostrar los toasts en la parte superior derecha.
2. Iniciarlos fuera del límite derecho de la pantalla.
3. Animarlos de derecha a izquierda hasta su posición final.
4. Utilizar una transición suave y breve.
5. Desaparecer suavemente al finalizar su duración.
6. Respetar la preferencia del usuario por reducir animaciones.
7. En dispositivos móviles, utilizar el ancho disponible con márgenes adecuados.

## Estructura visual

Cada toast debe incluir, cuando corresponda:

- Indicador visual o icono del tipo de mensaje.
- Mensaje breve y claro.
- Botón `X` para cerrarlo manualmente.
- Barra de progreso que muestre el tiempo restante.

La barra de progreso debe avanzar o reducirse de forma coherente con el temporizador.

## Duración estándar

- `success`: 3 segundos.
- `info`: 3 segundos.
- `warning`: 5 segundos.
- `error`: 6 segundos o cierre manual.

El temporizador debe pausarse cuando el usuario pase el cursor sobre el toast o lo enfoque mediante teclado.

## Reglas obligatorias

1. Reutilizar el componente de toast existente.
2. Utilizar tokens semánticos del proyecto.
3. No utilizar colores directos.
4. Mantener el mensaje breve y comprensible.
5. Permitir cierre manual mediante el botón `X`.
6. Evitar mostrar más de 3 toasts simultáneamente.
7. Apilar varios toasts verticalmente sin ocultar sus controles.
8. Evitar duplicar mensajes idénticos en un periodo corto.
9. No utilizar un toast para información que deba permanecer visible.
10. No bloquear la interacción principal de la pantalla.
11. Utilizar `aria-live` y roles accesibles adecuados.
12. Mantener contraste y legibilidad suficientes.

## Qué puede decidir

El agente puede decidir:

- El tipo de toast cuando el resultado de la operación sea claro.
- La duración según el tipo de mensaje.
- El texto cuando la operación y el resultado estén definidos.
- El orden vertical de varios toasts.
- La aplicación de tokens semánticos existentes.
- La posición adaptada para dispositivos móviles.

## Qué debe preguntar

Debe consultar cuando:

- No esté claro si corresponde un toast o una notificación persistente.
- No esté definido el resultado de la operación.
- El mensaje contenga información sensible.
- El error requiera una explicación más extensa.
- Se necesite una acción adicional dentro del toast.
- La duración solicitada contradiga el estándar.
- Se requieran más de 3 toasts simultáneos.
- No exista un componente reutilizable.
- No esté claro qué token visual corresponde.
- El diseño contradiga el comportamiento estándar.

## Formato de salida

```text
Toasts creados o modificados:

Tipos implementados:

Componente reutilizado:

Duraciones configuradas:

Animación y posición:

Comportamiento de cierre:

Tokens visuales utilizados:

Validaciones ejecutadas:

Dudas y decisiones pendientes:

Excepciones al estándar: