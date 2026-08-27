import { describe, expect, it } from "vitest";
import { validatePlanningBeforePublication } from "../server/planningValidation";

const members = [
  { id: 1, name: "Hakim", active: true },
  { id: 2, name: "Océane", active: true },
  { id: 3, name: "Tiphaine", active: true },
];

function checkShift(input: { memberIds: number[]; requiredStaff: number }) {
  return validatePlanningBeforePublication({
    members,
    unavailabilities: [],
    shifts: [
      {
        id: 10,
        serviceDate: "2026-08-31",
        startsAt: "17:30",
        endsAt: "22:15",
        position: "Service du soir",
        ...input,
      },
    ],
  });
}

describe("couverture des besoins d’équipe", () => {
  it("signale un sous-effectif sans bloquer la publication", () => {
    const result = checkShift({ memberIds: [1, 2], requiredStaff: 4 });

    expect(result.blocking).toEqual([]);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatchObject({
      code: "understaffed",
      severity: "warning",
      title: "Effectif incomplet",
      shiftId: 10,
    });
    expect(result.warnings[0]?.message).toContain("2/4");
    expect(result.warnings[0]?.message).toContain("il manque 2 personnes");
  });

  it("ne crée aucune alerte lorsque le besoin est entièrement couvert", () => {
    const result = checkShift({ memberIds: [1, 2, 3], requiredStaff: 3 });

    expect(result.blocking).toEqual([]);
    expect(result.warnings.filter((item) => item.code === "understaffed")).toEqual([]);
  });

  it("conserve le blocage d’un service entièrement vide sans ajouter une alerte redondante", () => {
    const result = checkShift({ memberIds: [], requiredStaff: 4 });

    expect(result.blocking).toHaveLength(1);
    expect(result.blocking[0]).toMatchObject({ code: "empty_shift", severity: "blocking" });
    expect(result.warnings.filter((item) => item.code === "understaffed")).toEqual([]);
  });
});
