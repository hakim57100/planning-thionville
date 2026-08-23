import { describe, expect, it } from "vitest";
import { formatHours, getShiftDurationMinutes, summarizeWeeklyHours } from "../lib/planning-utils";

describe("récapitulatif hebdomadaire des heures", () => {
  it("calcule une durée de service et gère un créneau passant minuit", () => {
    expect(getShiftDurationMinutes("11:30", "15:00")).toBe(210);
    expect(getShiftDurationMinutes("22:00", "01:00")).toBe(180);
  });

  it("cumule les heures pour chaque salarié affecté", () => {
    const members = [{ id: 1, name: "Camille Bernard", jobTitle: "Manager", color: "#E31837" }, { id: 2, name: "Lucas Morel", jobTitle: "Livreur", color: "#0E8A73" }];
    const shifts = [{ startsAt: "11:00", endsAt: "15:00", memberIds: [1, 2] }, { startsAt: "18:00", endsAt: "21:30", memberIds: [1] }];
    const summary = summarizeWeeklyHours(members, shifts);
    expect(summary[0]).toMatchObject({ member: { id: 1 }, minutes: 450, shiftCount: 2 });
    expect(summary[1]).toMatchObject({ member: { id: 2 }, minutes: 240, shiftCount: 1 });
    expect(formatHours(summary[0].minutes)).toBe("7 h 30");
  });
});
