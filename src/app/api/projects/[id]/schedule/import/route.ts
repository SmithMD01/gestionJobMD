import * as XLSX from "xlsx";
import { z } from "zod";
import { authorizeProjectRequest } from "@/modules/projects/authorization";
import { projectInCompany } from "@/modules/projects/access";

type Context = { params: Promise<{ id: string }> };
type ErrorCategory = "Formato" | "Valores";
type ImportError = { row?: number; field?: string; category: ErrorCategory; message: string };

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 500;
const requiredHeaders = ["tipo", "etapa o actividad"];
const headerAliases: Record<string, string> = {
  orden: "orden",
  tipo: "tipo",
  "tipo de fila": "tipo",
  "etapa o actividad": "title",
  nombre: "title",
  actividad: "title",
  estado: "status",
  inicio: "startDate",
  "fecha de inicio": "startDate",
  fin: "endDate",
  "fecha de fin": "endDate",
  color: "color",
  descripcion: "description",
};

const typeMap: Record<string, "phase" | "activity"> = { fase: "phase", phase: "phase", actividad: "activity", activity: "activity" };
const statusMap: Record<string, "planned" | "in_progress" | "completed"> = {
  pendiente: "planned",
  planned: "planned",
  "en desarrollo": "in_progress",
  "en progreso": "in_progress",
  in_progress: "in_progress",
  "in progress": "in_progress",
  completada: "completed",
  completado: "completed",
  completed: "completed",
};
const colorMap: Record<string, "slate" | "blue" | "violet" | "amber" | "green" | "rose"> = {
  gris: "slate",
  slate: "slate",
  azul: "blue",
  blue: "blue",
  violeta: "violet",
  violet: "violet",
  ámbar: "amber",
  ambar: "amber",
  amber: "amber",
  verde: "green",
  green: "green",
  rojo: "rose",
  rose: "rose",
};

const importedItem = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(2000),
  kind: z.enum(["phase", "activity"]),
  color: z.enum(["slate", "blue", "violet", "amber", "green", "rose"]),
  status: z.enum(["planned", "in_progress", "completed"]),
  startDate: z.iso.date().nullable(),
  endDate: z.iso.date().nullable(),
});

function normalize(value: unknown) {
  return String(value ?? "").trim().toLocaleLowerCase("es-PE").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
}

function formatDate(year: number, month: number, day: number) {
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

function parseDate(value: unknown) {
  if (value === null || value === undefined || String(value).trim() === "") return { value: null as string | null };
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return { error: "La fecha no es válida." };
    return { value: formatDate(value.getFullYear(), value.getMonth() + 1, value.getDate()) };
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return { error: "Usa una fecha de Excel o el formato AAAA-MM-DD." };
    return { value: formatDate(parsed.y, parsed.m, parsed.d) };
  }
  const text = String(value).trim();
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (iso) return { value: formatDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ?? undefined, error: formatDate(Number(iso[1]), Number(iso[2]), Number(iso[3])) ? undefined : "La fecha no es válida." };
  const latin = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (latin) return { value: formatDate(Number(latin[3]), Number(latin[2]), Number(latin[1])) ?? undefined, error: formatDate(Number(latin[3]), Number(latin[2]), Number(latin[1])) ? undefined : "La fecha no es válida." };
  return { error: "Usa una fecha de Excel o el formato AAAA-MM-DD." };
}

function getCell(row: unknown[], indexes: Record<string, number>, field: string) {
  const index = indexes[field];
  return index === undefined ? "" : row[index];
}

async function authorize(request: Request, context: Context) {
  const access = await authorizeProjectRequest(request);
  if (access.response) return { access };
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success || !await projectInCompany(id, access.company!.id)) {
    return { access, error: Response.json({ error: "Proyecto no encontrado" }, { status: 404 }) };
  }
  return { access, id };
}

export async function POST(request: Request, context: Context) {
  const result = await authorize(request, context);
  if (result.error) return result.error;
  if (!result.id) return result.access.response;

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  const errors: ImportError[] = [];
  if (!(file instanceof File)) return Response.json({ valid: false, errors: [{ category: "Formato", message: "Adjunta un archivo Excel para continuar." }] }, { status: 400 });
  if (file.size === 0) errors.push({ category: "Formato", message: "El archivo está vacío." });
  if (file.size > MAX_FILE_SIZE) errors.push({ category: "Formato", message: "El archivo supera el límite de 5 MB." });
  if (!/\.(xlsx|xls)$/i.test(file.name)) errors.push({ category: "Formato", message: "El archivo debe tener extensión .xlsx o .xls." });
  if (errors.length) return Response.json({ valid: false, errors }, { status: 400 });

  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true, raw: true });
    const sheetName = workbook.SheetNames.find((name) => normalize(name) === "cronograma") ?? workbook.SheetNames[0];
    if (!sheetName) return Response.json({ valid: false, errors: [{ category: "Formato", message: "El libro no contiene hojas de cálculo." }] }, { status: 400 });
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "", blankrows: false });
    const headerRow = rows[0] ?? [];
    if (!headerRow.length || headerRow.every((cell) => normalize(cell) === "")) errors.push({ category: "Formato", message: "La primera fila de la hoja debe contener los encabezados del cronograma." });

    const indexes: Record<string, number> = {};
    const seen = new Set<string>();
    headerRow.forEach((cell, index) => {
      const normalized = normalize(cell);
      if (normalized && !headerAliases[normalized]) errors.push({ category: "Formato", field: String(cell), message: "El encabezado no pertenece a la plantilla del cronograma." });
      const mapped = headerAliases[normalized];
      if (!mapped) return;
      if (seen.has(mapped)) errors.push({ category: "Formato", field: String(cell), message: "El encabezado está repetido." });
      seen.add(mapped);
      indexes[mapped] = index;
    });
    for (const required of requiredHeaders) if (!headerAliases[required] || indexes[headerAliases[required]] === undefined) errors.push({ category: "Formato", field: required, message: "Falta este encabezado obligatorio." });
    const dataRows = rows.slice(1).filter((row) => row.some((cell) => normalize(cell) !== ""));
    if (!dataRows.length && errors.length === 0) errors.push({ category: "Formato", message: "No hay filas con datos para importar." });
    if (dataRows.length > MAX_ROWS) errors.push({ category: "Formato", message: `El archivo contiene ${dataRows.length} filas. El máximo permitido es ${MAX_ROWS}.` });

    const items: Array<z.infer<typeof importedItem>> = [];
    for (const [index, row] of dataRows.entries()) {
      const rowNumber = index + 2;
      const rawTitle = String(getCell(row, indexes, "title") ?? "").trim();
      const rawKind = normalize(getCell(row, indexes, "tipo"));
      const rawStatus = normalize(getCell(row, indexes, "status"));
      const rawColor = normalize(getCell(row, indexes, "color"));
      const rawOrder = getCell(row, indexes, "orden");
      const description = String(getCell(row, indexes, "description") ?? "").trim();
      if (rawOrder !== "" && (!Number.isInteger(Number(rawOrder)) || Number(rawOrder) < 1)) errors.push({ row: rowNumber, field: "Orden", category: "Valores", message: "El orden debe ser un número entero positivo." });
      if (!rawTitle) errors.push({ row: rowNumber, field: "Etapa o actividad", category: "Valores", message: "El nombre es obligatorio." });
      if (rawTitle.length > 180) errors.push({ row: rowNumber, field: "Etapa o actividad", category: "Valores", message: "El nombre no puede superar 180 caracteres." });
      if (!typeMap[rawKind]) errors.push({ row: rowNumber, field: "Tipo", category: "Valores", message: "Usa Fase o Actividad." });
      if (rawStatus && !statusMap[rawStatus]) errors.push({ row: rowNumber, field: "Estado", category: "Valores", message: "Usa Pendiente, En desarrollo o Completada." });
      if (rawColor && !colorMap[rawColor]) errors.push({ row: rowNumber, field: "Color", category: "Valores", message: "Usa Gris, Azul, Violeta, Ámbar, Verde o Rojo." });
      if (description.length > 2000) errors.push({ row: rowNumber, field: "Descripción", category: "Valores", message: "La descripción no puede superar 2000 caracteres." });
      const start = parseDate(getCell(row, indexes, "startDate"));
      const end = parseDate(getCell(row, indexes, "endDate"));
      if (start.error) errors.push({ row: rowNumber, field: "Inicio", category: "Valores", message: start.error });
      if (end.error) errors.push({ row: rowNumber, field: "Fin", category: "Valores", message: end.error });
      if (start.value && end.value && end.value < start.value) errors.push({ row: rowNumber, field: "Fin", category: "Valores", message: "La fecha final debe ser igual o posterior a la fecha inicial." });
      const item = importedItem.safeParse({ title: rawTitle, description, kind: typeMap[rawKind] ?? "activity", color: colorMap[rawColor] ?? "blue", status: statusMap[rawStatus] ?? "planned", startDate: start.value ?? null, endDate: end.value ?? null });
      if (item.success && !start.error && !end.error && rawTitle && typeMap[rawKind]) items.push(item.data);
    }
    const valid = errors.length === 0;
    return Response.json({ valid, items: valid ? items : [], errors, summary: { rows: dataRows.length, validRows: items.length, sheet: sheetName } }, { status: valid ? 200 : 400 });
  } catch {
    return Response.json({ valid: false, errors: [{ category: "Formato", message: "No se pudo leer el libro. Verifica que sea un Excel válido y que no esté dañado." }] }, { status: 400 });
  }
}
