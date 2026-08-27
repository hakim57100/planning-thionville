import { createHash } from "node:crypto";

export type DuplicatedShiftForFingerprint = {
  serviceDate: string;
  startsAt: string;
  endsAt: string;
  position: string;
  requiredStaff: number;
  note: string | null;
  memberIds: number[];
  assignmentTimes: Array<{ staffMemberId: number; startsAt: string; endsAt: string }>;
};

/**
 * Produit une empreinte stable du contenu réellement copié. Les identifiants
 * techniques sont volontairement exclus : seuls les services, affectations et
 * horaires métier comptent pour savoir si la copie a été modifiée.
 */
export function createDuplicateWeekFingerprint(shifts: DuplicatedShiftForFingerprint[]): string {
  const normalized = shifts
    .map((shift) => ({
      serviceDate: shift.serviceDate,
      startsAt: shift.startsAt,
      endsAt: shift.endsAt,
      position: shift.position,
      requiredStaff: shift.requiredStaff,
      note: shift.note ?? null,
      memberIds: [...shift.memberIds].sort((left, right) => left - right),
      assignmentTimes: [...shift.assignmentTimes]
        .map((assignment) => ({
          staffMemberId: assignment.staffMemberId,
          startsAt: assignment.startsAt,
          endsAt: assignment.endsAt,
        }))
        .sort((left, right) => left.staffMemberId - right.staffMemberId),
    }))
    .sort((left, right) =>
      [left.serviceDate, left.startsAt, left.endsAt, left.position]
        .join("\u0000")
        .localeCompare([right.serviceDate, right.startsAt, right.endsAt, right.position].join("\u0000")),
    );

  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

/** L’annulation est réservée à une semaine brouillon restée strictement identique à la copie. */
export function assertDuplicatedWeekCanBeCancelled(input: {
  targetWeekStart: string;
  status: "draft" | "published";
  expectedFingerprint: string;
  actualFingerprint: string;
}) {
  if (input.status === "published") {
    throw new Error(`La semaine du ${input.targetWeekStart} est publiée et ne peut pas être annulée.`);
  }
  if (input.expectedFingerprint !== input.actualFingerprint) {
    throw new Error(`La semaine du ${input.targetWeekStart} a été modifiée après la duplication. Elle n’a pas été supprimée.`);
  }
}
