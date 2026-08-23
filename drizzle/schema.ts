import { boolean, integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", ["admin", "employee"]);
export const periodEnum = pgEnum("period", ["all_day", "midi", "soir"]);
export const weekStatusEnum = pgEnum("week_status", ["draft", "published"]);

// Unifié : chaque salarié (y compris les admins) se connecte avec un code d'accès.
// Le code n'est jamais stocké en clair, seulement son empreinte (hash).
export const staffMembers = pgTable("staff_members", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull(),
  email: varchar("email", { length: 320 }),
  jobTitle: varchar("jobTitle", { length: 120 }).notNull(),
  color: varchar("color", { length: 16 }).notNull().default("#C96442"),
  role: roleEnum("role").notNull().default("employee"),
  codeHash: varchar("codeHash", { length: 200 }).notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const staffUnavailability = pgTable("staff_unavailability", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  staffMemberId: integer("staffMemberId").notNull(),
  serviceDate: varchar("serviceDate", { length: 10 }).notNull(),
  period: periodEnum("period").notNull().default("all_day"),
  reason: varchar("reason", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const planningWeeks = pgTable("planning_weeks", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  weekStart: varchar("weekStart", { length: 10 }).notNull().unique(),
  status: weekStatusEnum("status").notNull().default("draft"),
  publishedAt: timestamp("publishedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const shifts = pgTable("shifts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  planningWeekId: integer("planningWeekId").notNull(),
  serviceDate: varchar("serviceDate", { length: 10 }).notNull(),
  startsAt: varchar("startsAt", { length: 5 }).notNull(),
  endsAt: varchar("endsAt", { length: 5 }).notNull(),
  position: varchar("position", { length: 120 }).notNull(),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const shiftAssignments = pgTable("shift_assignments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  shiftId: integer("shiftId").notNull(),
  staffMemberId: integer("staffMemberId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffMember = typeof staffMembers.$inferSelect;
export type InsertStaffMember = typeof staffMembers.$inferInsert;
export type StaffUnavailability = typeof staffUnavailability.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type PlanningWeek = typeof planningWeeks.$inferSelect;

// Vue "publique" d'un salarié : jamais le codeHash.
export type PublicStaffMember = Omit<StaffMember, "codeHash">;
export function toPublicStaffMember(member: StaffMember): PublicStaffMember {
  const { codeHash, ...rest } = member;
  return rest;
}
