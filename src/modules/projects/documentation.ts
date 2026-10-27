
export const documentationGroups = [
  {
    id: "functional",
    label: "Documentación funcional",
    types: [
      ["srs", "SRS / Especificación de requisitos"],
      ["scope", "Objetivo y alcance"],
      ["flows", "Flujos funcionales"],
      ["use_cases", "Casos de uso"],
      ["user_stories", "Historias de usuario"],
      ["business_rules", "Reglas de negocio"],
      ["acceptance_criteria", "Criterios de aceptación"],
    ],
  },
  {
    id: "technical",
    label: "Documentación técnica",
    types: [
      ["architecture", "Arquitectura del sistema"],
      ["structure", "Estructura técnica del proyecto"],
      ["data_model", "Modelo de base de datos"],
      ["api", "Documentación de API"],
      ["integrations", "Integraciones externas"],
      ["technical_decisions", "Decisiones técnicas"],
      ["development_guide", "Guía técnica de desarrollo"],
    ],
  },
  {
    id: "operations",
    label: "Manuales y operación",
    types: [
      ["user_manual", "Manual de usuario"],
      ["installation", "Guía de instalación"],
      ["deployment", "Manual de despliegue"],
      ["maintenance", "Guía de mantenimiento"],
      ["troubleshooting", "Guía de solución de problemas"],
    ],
  },
] as const;

export const documentationStatuses = ["draft", "in_review", "approved", "archived"] as const;
export type DocumentationStatus = (typeof documentationStatuses)[number];

export function documentationGroup(groupId: string) {
  return documentationGroups.find((group) => group.id === groupId);
}

export function documentationType(groupId: string, typeId: string) {
  return documentationGroup(groupId)?.types.find(([id]) => id === typeId);
}

export const documentationStatusLabels: Record<DocumentationStatus, string> = {
  draft: "Borrador",
  in_review: "En revisión",
  approved: "Aprobada",
  archived: "Archivada",
};
