import { describe, expect, it } from "vitest";
import { buildShiftAssignmentTimes, getShiftAssignmentTime } from "../lib/shift-assignment-utils";
import { summarizeWeeklyHours } from "../lib/planning-utils";

describe("horaires individuels d’un même service", () => {
  const shift = {
    startsAt: "11:30",
    endsAt: "15:00",
    memberIds: [1, 2, 3],
    assignmentTimes: [
      { staffMemberId: 1, startsAt: "11:00", endsAt: "14:00" },
      { staffMemberId: 2, startsAt: "11:30", endsAt: "15:00" },
      { staffMemberId: 3, startsAt: "12:00", endsAt: "15:00" },
    ],
  };

  it("retrouve les trois horaires après rechargement des données", () => {
    expect(buildShiftAssignmentTimes(shift, [1, 2, 3])).toEqual([
      { staffMemberId: 1, startsAt: "11:00", endsAt: "14:00" },
      { staffMemberId: 2, startsAt: "11:30", endsAt: "15:00" },
      { staffMemberId: 3, startsAt: "12:00", endsAt: "15:00" },
    ]);
  });

  it("utilise l’horaire général uniquement pour une ancienne affectation sans horaires propres", () => {
    expect(getShiftAssignmentTime({ startsAt: "11:30", endsAt: "15:00" }, 4)).toEqual({ staffMemberId: 4, startsAt: "11:30", endsAt: "15:00" });
  });

  it("calcule les heures de chaque salarié selon son horaire propre", () => {
    const members = [
      { id: 1, name: "Alice", jobTitle: "Serveuse", color: "#000000" },
      { id: 2, name: "Bruno", jobTitle: "Serveur", color: "#000000" },
      { id: 3, name: "Chloé", jobTitle: "Serveuse", color: "#000000" },
    ];
    const summary = summarizeWeeklyHours(members, [shift]);
    expect(summary.map(({ member, minutes }) => [member.id, minutes])).toEqual([[2, 210], [1, 180], [3, 180]]);
  });
});
