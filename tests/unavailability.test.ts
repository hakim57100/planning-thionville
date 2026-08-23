import { describe, expect, it } from "vitest";
import { formatUnavailabilityPeriod, getShiftPeriod, isUnavailableForShift } from "../lib/planning-utils";

describe("indisponibilités", () => {
  it("associe les créneaux aux périodes de midi et de soir", () => {
    expect(getShiftPeriod("11:30")).toBe("midi");
    expect(getShiftPeriod("18:30")).toBe("soir");
  });

  it("bloque uniquement les services concernés", () => {
    const evening = { serviceDate: "2026-08-19", period: "soir" as const };
    expect(isUnavailableForShift(evening, "2026-08-19", "18:30")).toBe(true);
    expect(isUnavailableForShift(evening, "2026-08-19", "11:30")).toBe(false);
    expect(isUnavailableForShift({ serviceDate: "2026-08-19", period: "all_day" }, "2026-08-19", "11:30")).toBe(true);
    expect(formatUnavailabilityPeriod("all_day")).toBe("Toute la journée");
  });
});
