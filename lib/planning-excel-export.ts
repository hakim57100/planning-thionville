import * as XLSX from "xlsx";
import type { ExportMember, ExportShift } from "@/lib/planning-export-template";

export type ExcelExportPayload = { weekStart: string; shifts: ExportShift[]; members: ExportMember[]; scopeLabel: string };

type ExcelRow = Array<string | number | null>;
type ExcelAssignment = { staffMemberId: number; startsAt: string; endsAt: string };

const DAY_BLOCKS = [
  { label: "Lundi", offset: 0, lunchStart: "F", lunchEnd: "G", eveningStart: "H", eveningEnd: "I" },
  { label: "Mardi", offset: 1, lunchStart: "N", lunchEnd: "O", eveningStart: "P", eveningEnd: "Q" },
  { label: "Mercredi", offset: 2, lunchStart: "V", lunchEnd: "W", eveningStart: "X", eveningEnd: "Y" },
  { label: "Jeudi", offset: 3, lunchStart: "AD", lunchEnd: "AE", eveningStart: "AF", eveningEnd: "AG" },
  { label: "Vendredi", offset: 4, lunchStart: "AL", lunchEnd: "AM", eveningStart: "AN", eveningEnd: "AO" },
  { label: "Samedi", offset: 5, lunchStart: "AT", lunchEnd: "AU", eveningStart: "AV", eveningEnd: "AW" },
  { label: "Dimanche", offset: 6, lunchStart: "BB", lunchEnd: "BC", eveningStart: "BD", eveningEnd: "BE" },
] as const;

function addDays(isoDate: string, offset: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + offset));
  return date.toISOString().slice(0, 10);
}

function frenchDay(isoDate: string) {
  return new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T12:00:00Z`));
}

function excelTime(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return (hours * 60 + minutes) / (24 * 60);
}

function isLunchShift(shift: ExportShift) {
  return shift.position.toLocaleLowerCase("fr-FR").includes("midi") || shift.startsAt < "16:00";
}

function assignmentFor(shift: ExportShift, staffMemberId: number): ExcelAssignment | null {
  if (!shift.memberIds.includes(staffMemberId)) return null;
  const specific = shift.assignmentTimes?.find((assignment) => assignment.staffMemberId === staffMemberId);
  return { staffMemberId, startsAt: specific?.startsAt ?? shift.startsAt, endsAt: specific?.endsAt ?? shift.endsAt };
}

function elapsedHours(startsAt: string, endsAt: string) {
  const [startHours, startMinutes] = startsAt.split(":").map(Number);
  const [endHours, endMinutes] = endsAt.split(":").map(Number);
  return Math.max(0, (endHours * 60 + endMinutes - startHours * 60 - startMinutes) / 60);
}

function setTimeCell(sheet: XLSX.WorkSheet, cell: string, time: string | undefined) {
  if (!time) return;
  sheet[cell] = { t: "n", v: excelTime(time), z: "hh:mm" };
}

function setCell(sheet: XLSX.WorkSheet, cell: string, value: string | number) {
  sheet[cell] = { t: typeof value === "number" ? "n" : "s", v: value };
}

/** Première feuille : structure horizontale compatible avec le fichier historique. */
function buildImportCompatibleSheet(payload: ExcelExportPayload) {
  const sheet = XLSX.utils.aoa_to_sheet([]);
  setCell(sheet, "A1", "PLANNING THIONVILLE");
  setCell(sheet, "C1", `${payload.scopeLabel} · Semaine du ${payload.weekStart}`);
  // L’import existant lit la date de lundi dans AU1.
  sheet.AU1 = { t: "n", v: Date.parse(`${payload.weekStart}T00:00:00Z`) / 86400000 + 25569, z: "yyyy-mm-dd" };
  setCell(sheet, "C2", "Employé");

  for (const day of DAY_BLOCKS) {
    const date = addDays(payload.weekStart, day.offset);
    setCell(sheet, `${day.lunchStart}1`, `${day.label} ${date.slice(8, 10)}/${date.slice(5, 7)}`);
    setCell(sheet, `${day.lunchStart}2`, "Midi · début");
    setCell(sheet, `${day.lunchEnd}2`, "Midi · fin");
    setCell(sheet, `${day.eveningStart}2`, "Soir · début");
    setCell(sheet, `${day.eveningEnd}2`, "Soir · fin");
  }

  payload.members.forEach((member, memberIndex) => {
    const row = memberIndex + 3;
    setCell(sheet, `C${row}`, member.name);
    for (const day of DAY_BLOCKS) {
      const serviceDate = addDays(payload.weekStart, day.offset);
      const dayShifts = payload.shifts.filter((shift) => shift.serviceDate === serviceDate).sort((left, right) => left.startsAt.localeCompare(right.startsAt));
      const lunch = dayShifts.find((shift) => isLunchShift(shift) && assignmentFor(shift, member.id));
      const evening = dayShifts.find((shift) => !isLunchShift(shift) && assignmentFor(shift, member.id));
      const lunchAssignment = lunch ? assignmentFor(lunch, member.id) : null;
      const eveningAssignment = evening ? assignmentFor(evening, member.id) : null;
      setTimeCell(sheet, `${day.lunchStart}${row}`, lunchAssignment?.startsAt);
      setTimeCell(sheet, `${day.lunchEnd}${row}`, lunchAssignment?.endsAt);
      setTimeCell(sheet, `${day.eveningStart}${row}`, eveningAssignment?.startsAt);
      setTimeCell(sheet, `${day.eveningEnd}${row}`, eveningAssignment?.endsAt);
    }
  });

  sheet["!ref"] = `A1:BE${Math.max(3, payload.members.length + 2)}`;
  sheet["!merges"] = DAY_BLOCKS.map((day) => ({ s: XLSX.utils.decode_cell(`${day.lunchStart}1`), e: XLSX.utils.decode_cell(`${day.eveningEnd}1`) }));
  sheet["!cols"] = Array.from({ length: 57 }, (_, index) => ({ wch: index === 2 ? 24 : 12 }));
  sheet["!rows"] = [{ hpt: 26 }, { hpt: 32 }];
  sheet["!autofilter"] = { ref: `C2:BE${Math.max(3, payload.members.length + 2)}` };
  sheet["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
  return sheet;
}

/** Deuxième feuille : vue exhaustive, y compris les cases non affectées et les notes. */
function buildServiceDetailSheet(payload: ExcelExportPayload) {
  const rows: ExcelRow[] = [["Date", "Jour", "Service", "Horaire du service", "Cases requises", "Case", "Salarié", "Horaire individuel", "Poste", "Note", "Statut"]];
  const memberById = new Map(payload.members.map((member) => [member.id, member]));
  const orderedShifts = [...payload.shifts].sort((left, right) => `${left.serviceDate}-${left.startsAt}`.localeCompare(`${right.serviceDate}-${right.startsAt}`));

  orderedShifts.forEach((shift) => {
    const requiredStaff = Math.max(1, shift.requiredStaff ?? (shift.memberIds.length || 1));
    const slotCount = Math.max(requiredStaff, shift.memberIds.length);
    for (let index = 0; index < slotCount; index += 1) {
      const staffMemberId = shift.memberIds[index];
      const member = staffMemberId ? memberById.get(staffMemberId) : null;
      const assignment = staffMemberId ? assignmentFor(shift, staffMemberId) : null;
      rows.push([
        shift.serviceDate,
        frenchDay(shift.serviceDate),
        shift.position,
        `${shift.startsAt} — ${shift.endsAt}`,
        requiredStaff,
        index + 1,
        member?.name ?? "À affecter",
        assignment ? `${assignment.startsAt} — ${assignment.endsAt}` : "—",
        member?.jobTitle ?? "—",
        shift.note ?? "",
        member?.active === false ? "Profil inactif" : staffMemberId ? "Affecté" : "Case libre",
      ]);
    }
  });

  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 13 }, { wch: 13 }, { wch: 22 }, { wch: 19 }, { wch: 15 }, { wch: 8 }, { wch: 24 }, { wch: 20 }, { wch: 22 }, { wch: 42 }, { wch: 15 }];
  sheet["!rows"] = [{ hpt: 28 }];
  sheet["!autofilter"] = { ref: `A1:K${Math.max(2, rows.length)}` };
  sheet["!pageSetup"] = { orientation: "landscape", fitToWidth: 1, fitToHeight: 0 };
  return sheet;
}

function buildSummarySheet(payload: ExcelExportPayload) {
  const rows: ExcelRow[] = [["SYNTHÈSE DU PLANNING", null, null, null], ["Semaine du", payload.weekStart, null, null], [], ["Salarié", "Fonction", "Services", "Heures planifiées"]];
  payload.members.forEach((member) => {
    const assignments = payload.shifts.flatMap((shift) => {
      const assignment = assignmentFor(shift, member.id);
      return assignment ? [assignment] : [];
    });
    const totalHours = assignments.reduce((total, assignment) => total + elapsedHours(assignment.startsAt, assignment.endsAt), 0);
    rows.push([member.name, member.jobTitle, assignments.length, Math.round(totalHours * 100) / 100]);
  });
  rows.push([], ["Total des services", "", payload.shifts.length, null]);
  const sheet = XLSX.utils.aoa_to_sheet(rows);
  sheet["!cols"] = [{ wch: 28 }, { wch: 24 }, { wch: 13 }, { wch: 20 }];
  sheet["!rows"] = [{ hpt: 28 }, { hpt: 22 }, { hpt: 10 }, { hpt: 24 }];
  sheet["!autofilter"] = { ref: `A4:D${Math.max(5, payload.members.length + 4)}` };
  sheet["!pageSetup"] = { orientation: "portrait", fitToWidth: 1, fitToHeight: 0 };
  return sheet;
}

export function buildPlanningWorkbook(payload: ExcelExportPayload) {
  const workbook = XLSX.utils.book_new();
  workbook.Props = { Title: `Planning Thionville · ${payload.weekStart}`, Subject: payload.scopeLabel, Author: "Planning Thionville", CreatedDate: new Date() };
  XLSX.utils.book_append_sheet(workbook, buildImportCompatibleSheet(payload), "Semaine 1");
  XLSX.utils.book_append_sheet(workbook, buildServiceDetailSheet(payload), "Détail des services");
  XLSX.utils.book_append_sheet(workbook, buildSummarySheet(payload), "Synthèse");
  return workbook;
}
