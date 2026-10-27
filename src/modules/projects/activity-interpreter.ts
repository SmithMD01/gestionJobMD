import type { ChecklistItem } from "./checklist";

export type ActivityInterpreterMember = { id: string; name: string };
export type ActivityInterpreterStage = { id: string; name: string };
export type ActivityInterpreterModule = { id: string; name: string };

export type ActivityInterpretation = {
  title?: string;
  description?: string;
  activityDate?: string;
  dueDate?: string;
  priority?: number;
  type?: "task" | "meeting" | "coordination" | "follow_up" | "development" | "other";
  status?: "to_validate" | "pending" | "in_progress" | "blocked" | "completed" | "cancelled";
  hours?: number;
  developmentStageId?: string;
  moduleId?: string;
  responsibleIds?: string[];
  checklistItems?: ChecklistItem[];
  matchedKeywords: string[];
  warnings: string[];
};

const numberWords: Record<string, number> = { uno: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5 };
const months: Record<string, number> = { enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12 };

function normalize(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-PE").trim();
}

function parseDate(value: string) {
  const normalized = normalize(value);
  const numeric = normalized.match(/\b(\d{1,2})\s*[\/-]\s*(\d{1,2})\s*[\/-]\s*(\d{4})\b/);
  const written = normalized.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)\s+de\s+(\d{4})\b/);
  const day = Number(numeric?.[1] ?? written?.[1]);
  const month = numeric ? Number(numeric[2]) : months[written?.[2] ?? ""];
  const year = Number(numeric?.[3] ?? written?.[3]);
  if (!day || !month || !year || month < 1 || month > 12) return undefined;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return undefined;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parsePriority(value: string) {
  const normalized = normalize(value);
  const explicit = normalized.match(/(?:^|\s)(?:p|pe|prioridad)\s*(?:numero\s*)?(1|2|3|4|5|uno|dos|tres|cuatro|cinco)(?:\b|$)/);
  if (explicit) return Number(explicit[1]) || numberWords[explicit[1]];
  if (normalized.includes("urgente")) return 5;
  if (normalized.includes("alta")) return 4;
  if (normalized.includes("media")) return 3;
  if (normalized.includes("baja")) return 1;
  return undefined;
}

function parseType(value: string): ActivityInterpretation["type"] {
  const normalized = normalize(value);
  if (normalized.includes("reun")) return "meeting";
  if (normalized.includes("coord")) return "coordination";
  if (normalized.includes("seguim")) return "follow_up";
  if (normalized.includes("desarroll")) return "development";
  if (normalized.includes("tarea")) return "task";
  if (normalized.includes("otro")) return "other";
  return undefined;
}

function parseStatus(value: string): ActivityInterpretation["status"] {
  const normalized = normalize(value);
  if (normalized.includes("validar")) return "to_validate";
  if (normalized.includes("progreso") || normalized.includes("curso")) return "in_progress";
  if (normalized.includes("bloque")) return "blocked";
  if (normalized.includes("complet") || normalized.includes("termin")) return "completed";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("pendient")) return "pending";
  return undefined;
}

function parseChecklist(value: string) {
  return value
    .replace(/(?:^|\s)(?:uno|dos|tres|cuatro|cinco|seis|\d+)\s*[:.)-]\s*/gi, "|")
    .split(/[,;]|\s+(?:y|e)\s+/i)
    .map((text) => text.trim())
    .filter(Boolean)
    .map((text) => ({ text, done: false }));
}

function parseResponsibleIds(value: string, members: ActivityInterpreterMember[], warnings: string[]) {
  const normalizedValue = normalize(value);
  const remaining = { value: normalizedValue };
  const responsibleIds: string[] = [];
  for (const member of [...members].sort((a, b) => normalize(b.name).length - normalize(a.name).length)) {
    const normalizedName = normalize(member.name);
    if (!normalizedName || !remaining.value.includes(normalizedName)) continue;
    responsibleIds.push(member.id);
    remaining.value = remaining.value.replace(normalizedName, " ");
  }
  const unknown = remaining.value.replace(/[,:;]|\b(?:y|e|con)\b/g, " ").replace(/\s+/g, " ").trim();
  if (!responsibleIds.length && value.trim()) warnings.push("No se encontró ningún responsable con ese nombre en la empresa activa.");
  else if (unknown) warnings.push(`No se encontró el responsable: ${unknown}.`);
  return responsibleIds;
}

export function interpretActivityText(text: string, options: { developmentOnly?: boolean; members?: ActivityInterpreterMember[]; stages?: ActivityInterpreterStage[]; modules?: ActivityInterpreterModule[] } = {}): ActivityInterpretation {
  const result: ActivityInterpretation = { matchedKeywords: [], warnings: [] };
  const markers = /\b(t[ií]tulo|fecha\s+de\s+actividad|fecha\s+l[ií]mite|prioridad|descripci[oó]n|responsables?|checklist|tipo|estado|horas?|etapa(?:\s+de\s+desarrollo)?|m[oó]dulo)\b/giu;
  const matches = [...text.matchAll(markers)];
  const sections = matches.map((match, index) => ({ key: normalize(match[1]).replace(/\s+/g, " "), value: text.slice((match.index ?? 0) + match[0].length, matches[index + 1]?.index ?? text.length).trim() }));
  for (const section of sections) {
    const value = section.value.replace(/^[:\-\s]+/, "").trim();
    if (!value) continue;
    if ((options.developmentOnly && (section.key === "tipo" || section.key === "estado")) || (!options.developmentOnly && (section.key.startsWith("etapa") || section.key === "modulo"))) continue;
    result.matchedKeywords.push(section.key);
    if (section.key === "titulo") result.title = value;
    else if (section.key === "fecha limite") result.dueDate = parseDate(value) ?? (result.warnings.push("No se pudo interpretar la fecha límite."), undefined);
    else if (section.key === "fecha de actividad") result.activityDate = parseDate(value) ?? (result.warnings.push("No se pudo interpretar la fecha de actividad."), undefined);
    else if (section.key === "prioridad") result.priority = parsePriority(value) ?? (result.warnings.push("No se pudo interpretar la prioridad. Usa P1 a P5."), undefined);
    else if (section.key === "descripcion") result.description = value;
    else if (section.key === "responsables" || section.key === "responsable") result.responsibleIds = parseResponsibleIds(value, options.members ?? [], result.warnings);
    else if (section.key === "checklist") result.checklistItems = parseChecklist(value);
    else if (section.key === "tipo" && !options.developmentOnly) result.type = parseType(value);
    else if (section.key === "estado" && !options.developmentOnly) result.status = parseStatus(value);
    else if (section.key === "horas") {
      const hours = Number(value.match(/\d+/)?.[0]);
      if (Number.isFinite(hours)) result.hours = hours;
      else result.warnings.push("No se pudieron interpretar las horas.");
    } else if (section.key.startsWith("etapa") && options.developmentOnly) {
      const normalizedValue = normalize(value);
      const stage = (options.stages ?? []).find((item) => normalizedValue.includes(normalize(item.name)));
      if (stage) result.developmentStageId = stage.id;
      else result.warnings.push("No se encontró esa etapa de desarrollo.");
    } else if (section.key === "modulo" && options.developmentOnly) {
      const normalizedValue = normalize(value);
      const moduleRecord = (options.modules ?? []).find((item) => normalizedValue.includes(normalize(item.name)));
      if (moduleRecord) result.moduleId = moduleRecord.id;
      else result.warnings.push("No se encontró ese módulo en el proyecto.");
    }
  }
  return result;
}
