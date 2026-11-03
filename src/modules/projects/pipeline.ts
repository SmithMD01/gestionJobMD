export const DEVELOPMENT_STAGE_COLORS = ["blue", "violet", "amber", "green", "neutral"] as const;
export type DevelopmentStageColor = (typeof DEVELOPMENT_STAGE_COLORS)[number];

export const DEFAULT_DEVELOPMENT_STAGES = [
  { name: "Inicio", color: "blue", sortOrder: 0, isTerminal: false, isCancelled: false },
  { name: "Desarrollo", color: "violet", sortOrder: 1, isTerminal: false, isCancelled: false },
  { name: "Pruebas QA", color: "amber", sortOrder: 2, isTerminal: false, isCancelled: false },
  { name: "Finalizado", color: "green", sortOrder: 3, isTerminal: true, isCancelled: false },
  { name: "Canceladas", color: "neutral", sortOrder: 4, isTerminal: false, isCancelled: true },
] as const;
