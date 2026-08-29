export function getMonday(input: Date = new Date()) {
  const date = new Date(input);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function toIsoDate(date: Date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function getWeekDays(weekStart: string) {
  const [year, month, day] = weekStart.split("-").map(Number);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(year, month - 1, day + index);
    return { iso: toIsoDate(date), date, shortLabel: new Intl.DateTimeFormat("fr-FR", { weekday: "short" }).format(date).replace(".", "") };
  });
}

export function isValidShiftTime(startsAt: string, endsAt: string) {
  return /^\d{2}:\d{2}$/.test(startsAt) && /^\d{2}:\d{2}$/.test(endsAt) && startsAt < endsAt;
}

export function filterShiftsForMember<T extends { memberIds: number[] }>(shifts: T[], memberId: number | null) {
  if (!memberId) return [];
  return shifts.filter((shift) => shift.memberIds.includes(memberId));
}

type HoursMember = { id: number; name: string; jobTitle: string; color: string };
type HoursShift = { startsAt: string; endsAt: string; memberIds: number[]; assignmentTimes?: Array<{ staffMemberId: number; startsAt: string; endsAt: string }> };

function getMemberShiftDurationMinutes(shift: HoursShift, memberId: number) {
  const assignment = shift.assignmentTimes?.find((entry) => entry.staffMemberId === memberId);
  return getShiftDurationMinutes(assignment?.startsAt ?? shift.startsAt, assignment?.endsAt ?? shift.endsAt);
}

export function getShiftDurationMinutes(startsAt: string, endsAt: string) {
  const toMinutes = (value: string) => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
  const start = toMinutes(startsAt);
  const end = toMinutes(endsAt);
  return end > start ? end - start : end + 24 * 60 - start;
}

export function formatHours(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours} h ${String(remainder).padStart(2, "0")}` : `${hours} h`;
}

export function summarizeWeeklyHours<TMember extends HoursMember, TShift extends HoursShift>(members: TMember[], shifts: TShift[]) {
  return members.map((member) => {
    const assigned = shifts.filter((shift) => shift.memberIds.includes(member.id));
    return { member, minutes: assigned.reduce((total, shift) => total + getMemberShiftDurationMinutes(shift, member.id), 0), shiftCount: assigned.length };
  }).sort((left, right) => right.minutes - left.minutes || left.member.name.localeCompare(right.member.name, "fr"));
}

export type UnavailabilityPeriod = "all_day" | "midi" | "soir";

export function getShiftPeriod(startsAt: string): Exclude<UnavailabilityPeriod, "all_day"> {
  return Number(startsAt.slice(0, 2)) < 16 ? "midi" : "soir";
}

export function isUnavailableForShift(entry: { serviceDate: string; period: UnavailabilityPeriod }, serviceDate: string, startsAt: string) {
  return entry.serviceDate === serviceDate && (entry.period === "all_day" || entry.period === getShiftPeriod(startsAt));
}

export function formatUnavailabilityPeriod(period: UnavailabilityPeriod) {
  return period === "all_day" ? "Toute la journée" : period === "midi" ? "Service du midi" : "Service du soir";
}

export function formatFrenchDate(isoDate: string, options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" }) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("fr-FR", options).format(new Date(year, month - 1, day));
}
