import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { buildPlanningWorkbook } from "../lib/planning-excel-export";
import { parsePlanningExcel } from "../server/planningExcel";
import {
  assertTemplateTargetIsEmpty,
  createTemplateAssignmentSnapshot,
  createTemplateShiftSnapshot,
  materializeTemplateAssignment,
  materializeTemplateShift,
} from "../server/weekTemplateUtils";

const sourceShift = {
  serviceDate: "2026-09-02",
  startsAt: "17:30",
  endsAt: "22:15",
  position: "Service du soir",
  requiredStaff: 6,
  note: "Terrasse si la météo le permet",
};

describe("modèles de semaine", () => {
  it("enregistre le jour relatif, les cases et la note du service", () => {
    expect(createTemplateShiftSnapshot("2026-08-31", sourceShift)).toEqual({
      dayOffset: 2,
      startsAt: "17:30",
      endsAt: "22:15",
      position: "Service du soir",
      requiredStaff: 6,
      note: "Terrasse si la météo le permet",
    });
  });

  it("recompose les dates de la semaine cible sans changer les données du service", () => {
    const template = createTemplateShiftSnapshot("2026-08-31", sourceShift);
    expect(materializeTemplateShift("2026-09-14", template)).toEqual({
      serviceDate: "2026-09-16",
      startsAt: "17:30",
      endsAt: "22:15",
      position: "Service du soir",
      requiredStaff: 6,
      note: "Terrasse si la météo le permet",
    });
  });

  it("conserve les horaires propres à chaque salarié", () => {
    const saved = createTemplateAssignmentSnapshot({ staffMemberId: 7, startsAt: "18:00", endsAt: "22:15" }, sourceShift);
    expect(materializeTemplateAssignment(saved)).toEqual({ staffMemberId: 7, startsAt: "18:00", endsAt: "22:15" });
  });

  it("refuse toute application sur une semaine non vide ou publiée", () => {
    expect(() => assertTemplateTargetIsEmpty({ status: "draft", hasServices: true, weekStart: "2026-09-14" })).toThrow("contient déjà des services");
    expect(() => assertTemplateTargetIsEmpty({ status: "published", hasServices: false, weekStart: "2026-09-14" })).toThrow("déjà publiée");
    expect(() => assertTemplateTargetIsEmpty({ status: undefined, hasServices: false, weekStart: "2026-09-14" })).not.toThrow();
  });
});

describe("export Excel professionnel", () => {
  const payload = {
    weekStart: "2026-08-31",
    scopeLabel: "Planning de l’équipe",
    members: [
      { id: 1, name: "Camille Bernard", jobTitle: "Cheffe de rang", active: true },
      { id: 2, name: "Johan Martin", jobTitle: "Serveur", active: true },
    ],
    shifts: [
      {
        serviceDate: "2026-08-31",
        startsAt: "11:30",
        endsAt: "15:00",
        position: "Service du midi",
        requiredStaff: 4,
        note: "Brief à 11 h 15",
        memberIds: [1],
        assignmentTimes: [{ staffMemberId: 1, startsAt: "11:15", endsAt: "15:00" }],
      },
    ],
  };

  it("produit les trois feuilles attendues et conserve la date de semaine pour l’import", () => {
    const workbook = buildPlanningWorkbook(payload);
    expect(workbook.SheetNames).toEqual(["Semaine 1", "Détail des services", "Synthèse"]);
    const importSheet = workbook.Sheets["Semaine 1"];
    expect(importSheet.C3?.v).toBe("Camille Bernard");
    expect(importSheet.F3?.z).toBe("hh:mm");
    expect(XLSX.SSF.parse_date_code(Number(importSheet.AU1?.v))?.y).toBe(2026);
  });

  it("peut être relu directement par l’import Excel existant", () => {
    const workbook = buildPlanningWorkbook(payload);
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
    const parsed = parsePlanningExcel(Buffer.from(buffer));
    expect(parsed.weekStart).toBe("2026-08-31");
    expect(parsed.shifts).toHaveLength(1);
    expect(parsed.shifts[0]).toMatchObject({ sourceEmployeeAlias: "Camille Bernard", serviceDate: "2026-08-31", startsAt: "11:15", endsAt: "15:00", position: "Service du midi" });
  });

  it("affiche les cases libres, la note et les horaires individuels dans le détail", () => {
    const workbook = buildPlanningWorkbook(payload);
    const rows = XLSX.utils.sheet_to_json<Array<string | number>>(workbook.Sheets["Détail des services"], { header: 1, raw: false });
    expect(rows).toHaveLength(5);
    expect(rows[1]).toContain("11:15 — 15:00");
    expect(rows[1]).toContain("Brief à 11 h 15");
    expect(rows[2]).toContain("À affecter");
    expect(rows[4]).toContain("Case libre");
  });
});
