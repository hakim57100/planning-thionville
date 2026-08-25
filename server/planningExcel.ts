import * as XLSX from "xlsx";

export type ParsedExcelShift = {
  sourceEmployeeAlias: string;
  normalizedEmployeeName: string;
  serviceDate: string;
  startsAt: string;
  endsAt: string;
  position: "Service du midi" | "Service du soir";
};

export type ParsedExcelPlanning = {
  weekStart: string;
  shifts: ParsedExcelShift[];
};

type DayBlock = {
  offset: number;
  lunchStart: string;
  lunchEnd: string;
  eveningStart: string;
  eveningEnd: string;
};

// Colonnes du modèle horizontal planningsemaine34.xlsx.
const DAY_BLOCKS: DayBlock[] = [
  { offset: 0, lunchStart: "F", lunchEnd: "G", eveningStart: "H", eveningEnd: "I" },
  { offset: 1, lunchStart: "N", lunchEnd: "O", eveningStart: "P", eveningEnd: "Q" },
  { offset: 2, lunchStart: "V", lunchEnd: "W", eveningStart: "X", eveningEnd: "Y" },
  { offset: 3, lunchStart: "AD", lunchEnd: "AE", eveningStart: "AF", eveningEnd: "AG" },
  { offset: 4, lunchStart: "AL", lunchEnd: "AM", eveningStart: "AN", eveningEnd: "AO" },
  { offset: 5, lunchStart: "AT", lunchEnd: "AU", eveningStart: "AV", eveningEnd: "AW" },
  { offset: 6, lunchStart: "BB", lunchEnd: "BC", eveningStart: "BD", eveningEnd: "BE" },
];

const SUMMARY_LABELS = new Set(["EMPLOYES TOTAL", "HEURES", "LABOR €", "NOTES"]);

export function normalizeEmployeeName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleUpperCase("fr-FR");
}

function getCellValue(sheet: XLSX.WorkSheet, address: string): unknown {
  return sheet[address]?.v;
}

function getIsoDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate())).toISOString().slice(0, 10);
  }
  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  }
  throw new Error("La date de début de semaine attendue en AU1 est absente ou invalide.");
}

function getTime(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  }
  if (typeof value === "number" && value >= 0 && value < 1) {
    const minutes = Math.round(value * 24 * 60) % (24 * 60);
    return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  }
  if (typeof value === "string") {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (match && Number(match[1]) < 24 && Number(match[2]) < 60) {
      return `${String(Number(match[1])).padStart(2, "0")}:${match[2]}`;
    }
  }
  throw new Error(`Horaire Excel non reconnu : ${String(value)}`);
}

function addDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function appendShift(
  sheet: XLSX.WorkSheet,
  row: number,
  sourceEmployeeAlias: string,
  serviceDate: string,
  startColumn: string,
  endColumn: string,
  position: ParsedExcelShift["position"],
  output: ParsedExcelShift[],
) {
  const startsAt = getTime(getCellValue(sheet, `${startColumn}${row}`));
  const endsAt = getTime(getCellValue(sheet, `${endColumn}${row}`));
  if (startsAt === null && endsAt === null) return;
  if (startsAt === null || endsAt === null) {
    throw new Error(`Créneau incomplet pour ${sourceEmployeeAlias}, ligne ${row}, colonnes ${startColumn}/${endColumn}.`);
  }
  if (endsAt <= startsAt) {
    throw new Error(`Créneau traversant minuit non pris en charge : ${sourceEmployeeAlias}, ${serviceDate}, ${startsAt}-${endsAt}.`);
  }
  output.push({
    sourceEmployeeAlias,
    normalizedEmployeeName: normalizeEmployeeName(sourceEmployeeAlias),
    serviceDate,
    startsAt,
    endsAt,
    position,
  });
}

export function parsePlanningExcel(file: Buffer): ParsedExcelPlanning {
  const workbook = XLSX.read(file, { type: "buffer", cellDates: true, raw: true });
  const sheet = workbook.Sheets["Semaine 1"] ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("Le classeur ne contient aucune feuille exploitable.");

  const weekStart = getIsoDate(getCellValue(sheet, "AU1"));
  const shifts: ParsedExcelShift[] = [];

  for (let row = 3; row <= 200; row += 1) {
    const rawName = getCellValue(sheet, `C${row}`);
    if (typeof rawName !== "string" || !rawName.trim()) continue;

    const sourceEmployeeAlias = rawName.trim();
    if (SUMMARY_LABELS.has(normalizeEmployeeName(sourceEmployeeAlias))) break;

    for (const day of DAY_BLOCKS) {
      const serviceDate = addDays(weekStart, day.offset);
      appendShift(sheet, row, sourceEmployeeAlias, serviceDate, day.lunchStart, day.lunchEnd, "Service du midi", shifts);
      appendShift(sheet, row, sourceEmployeeAlias, serviceDate, day.eveningStart, day.eveningEnd, "Service du soir", shifts);
    }
  }

  if (!shifts.length) throw new Error("Aucun créneau n’a été trouvé dans le fichier Excel.");
  return { weekStart, shifts };
}
