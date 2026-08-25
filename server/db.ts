import { and, asc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { InsertStaffMember, planningWeeks, shifts, shiftAssignments, staffMembers, staffUnavailability, StaffMember } from "../drizzle/schema";
import { hashAccessCode } from "./_core/codeAuth";
import type { ParsedExcelPlanning } from "./planningExcel";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function getStaffMemberById(id: number): Promise<StaffMember | undefined> {
  const database = await getDb();
  if (!database) return undefined;
  return (await database.select().from(staffMembers).where(eq(staffMembers.id, id)).limit(1))[0];
}

export async function getActiveStaffMembersWithCode(): Promise<StaffMember[]> {
  const database = await getDb();
  if (!database) return [];
  return database.select().from(staffMembers).where(eq(staffMembers.active, true));
}

export type WeekSnapshot = {
  week: { id: number; weekStart: string; status: "draft" | "published"; publishedAt: Date | null } | null;
  members: Array<{ id: number; name: string; email: string | null; jobTitle: string; color: string; role: "admin" | "employee"; active: boolean }>;
  shifts: Array<{ id: number; serviceDate: string; startsAt: string; endsAt: string; position: string; note: string | null; memberIds: number[] }>;
  unavailabilities: Array<{ id: number; staffMemberId: number; serviceDate: string; period: "all_day" | "midi" | "soir"; reason: string | null }>;
};

function weekEnd(weekStart: string) {
  const [year, month, day] = weekStart.split("-").map(Number);
  const date = new Date(year, month - 1, day + 6);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function toPublicMember(member: StaffMember) {
  return { id: member.id, name: member.name, email: member.email, jobTitle: member.jobTitle, color: member.color, role: member.role, active: member.active };
}

export async function getWeekSnapshot(weekStart: string): Promise<WeekSnapshot> {
  const database = await getDb();
  if (!database) return { week: null, members: [], shifts: [], unavailabilities: [] };
  const [week, membersRaw, unavailabilities] = await Promise.all([
    database.select().from(planningWeeks).where(eq(planningWeeks.weekStart, weekStart)).limit(1).then((rows) => rows[0]),
    database.select().from(staffMembers).where(eq(staffMembers.active, true)).orderBy(asc(staffMembers.name)),
    database.select().from(staffUnavailability).where(and(gte(staffUnavailability.serviceDate, weekStart), lte(staffUnavailability.serviceDate, weekEnd(weekStart)))).orderBy(asc(staffUnavailability.serviceDate)),
  ]);
  const members = membersRaw.map(toPublicMember);
  if (!week) return { week: null, members, shifts: [], unavailabilities };
  const weekShifts = await database.select().from(shifts).where(eq(shifts.planningWeekId, week.id)).orderBy(asc(shifts.serviceDate), asc(shifts.startsAt));
  const ids = weekShifts.map((shift) => shift.id);
  const assignments = ids.length ? await database.select().from(shiftAssignments).where(inArray(shiftAssignments.shiftId, ids)) : [];
  return { week: { id: week.id, weekStart: week.weekStart, status: week.status, publishedAt: week.publishedAt }, members, unavailabilities, shifts: weekShifts.map((shift) => ({ ...shift, memberIds: assignments.filter((assignment) => assignment.shiftId === shift.id).map((assignment) => assignment.staffMemberId) })) };
}

export async function ensureWeek(weekStart: string) {
  const database = await getDb();
  if (!database) throw new Error("Database not available");
  const existing = (await database.select().from(planningWeeks).where(eq(planningWeeks.weekStart, weekStart)).limit(1))[0];
  if (existing) return existing;
  const [created] = await database.insert(planningWeeks).values({ weekStart, status: "draft" }).returning();
  if (!created) throw new Error("Planning week creation failed");
  return created;
}

// Crée un salarié et génère son code d'accès en clair (affiché une seule fois à l'admin).
export type ExcelImportResult = { weekStart: string; importedShiftCount: number; planningWeekId: number | null };

/**
 * Vérifie les alias déjà validés dans Supabase, puis délègue le remplacement
 * atomique de la semaine à la fonction SQL replace_excel_planning_week.
 */
export async function importPlanningExcel(input: { sourceFilename: string; planning: ParsedExcelPlanning }): Promise<ExcelImportResult> {
  const database = await getDb();
  if (!database) throw new Error("Database not available");

  const aliasesToFind = [...new Set(input.planning.shifts.map((shift) => shift.normalizedEmployeeName))];
  const aliasList = sql.join(aliasesToFind.map((alias) => sql`${alias}`), sql`, `);
  const aliasResult = await database.execute(sql`
    select alias_normalized, "staffMemberId"
    from public.staff_import_aliases
    where alias_normalized in (${aliasList})
  `);
  const aliases = aliasResult.rows as Array<{ alias_normalized: string; staffMemberId: number }>;
  const staffIdByAlias = new Map(aliases.map((entry) => [entry.alias_normalized, entry.staffMemberId]));
  const missingAliases = aliasesToFind.filter((alias) => !staffIdByAlias.has(alias));

  if (missingAliases.length) {
    throw new Error(`Employés non rapprochés : ${missingAliases.join(", ")}. Ajoutez leurs alias avant de relancer l’import.`);
  }

  const shifts = input.planning.shifts.map((shift) => ({
    source_employee_alias: shift.normalizedEmployeeName,
    staff_member_id: staffIdByAlias.get(shift.normalizedEmployeeName),
    service_date: shift.serviceDate,
    starts_at: shift.startsAt,
    ends_at: shift.endsAt,
    position: shift.position,
  }));

  const result = await database.execute(sql`
    select public.replace_excel_planning_week(
      ${input.planning.weekStart},
      ${JSON.stringify(shifts)}::jsonb,
      ${input.sourceFilename}
    ) as result
  `);
  const response = result.rows[0] as { result?: { planningWeekId?: number } } | undefined;

  return {
    weekStart: input.planning.weekStart,
    importedShiftCount: shifts.length,
    planningWeekId: response?.result?.planningWeekId ?? null,
  };
}

export async function createStaffMember(input: { name: string; email?: string; jobTitle: string; color: string; role?: "admin" | "employee" }, plainCode: string) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  const codeHash = hashAccessCode(plainCode);
  const values: InsertStaffMember = { name: input.name, email: input.email || null, jobTitle: input.jobTitle, color: input.color, role: input.role ?? "employee", codeHash, active: true };
  const [created] = await database.insert(staffMembers).values(values).returning();
  return created.id;
}

// Régénère le code d'un salarié existant (retourne le nouveau code en clair).
export async function regenerateStaffCode(id: number, plainCode: string) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  const codeHash = hashAccessCode(plainCode);
  await database.update(staffMembers).set({ codeHash, updatedAt: new Date() }).where(eq(staffMembers.id, id));
}

export async function setStaffActive(id: number, active: boolean) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  await database.update(staffMembers).set({ active, updatedAt: new Date() }).where(eq(staffMembers.id, id));
}

export async function createShift(input: { weekStart: string; serviceDate: string; startsAt: string; endsAt: string; position: string; note?: string; memberIds: number[] }) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  const week = await ensureWeek(input.weekStart);
  const [created] = await database.insert(shifts).values({ planningWeekId: week.id, serviceDate: input.serviceDate, startsAt: input.startsAt, endsAt: input.endsAt, position: input.position, note: input.note || null }).returning();
  const shiftId = created.id;
  if (input.memberIds.length) await database.insert(shiftAssignments).values(input.memberIds.map((staffMemberId) => ({ shiftId, staffMemberId })));
  return shiftId;
}

export async function updateShift(input: { id: number; serviceDate?: string; startsAt?: string; endsAt?: string; position?: string; note?: string | null; memberIds?: number[] }) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  const { id, memberIds, ...changes } = input;
  if (Object.keys(changes).length) await database.update(shifts).set(changes).where(eq(shifts.id, id));
  if (memberIds) { await database.delete(shiftAssignments).where(eq(shiftAssignments.shiftId, id)); if (memberIds.length) await database.insert(shiftAssignments).values(memberIds.map((staffMemberId) => ({ shiftId: id, staffMemberId }))); }
}

export async function deleteShift(id: number) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  await database.delete(shiftAssignments).where(eq(shiftAssignments.shiftId, id)); await database.delete(shifts).where(eq(shifts.id, id));
}

export async function publishWeek(weekStart: string) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  const week = await ensureWeek(weekStart); await database.update(planningWeeks).set({ status: "published", publishedAt: new Date() }).where(eq(planningWeeks.id, week.id));
}

export async function createUnavailabilityForMember(staffMemberId: number, input: { serviceDate: string; period: "all_day" | "midi" | "soir"; reason?: string }) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  const [created] = await database.insert(staffUnavailability).values({ staffMemberId, serviceDate: input.serviceDate, period: input.period, reason: input.reason || null }).returning();
  return created.id;
}

export async function deleteUnavailabilityForMember(staffMemberId: number, id: number) {
  const database = await getDb(); if (!database) throw new Error("Database not available");
  await database.delete(staffUnavailability).where(and(eq(staffUnavailability.id, id), eq(staffUnavailability.staffMemberId, staffMemberId)));
}

export async function getEmployeeWeek(staffMemberId: number, weekStart: string): Promise<WeekSnapshot> {
  const snapshot = await getWeekSnapshot(weekStart);
  const employeeUnavailabilities = snapshot.unavailabilities.filter((entry) => entry.staffMemberId === staffMemberId);
  if (!snapshot.week || snapshot.week.status !== "published") return { ...snapshot, shifts: [], unavailabilities: employeeUnavailabilities };
  return { ...snapshot, shifts: snapshot.shifts.filter((shift) => shift.memberIds.includes(staffMemberId)), unavailabilities: employeeUnavailabilities };
}
