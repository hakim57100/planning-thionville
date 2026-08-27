export type TemplateSourceShift = {
  serviceDate: string;
  startsAt: string;
  endsAt: string;
  position: string;
  requiredStaff: number;
  note: string | null;
};

export type TemplateShiftSnapshot = {
  dayOffset: number;
  startsAt: string;
  endsAt: string;
  position: string;
  requiredStaff: number;
  note: string | null;
};

export type TemplateSourceAssignment = {
  staffMemberId: number;
  startsAt: string | null;
  endsAt: string | null;
};

export type TemplateAssignmentSnapshot = {
  staffMemberId: number;
  startsAt: string;
  endsAt: string;
};

function addDaysToIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function getWeekDayOffset(weekStart: string, serviceDate: string) {
  const start = Date.parse(`${weekStart}T00:00:00.000Z`);
  const service = Date.parse(`${serviceDate}T00:00:00.000Z`);
  return Math.round((service - start) / (24 * 60 * 60 * 1000));
}

export function createTemplateShiftSnapshot(weekStart: string, shift: TemplateSourceShift): TemplateShiftSnapshot {
  const dayOffset = getWeekDayOffset(weekStart, shift.serviceDate);
  if (dayOffset < 0 || dayOffset > 6) {
    throw new Error("Un service de cette semaine est en dehors de la période lundi-dimanche.");
  }
  return {
    dayOffset,
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    position: shift.position,
    requiredStaff: shift.requiredStaff,
    note: shift.note,
  };
}

export function createTemplateAssignmentSnapshot(assignment: TemplateSourceAssignment, shift: Pick<TemplateSourceShift, "startsAt" | "endsAt">): TemplateAssignmentSnapshot {
  return {
    staffMemberId: assignment.staffMemberId,
    startsAt: assignment.startsAt ?? shift.startsAt,
    endsAt: assignment.endsAt ?? shift.endsAt,
  };
}

export function materializeTemplateShift(weekStart: string, shift: TemplateShiftSnapshot) {
  return {
    serviceDate: addDaysToIsoDate(weekStart, shift.dayOffset),
    startsAt: shift.startsAt,
    endsAt: shift.endsAt,
    position: shift.position,
    requiredStaff: shift.requiredStaff,
    note: shift.note,
  };
}

export function materializeTemplateAssignment(assignment: TemplateAssignmentSnapshot) {
  return {
    staffMemberId: assignment.staffMemberId,
    startsAt: assignment.startsAt,
    endsAt: assignment.endsAt,
  };
}

export function assertTemplateTargetIsEmpty(input: { status: "draft" | "published" | undefined; hasServices: boolean; weekStart: string }) {
  if (input.status === "published") {
    throw new Error("La semaine cible est déjà publiée et ne peut pas être modifiée par un modèle.");
  }
  if (input.hasServices) {
    throw new Error(`La semaine du ${input.weekStart} contient déjà des services. Elle n’a pas été modifiée.`);
  }
}
