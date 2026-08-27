export type PublicationCheckSeverity = "blocking" | "warning";

export type PublicationCheckItem = {
  code: "empty_week" | "empty_shift" | "inactive_member" | "unavailability" | "overlap" | "short_rest";
  severity: PublicationCheckSeverity;
  title: string;
  message: string;
  shiftId?: number;
  staffMemberId?: number;
};

export type PublicationCheckResult = {
  blocking: PublicationCheckItem[];
  warnings: PublicationCheckItem[];
  checkedShiftCount: number;
  checkedMemberCount: number;
};

type CheckMember = {
  id: number;
  name: string;
  active: boolean;
};

type CheckShift = {
  id: number;
  serviceDate: string;
  startsAt: string;
  endsAt: string;
  position: string;
  memberIds: number[];
};

type CheckUnavailability = {
  staffMemberId: number;
  serviceDate: string;
  period: "all_day" | "midi" | "soir";
  reason: string | null;
};

const MINIMUM_REST_HOURS_WARNING = 10;

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function shiftStart(shift: CheckShift) {
  const [year, month, day] = shift.serviceDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCMinutes(date.getUTCMinutes() + toMinutes(shift.startsAt));
  return date;
}

function shiftEnd(shift: CheckShift) {
  const [year, month, day] = shift.serviceDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const start = toMinutes(shift.startsAt);
  const end = toMinutes(shift.endsAt);
  date.setUTCMinutes(date.getUTCMinutes() + (end > start ? end : end + 24 * 60));
  return date;
}

function isUnavailableForShift(entry: CheckUnavailability, shift: CheckShift) {
  if (entry.serviceDate !== shift.serviceDate) return false;
  if (entry.period === "all_day") return true;
  return entry.period === (toMinutes(shift.startsAt) < 16 * 60 ? "midi" : "soir");
}

function staffName(staffById: Map<number, CheckMember>, id: number) {
  return staffById.get(id)?.name ?? `Salarié #${id}`;
}

export function validatePlanningBeforePublication(input: {
  members: CheckMember[];
  shifts: CheckShift[];
  unavailabilities: CheckUnavailability[];
}): PublicationCheckResult {
  const blocking: PublicationCheckItem[] = [];
  const warnings: PublicationCheckItem[] = [];
  const staffById = new Map(input.members.map((member) => [member.id, member]));

  if (!input.shifts.length) {
    blocking.push({
      code: "empty_week",
      severity: "blocking",
      title: "Semaine vide",
      message: "Ajoutez au moins un service avant de publier cette semaine.",
    });
  }

  for (const shift of input.shifts) {
    if (!shift.memberIds.length) {
      blocking.push({
        code: "empty_shift",
        severity: "blocking",
        title: "Service sans salarié",
        message: `${shift.position} du ${shift.serviceDate} à ${shift.startsAt} n’a aucune personne affectée.`,
        shiftId: shift.id,
      });
    }

    for (const staffMemberId of shift.memberIds) {
      const member = staffById.get(staffMemberId);
      if (!member || !member.active) {
        blocking.push({
          code: "inactive_member",
          severity: "blocking",
          title: "Salarié inactif",
          message: `${staffName(staffById, staffMemberId)} est affecté à ${shift.position} le ${shift.serviceDate}, mais son profil est inactif ou introuvable.`,
          shiftId: shift.id,
          staffMemberId,
        });
      }

      const unavailability = input.unavailabilities.find((entry) => entry.staffMemberId === staffMemberId && isUnavailableForShift(entry, shift));
      if (unavailability) {
        blocking.push({
          code: "unavailability",
          severity: "blocking",
          title: "Indisponibilité non respectée",
          message: `${staffName(staffById, staffMemberId)} est indisponible pour ${shift.position} le ${shift.serviceDate} (${unavailability.period === "all_day" ? "toute la journée" : unavailability.period === "midi" ? "service du midi" : "service du soir"}).`,
          shiftId: shift.id,
          staffMemberId,
        });
      }
    }
  }

  for (const member of input.members) {
    const assignedShifts = input.shifts
      .filter((shift) => shift.memberIds.includes(member.id))
      .sort((first, second) => shiftStart(first).getTime() - shiftStart(second).getTime());

    for (let index = 0; index < assignedShifts.length - 1; index += 1) {
      const current = assignedShifts[index];
      const next = assignedShifts[index + 1];
      const currentEnd = shiftEnd(current);
      const nextStart = shiftStart(next);

      if (nextStart.getTime() < currentEnd.getTime()) {
        blocking.push({
          code: "overlap",
          severity: "blocking",
          title: "Chevauchement d’horaires",
          message: `${member.name} est affecté à deux services qui se chevauchent : ${current.serviceDate} ${current.startsAt}–${current.endsAt} et ${next.serviceDate} ${next.startsAt}–${next.endsAt}.`,
          shiftId: next.id,
          staffMemberId: member.id,
        });
        continue;
      }

      const restHours = (nextStart.getTime() - currentEnd.getTime()) / 3_600_000;
      if (restHours < MINIMUM_REST_HOURS_WARNING) {
        warnings.push({
          code: "short_rest",
          severity: "warning",
          title: "Reprise rapprochée",
          message: `${member.name} a seulement ${Math.floor(restHours)} h ${Math.round((restHours % 1) * 60).toString().padStart(2, "0")} de repos entre ${current.serviceDate} ${current.endsAt} et ${next.serviceDate} ${next.startsAt}. Vérifiez cette organisation avant publication.`,
          shiftId: next.id,
          staffMemberId: member.id,
        });
      }
    }
  }

  return {
    blocking,
    warnings,
    checkedShiftCount: input.shifts.length,
    checkedMemberCount: input.members.length,
  };
}

export function publicationCheckSummary(check: PublicationCheckResult) {
  const parts: string[] = [];
  if (check.blocking.length) parts.push(`${check.blocking.length} erreur${check.blocking.length > 1 ? "s" : ""} bloquante${check.blocking.length > 1 ? "s" : ""}`);
  if (check.warnings.length) parts.push(`${check.warnings.length} avertissement${check.warnings.length > 1 ? "s" : ""}`);
  return parts.length ? parts.join(" et ") : "Aucun problème détecté";
}
