type ChangeValue = string | number | boolean | null | undefined;

function formatValue(value: ChangeValue) {
  if (value === null || value === undefined || value === "") return "vacío";
  if (typeof value === "boolean") return value ? "sí" : "no";
  return String(value);
}

export function createdDetail(entity: string, name: string) {
  return `Se creó ${entity} “${name}”.`;
}

export function deletedDetail(entity: string, name: string) {
  return `Se eliminó ${entity} “${name}”.`;
}

export function updatedDetail(entity: string, changes: Array<{ label: string; before: ChangeValue; after: ChangeValue }>) {
  if (changes.length === 0) return `Se actualizó ${entity}.`;
  const detail = changes.map(({ label, before, after }) => `${label}: ${formatValue(before)} → ${formatValue(after)}`).join("; ");
  return `Se actualizó ${entity}. ${detail}`;
}
