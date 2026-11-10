export function normalizeCalendarDescription(value: string) {
  return value
    .replace(/\r\n?/g, "\n")
    .replace(/&nbsp;|&#160;|&#xA0;/gi, " ")
    .replace(/[\u00a0\u2007\u202f]/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
