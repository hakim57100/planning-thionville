import { getWeekDays } from "@/lib/planning-utils";

export type PlanningRole = "admin" | "employee";
export type Staff = { id: number; name: string; email: string | null; jobTitle: string; color: string; role?: PlanningRole; active?: boolean };
export type UnavailabilityPeriod = "all_day" | "midi" | "soir";
export type StaffUnavailability = { id: number; staffMemberId: number; serviceDate: string; period: UnavailabilityPeriod; reason: string | null };
export type PlanningShift = { id: number; serviceDate: string; startsAt: string; endsAt: string; position: string; note: string | null; memberIds: number[] };
export type PlanningSnapshot = { week: { id: number; weekStart: string; status: "draft" | "published"; publishedAt: Date | null } | null; members: Staff[]; shifts: PlanningShift[]; unavailabilities: StaffUnavailability[] };

const team: Staff[] = [
  { id: 1, name: "Camille Bernard", email: "camille@restaurant.fr", jobTitle: "Cheffe de rang", color: "#C96442" },
  { id: 2, name: "Lucas Morel", email: "lucas@restaurant.fr", jobTitle: "Barman", color: "#3E826E" },
  { id: 3, name: "Sarah Petit", email: "sarah@restaurant.fr", jobTitle: "Serveuse", color: "#5B6FA8" },
  { id: 4, name: "Mehdi Lemoine", email: "mehdi@restaurant.fr", jobTitle: "Commis de salle", color: "#A57947" },
];

export function buildDemoWeek(weekStart: string): PlanningSnapshot {
  const days = getWeekDays(weekStart);
  return { week: { id: -1, weekStart, status: "draft", publishedAt: null }, members: team, unavailabilities: [{ id: -201, staffMemberId: 1, serviceDate: days[2].iso, period: "soir", reason: "Rendez-vous personnel" }, { id: -202, staffMemberId: 3, serviceDate: days[4].iso, period: "all_day", reason: "Congé" }], shifts: [
    { id: -101, serviceDate: days[0].iso, startsAt: "11:30", endsAt: "15:00", position: "Manager de salle", note: "Brief à 11 h 15", memberIds: [1, 3] },
    { id: -102, serviceDate: days[0].iso, startsAt: "18:30", endsAt: "23:00", position: "Cuisinier", note: "Terrasse si la météo le permet", memberIds: [2, 4] },
    { id: -103, serviceDate: days[1].iso, startsAt: "11:30", endsAt: "15:00", position: "Livreur", note: null, memberIds: [1, 4] },
    { id: -104, serviceDate: days[2].iso, startsAt: "18:30", endsAt: "23:00", position: "Cuisinier", note: "Groupe de 14 à 20 h", memberIds: [2, 3] },
    { id: -105, serviceDate: days[4].iso, startsAt: "18:30", endsAt: "23:30", position: "Manager", note: "Renfort bar", memberIds: [1, 2, 3, 4] },
    { id: -106, serviceDate: days[5].iso, startsAt: "10:30", endsAt: "15:30", position: "Livreur", note: "Mise en place à 10 h 15", memberIds: [1, 3, 4] },
  ] };
}
