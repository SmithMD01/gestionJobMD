export type ModulePermissionKey =
  | "home"
  | "projects"
  | "projects.information"
  | "projects.activities"
  | "projects.development"
  | "projects.configuration"
  | "projects.documentation"
  | "projects.qa"
  | "projects.schedule"
  | "projects.benchwork"
  | "activities"
  | "companies"
  | "users"
  | "roles"
  | "settings"
  | "settings.pipeline"
  | "settings.calendar-usage"
  | "audit"
  | "calendar"
  | "calendar.centralized";

export type ModuleCatalogEntry = {
  key: ModulePermissionKey;
  label: string;
  description: string;
  group: "principal" | "projects" | "administration" | "control";
  parentKey?: ModulePermissionKey;
  href?: string;
  icon: string;
  requiredForAdmin?: boolean;
  adminOnly?: boolean;
};

/**
 * Single source of truth for module and project-view permissions.
 * The database stores only these keys; labels and navigation metadata stay in code.
 */
export const MODULE_CATALOG: readonly ModuleCatalogEntry[] = [
  { key: "home", label: "Inicio", description: "Página principal del espacio de trabajo.", group: "principal", href: "/dashboard", icon: "home" },
  { key: "projects", label: "Proyectos", description: "Listado y acceso a los proyectos de la empresa.", group: "principal", href: "/projects", icon: "projects" },
  { key: "projects.information", label: "Información del proyecto", description: "Objetivo, descripción, datos y seguimiento del proyecto.", group: "projects", parentKey: "projects", icon: "info" },
  { key: "projects.activities", label: "Actividades del proyecto", description: "Actividades generales asociadas a un proyecto.", group: "projects", parentKey: "projects", icon: "activity" },
  { key: "projects.development", label: "Desarrollo", description: "Actividades de desarrollo organizadas por etapas y módulos.", group: "projects", parentKey: "projects", icon: "development" },
  { key: "projects.configuration", label: "Configuración del proyecto", description: "Contactos, módulos y parámetros propios del proyecto.", group: "projects", parentKey: "projects", icon: "settings" },
  { key: "projects.documentation", label: "Documentación", description: "Documentos funcionales, técnicos y sus versiones.", group: "projects", parentKey: "projects", icon: "documentation" },
  { key: "projects.qa", label: "Pruebas QA", description: "Casos y seguimiento de pruebas de calidad.", group: "projects", parentKey: "projects", icon: "qa" },
  { key: "projects.schedule", label: "Cronograma", description: "Tabla y vista Gantt del cronograma del proyecto.", group: "projects", parentKey: "projects", icon: "schedule" },
  { key: "projects.benchwork", label: "Benchwork", description: "Espacio de documentación asistida y trabajo técnico.", group: "projects", parentKey: "projects", icon: "benchwork" },
  { key: "activities", label: "Actividades", description: "Vista centralizada de actividades de la empresa.", group: "principal", href: "/activities", icon: "activity" },
  { key: "companies", label: "Empresas", description: "Empresas y configuración de sus integrantes.", group: "administration", href: "/companies", icon: "companies" },
  { key: "users", label: "Usuarios", description: "Cuentas, estados y asignaciones de usuarios. Solo administradores.", group: "administration", href: "/users", icon: "users", requiredForAdmin: true, adminOnly: true },
  { key: "roles", label: "Roles", description: "Roles por empresa y permisos de acceso a módulos. Solo administradores.", group: "administration", href: "/roles", icon: "roles", requiredForAdmin: true, adminOnly: true },
  { key: "settings", label: "Configuración", description: "Parámetros configurables del sistema y de cada empresa.", group: "administration", href: "/settings", icon: "settings", requiredForAdmin: true },
  { key: "settings.pipeline", label: "Pipeline de desarrollo", description: "Configuración de etapas de desarrollo compartidas por los proyectos de la empresa.", group: "administration", parentKey: "settings", href: "/settings/pipeline", icon: "development" },
  { key: "settings.calendar-usage", label: "Consumo de calendario", description: "Seguimiento de sincronizaciones y solicitudes a proveedores de calendario. Solo administradores.", group: "administration", parentKey: "settings", href: "/calendar-monitor", icon: "calendar", requiredForAdmin: true, adminOnly: true },
  { key: "audit", label: "Auditoría", description: "Historial de cambios y operaciones relevantes.", group: "control", href: "/audit", icon: "audit" },
  { key: "calendar", label: "Calendario", description: "Calendario personal dentro de la empresa activa.", group: "principal", href: "/calendar", icon: "calendar" },
  { key: "calendar.centralized", label: "Calendario centralizado", description: "Vista consolidada de los calendarios propios del usuario.", group: "principal", parentKey: "calendar", icon: "calendar" },
] as const;

export const ADMIN_REQUIRED_MODULE_KEYS = MODULE_CATALOG
  .filter((entry) => entry.requiredForAdmin)
  .map((entry) => entry.key);

export const MODULE_CATALOG_BY_KEY = Object.fromEntries(
  MODULE_CATALOG.map((entry) => [entry.key, entry]),
) as Record<ModulePermissionKey, ModuleCatalogEntry>;

export function normalizeModuleKeys(keys: Iterable<string>) {
  const selected = new Set<ModulePermissionKey>();
  for (const key of keys) {
    if (key in MODULE_CATALOG_BY_KEY) selected.add(key as ModulePermissionKey);
  }
  for (const entry of MODULE_CATALOG) {
    if (entry.parentKey && !selected.has(entry.parentKey)) selected.delete(entry.key);
  }
  return [...selected];
}

export function moduleCatalogByGroup() {
  return MODULE_CATALOG.reduce<Record<ModuleCatalogEntry["group"], ModuleCatalogEntry[]>>((groups, entry) => {
    groups[entry.group].push(entry);
    return groups;
  }, { principal: [], projects: [], administration: [], control: [] });
}
