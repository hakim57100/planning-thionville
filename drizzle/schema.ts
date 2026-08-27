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

// Alerte personnelle affichée dans l’application. Une alerte est créée pour
// chaque salarié actif à la publication d’un planning et reste visible jusqu’à
// sa consultation.
export const staffNotifications = pgTable("staff_notifications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  staffMemberId: integer("staffMemberId").notNull(),
  planningWeekId: integer("planningWeekId").notNull(),
  weekStart: varchar("weekStart", { length: 10 }).notNull(),
  type: varchar("type", { length: 40 }).notNull().default("planning_published"),
  title: varchar("title", { length: 160 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  readAt: timestamp("readAt"),
});

export const shifts = pgTable("shifts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  planningWeekId: integer("planningWeekId").notNull(),
  serviceDate: varchar("serviceDate", { length: 10 }).notNull(),
  startsAt: varchar("startsAt", { length: 5 }).notNull(),
  endsAt: varchar("endsAt", { length: 5 }).notNull(),
  position: varchar("position", { length: 120 }).notNull(),
  requiredStaff: integer("requiredStaff").notNull().default(1),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const shiftAssignments = pgTable("shift_assignments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  shiftId: integer("shiftId").notNull(),
  staffMemberId: integer("staffMemberId").notNull(),
  startsAt: varchar("startsAt", { length: 5 }),
  endsAt: varchar("endsAt", { length: 5 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Un modèle représente une semaine type, indépendante des dates réelles.
// Les services sont enregistrés de J0 à J6 afin de pouvoir les transposer
// vers n’importe quelle semaine cible, sans jamais modifier la source.
export const planningWeekTemplates = pgTable("planning_week_templates", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  name: varchar("name", { length: 120 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const planningWeekTemplateShifts = pgTable("planning_week_template_shifts", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  templateId: integer("templateId").notNull(),
  dayOffset: integer("dayOffset").notNull(),
  startsAt: varchar("startsAt", { length: 5 }).notNull(),
  endsAt: varchar("endsAt", { length: 5 }).notNull(),
  position: varchar("position", { length: 120 }).notNull(),
  requiredStaff: integer("requiredStaff").notNull().default(1),
  note: text("note"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export const planningWeekTemplateAssignments = pgTable("planning_week_template_assignments", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  templateShiftId: integer("templateShiftId").notNull(),
  staffMemberId: integer("staffMemberId").notNull(),
  startsAt: varchar("startsAt", { length: 5 }).notNull(),
  endsAt: varchar("endsAt", { length: 5 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Trace le contenu exact créé par une duplication. Elle permet d’annuler la
// copie seulement tant que la semaine cible est restée brouillon et identique.
export const planningWeekDuplications = pgTable("planning_week_duplications", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  sourceWeekId: integer("sourceWeekId").notNull(),
  sourceWeekStart: varchar("sourceWeekStart", { length: 10 }).notNull(),
  targetWeekId: integer("targetWeekId").notNull().unique(),
  targetWeekStart: varchar("targetWeekStart", { length: 10 }).notNull(),
  targetFingerprint: varchar("targetFingerprint", { length: 64 }).notNull(),
  targetWeekCreated: boolean("targetWeekCreated").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type StaffMember = typeof staffMembers.$inferSelect;
export type InsertStaffMember = typeof staffMembers.$inferInsert;
export type StaffUnavailability = typeof staffUnavailability.$inferSelect;
export type Shift = typeof shifts.$inferSelect;
export type PlanningWeek = typeof planningWeeks.$inferSelect;
export type StaffNotification = typeof staffNotifications.$inferSelect;
export type PlanningWeekTemplate = typeof planningWeekTemplates.$inferSelect;
export type PlanningWeekTemplateShift = typeof planningWeekTemplateShifts.$inferSelect;
export type PlanningWeekTemplateAssignment = typeof planningWeekTemplateAssignments.$inferSelect;
export type PlanningWeekDuplication = typeof planningWeekDuplications.$inferSelect;

// Vue "publique" d’un salarié : jamais le codeHash.
export type PublicStaffMember = Omit<StaffMember, "codeHash">;
export function toPublicStaffMember(member: StaffMember): PublicStaffMember {
  const { codeHash, ...rest } = member;
  return rest;
}
