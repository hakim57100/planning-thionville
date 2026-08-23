import { describe, expect, it } from "vitest";
import { getMonday, getWeekDays, isValidShiftTime, toIsoDate } from "../lib/planning-utils";

describe("règles de planning", () => {
  it("ramène chaque date au lundi de sa semaine", () => {
    expect(toIsoDate(getMonday(new Date(2026, 7, 20)))).toBe("2026-08-17");
  });

  it("construit une semaine de sept journées successives", () => {
    const days = getWeekDays("2026-08-17");
    expect(days).toHaveLength(7);
    expect(days[0].iso).toBe("2026-08-17");
    expect(days[6].iso).toBe("2026-08-23");
  });

  it("refuse un service dont la fin précède le début", () => {
    expect(isValidShiftTime("11:30", "15:00")).toBe(true);
    expect(isValidShiftTime("18:00", "16:00")).toBe(false);
  });
});
