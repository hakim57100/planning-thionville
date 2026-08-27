import { describe, expect, it } from "vitest";
import {
  assertDuplicatedWeekCanBeCancelled,
  createDuplicateWeekFingerprint,
} from "../server/weekDuplicationUtils";

const copiedWeek = [
  {
    serviceDate: "2026-09-07",
    startsAt: "11:30",
    endsAt: "15:00",
    position: "Service du midi",
    requiredStaff: 4,
    note: "Mise en place à 11 h 15",
    memberIds: [2, 1],
    assignmentTimes: [
      { staffMemberId: 2, startsAt: "11:30", endsAt: "15:00" },
      { staffMemberId: 1, startsAt: "11:15", endsAt: "15:00" },
    ],
  },
  {
    serviceDate: "2026-09-07",
    startsAt: "17:30",
    endsAt: "22:15",
    position: "Service du soir",
    requiredStaff: 6,
    note: null,
    memberIds: [3],
    assignmentTimes: [{ staffMemberId: 3, startsAt: "17:30", endsAt: "22:15" }],
  },
];

describe("annulation protégée de duplication", () => {
  it("reconnaît la même copie même si l’ordre des services et salariés varie", () => {
    const expected = createDuplicateWeekFingerprint(copiedWeek);
    const reordered = createDuplicateWeekFingerprint([
      { ...copiedWeek[1], memberIds: [...copiedWeek[1].memberIds].reverse() },
      {
        ...copiedWeek[0],
        memberIds: [...copiedWeek[0].memberIds].reverse(),
        assignmentTimes: [...copiedWeek[0].assignmentTimes].reverse(),
      },
    ]);
    expect(reordered).toBe(expected);
  });

  it("autorise uniquement une copie brouillon restée identique", () => {
    const fingerprint = createDuplicateWeekFingerprint(copiedWeek);
    expect(() => assertDuplicatedWeekCanBeCancelled({
      targetWeekStart: "2026-09-07",
      status: "draft",
      expectedFingerprint: fingerprint,
      actualFingerprint: fingerprint,
    })).not.toThrow();
  });

  it("refuse toute copie modifiée sans supprimer de planning", () => {
    const expected = createDuplicateWeekFingerprint(copiedWeek);
    const modified = createDuplicateWeekFingerprint([
      { ...copiedWeek[0], requiredStaff: 5 },
      copiedWeek[1],
    ]);
    expect(() => assertDuplicatedWeekCanBeCancelled({
      targetWeekStart: "2026-09-07",
      status: "draft",
      expectedFingerprint: expected,
      actualFingerprint: modified,
    })).toThrow("a été modifiée après la duplication");
  });

  it("refuse toute copie déjà publiée", () => {
    const fingerprint = createDuplicateWeekFingerprint(copiedWeek);
    expect(() => assertDuplicatedWeekCanBeCancelled({
      targetWeekStart: "2026-09-07",
      status: "published",
      expectedFingerprint: fingerprint,
      actualFingerprint: fingerprint,
    })).toThrow("est publiée et ne peut pas être annulée");
  });
});
