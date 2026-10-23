# Instrucciones generales para los agentes

## Uso de skills

- Revisar las skills disponibles antes de realizar una tarea especializada.
- Aplicar las skills relevantes y mencionar cuáles fueron utilizadas.
- Reutilizar definiciones, componentes, plantillas y criterios existentes antes de crear alternativas.

## Organización de las skills

- Las skills generales contienen reglas amplias y sirven como referencia.
- Las skills especializadas deben ser autosuficientes para ejecutar su tarea concreta.
- Una skill especializada puede resumir las reglas que necesita de otras skills, sin copiar su contenido completo.
- No asumir que el agente cargará automáticamente todas las skills relacionadas.
- Mantener una única fuente detallada para cada tema: diseño visual, reutilización, tablas, botones, modales, etc.

## QA funcional web

- Cuando el usuario pida ejecutar o retomar QA funcional web en un chat local de OptiTrabajo, leer `.agents/agents/qa-regression/AGENT.md` antes de navegar o modificar el libro. Ese agente define las entradas, el alcance y la skill obligatoria; no inferirlos de tareas programadas ni del README de Drive.

## Gestión de dudas

Si existe una duda que pueda afectar el alcance, los requisitos, la lógica de negocio, la arquitectura, la seguridad, el diseño o la estructura de datos, el agente debe detener la decisión o el trabajo afectado y consultar al usuario. En QA, aplicar la gestión por caso y dependencias definida en el agente; detener todo el ciclo solo si la duda afecta el acceso, el entorno, la seguridad o el alcance global.

No se deben inventar reglas ni asumir silenciosamente una decisión importante.

Toda duda relevante debe indicar:

1. Qué información falta.
2. Por qué es importante.
3. Qué alternativas existen.
4. Qué decisión se necesita del usuario.

## Entrega

Toda respuesta debe incluir, cuando corresponda:

- Trabajo realizado.
- Skills utilizadas.
- Validaciones ejecutadas.
- Dudas o decisiones pendientes.
- Limitaciones conocidas.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
