export type ChecklistItem = { text: string; done: boolean };

export function parseChecklist(value: string | null | undefined): ChecklistItem[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item): item is { text: unknown; done?: unknown } => typeof item === "object" && item !== null && "text" in item)
        .map((item) => ({ text: String(item.text).trim(), done: item.done === true }))
        .filter((item) => item.text.length > 0);
    }
  } catch {
    // Older activities stored one checklist item per line.
  }
  return value.split("\n").map((text) => ({ text: text.trim(), done: false })).filter((item) => item.text.length > 0);
}

export function serializeChecklist(items: ChecklistItem[]) {
  return JSON.stringify(items);
}
