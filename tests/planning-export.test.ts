import { describe, expect, it } from "vitest";
import { buildPlanningHtml, buildPlanningSvg } from "../lib/planning-export-template";
import { getShiftStyle } from "../lib/shift-style";

const shifts = [{ serviceDate: "2026-08-17", startsAt: "11:00", endsAt: "15:00", position: "Cuisinier", note: null, memberIds: [1] }];
const members = [{ id: 1, name: "Camille Bernard", jobTitle: "Cuisinière" }];

describe("export et code couleur du planning", () => {
  it("associe les postes demandés à des couleurs distinctes", () => {
    expect(getShiftStyle("Livreur").color).not.toBe(getShiftStyle("Cuisinier").color);
    expect(getShiftStyle("Manager").color).not.toBe(getShiftStyle("Cuisinier").color);
  });

  it("produit un document PDF et une image SVG avec le service", () => {
    const html = buildPlanningHtml("2026-08-17", shifts, members, "Mes horaires");
    const svg = buildPlanningSvg("2026-08-17", shifts, members, "Mes horaires");
    expect(html).toContain("Cuisinier");
    expect(svg).toContain("Planning de la semaine");
    expect(svg).toContain("Cuisinier");
  });
});
