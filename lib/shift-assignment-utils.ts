export type ShiftAssignmentTimeLike = {
  staffMemberId: number;
  startsAt: string;
  endsAt: string;
};

export type ShiftWithAssignmentTimesLike = {
  startsAt: string;
  endsAt: string;
  assignmentTimes?: ShiftAssignmentTimeLike[];
};

/** Retourne l’horaire sauvegardé du salarié, ou l’horaire général du service pour les anciennes données. */
export function getShiftAssignmentTime(shift: ShiftWithAssignmentTimesLike, staffMemberId: number): ShiftAssignmentTimeLike {
  const saved = shift.assignmentTimes?.find((assignment) => assignment.staffMemberId === staffMemberId);
  return saved ?? { staffMemberId, startsAt: shift.startsAt, endsAt: shift.endsAt };
}

/** Reconstruit la liste complète sans perdre les horaires individuels déjà enregistrés. */
export function buildShiftAssignmentTimes(shift: ShiftWithAssignmentTimesLike, memberIds: number[]): ShiftAssignmentTimeLike[] {
  return memberIds.map((staffMemberId) => getShiftAssignmentTime(shift, staffMemberId));
}
