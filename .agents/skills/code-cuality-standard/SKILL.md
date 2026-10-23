---
name: code-quality-standard
description: Define los criterios para revisar la calidad técnica, mantenibilidad y claridad del código bajo demanda.
---

# Estándar de calidad de código

## Descripción / objetivo

Definir criterios consistentes para revisar la calidad técnica del código y detectar problemas que puedan afectar su mantenibilidad, comprensión, prueba o evolución.

Esta skill se utiliza bajo demanda. No implica revisar continuamente todo el proyecto ni ejecutar auditorías automáticas.

## Cuándo se utiliza

Utilizar cuando se solicite:

- Revisar cambios actuales.
- Revisar archivos o módulos específicos.
- Revisar un Pull Request.
- Analizar código antes de una entrega.
- Detectar duplicación de lógica.
- Identificar complejidad innecesaria.
- Evaluar mantenibilidad.
- Revisar una implementación antes de aprobarla.
- Preparar recomendaciones de refactorización.

Por defecto, revisar únicamente los archivos modificados o indicados.

Analizar todo el proyecto solo cuando el usuario solicite expresamente una auditoría completa.

## Entrada esperada

- Archivos, rutas o módulos a revisar.
- Cambios actuales o Pull Request.
- Convenciones del proyecto.
- Tecnologías y framework utilizados.
- Requisitos funcionales relacionados.
- Restricciones conocidas.
- Pruebas disponibles, cuando corresponda.

## Áreas de revisión

### Estructura y responsabilidades

- Responsabilidades mezcladas.
- Funciones o clases demasiado grandes.
- Dependencias innecesarias.
- Separación deficiente entre capas.
- Acoplamiento excesivo.
- Abstracciones innecesarias.

### Duplicación

- Lógica repetida.
- Validaciones duplicadas.
- Código copiado con pequeñas variaciones.
- Utilidades que podrían compartirse.
- Implementaciones paralelas del mismo comportamiento.

### Complejidad

- Condicionales anidados innecesariamente.
- Funciones difíciles de seguir.
- Flujo de control confuso.
- Código con demasiados casos especiales.
- Soluciones más complejas de lo necesario.

### Claridad

- Nombres ambiguos o poco descriptivos.
- Variables con responsabilidades confusas.
- Comentarios que contradicen el código.
- Código difícil de leer.
- Uso excesivo de abreviaturas.

### Tipado y contratos

- Uso innecesario de `any` o equivalentes.
- Tipos demasiado amplios.
- Valores que pueden ser nulos sin control.
- Contratos inconsistentes entre funciones.
- Falta de validación de entradas.
- Respuestas o estados no contemplados.

### Errores y excepciones

- Errores ignorados silenciosamente.
- Mensajes poco claros.
- Excepciones demasiado genéricas.
- Falta de manejo de errores esperables.
- Información sensible expuesta en errores.
- Estados de error no comunicados correctamente.

### Pruebas y mantenibilidad

- Lógica difícil de probar.
- Funcionalidades críticas sin pruebas.
- Dependencias difíciles de sustituir.
- Cambios con alto riesgo de regresión.
- Pruebas frágiles o demasiado acopladas a la implementación.

### Rendimiento básico

- Operaciones repetidas innecesariamente.
- Consultas o llamadas duplicadas.
- Procesamiento costoso dentro de ciclos.
- Carga innecesaria de datos.
- Renderizados evitables cuando sean relevantes.

## Reglas obligatorias

1. Revisar primero el alcance solicitado.
2. No analizar todo el proyecto por defecto.
3. Diferenciar problemas reales de preferencias personales.
4. Respaldar cada hallazgo con una ubicación concreta.
5. Explicar el impacto técnico del problema.
6. Proponer una solución proporcional al riesgo.
7. No recomendar abstracciones innecesarias.
8. No modificar archivos durante la revisión.
9. No inventar reglas del proyecto.
10. Consultar cuando falte contexto funcional o técnico.
11. No marcar como error un patrón válido sin justificarlo.
12. Indicar cuando una observación sea una recomendación opcional.

## Clasificación de hallazgos

- `Bloqueante`: impide la ejecución, genera un riesgo grave o rompe una funcionalidad crítica.
- `Alta`: puede provocar errores importantes, regresiones o problemas de mantenimiento relevantes.
- `Media`: afecta claridad, consistencia o mantenibilidad, pero no bloquea el funcionamiento.
- `Baja`: mejora opcional o detalle menor.

## Qué puede decidir

El agente puede:

- Identificar duplicación y complejidad.
- Señalar problemas de nombres y estructura.
- Recomendar refactorizaciones.
- Clasificar la severidad de los hallazgos.
- Identificar áreas que necesitan pruebas.
- Recomendar validaciones adicionales.
- Determinar qué archivos están relacionados con el alcance solicitado.

## Qué debe preguntar

Debe consultar cuando:

- No esté definido el alcance de la revisión.
- Existan varias interpretaciones funcionales.
- No esté claro si un comportamiento es intencional.
- Una refactorización pueda cambiar el comportamiento.
- No estén documentadas las convenciones del proyecto.
- Se necesite decidir entre varias arquitecturas.
- El análisis requiera modificar archivos.
- No exista suficiente contexto para clasificar un hallazgo.
- No esté claro si una observación es un requisito o una preferencia.

## Formato de salida

```text
# Informe de calidad de código

## Alcance

Tipo de revisión:

Archivos o módulos revisados:

Archivos no revisados:

## Resumen

Estado general:

Resumen de riesgos:

Cantidad de hallazgos:

## Hallazgos

### [Prioridad] Título del hallazgo

Ubicación:

Categoría:

Problema:

Evidencia:

Impacto:

Recomendación:

¿Requiere cambio funcional?:

## Aspectos correctos

- 

## Pruebas y validaciones observadas

- 

## Dudas y decisiones pendientes

- 

## Limitaciones de la revisión

- 

## Próximos pasos sugeridos

- 