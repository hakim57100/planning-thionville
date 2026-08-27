import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { toPublicStaffMember } from "../drizzle/schema";
import { generateAccessCode } from "./_core/codeAuth";
import * as db from "./db";
import { parsePlanningExcel } from "./planningExcel";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const weekSchema = z.object({ weekStart: isoDateSchema });
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const assignmentTimeSchema = z.object({ staffMemberId: z.number().int().positive(), startsAt: timeSchema, endsAt: timeSchema }).refine((value) => value.startsAt < value.endsAt, { message: "L’heure de fin doit être après l’heure de début." });
const shiftSchema = z.object({ weekStart: isoDateSchema, serviceDate: isoDateSchema, startsAt: timeSchema, endsAt: timeSchema, position: z.string().trim().min(2).max(120), requiredStaff: z.number().int().min(1).max(20).optional(), note: z.string().trim().max(1000).optional(), memberIds: z.array(z.number().int().positive()).max(20), assignmentTimes: z.array(assignmentTimeSchema).max(20).optional() });
const unavailabilitySchema = z.object({ serviceDate: isoDateSchema, period: z.enum(["all_day", "midi", "soir"]), reason: z.string().trim().max(255).optional() });
const staffMemberSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().optional(),
  jobTitle: z.string().trim().min(2).max(120),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  role: z.enum(["admin", "employee"]).optional(),
});
const excelImportSchema = z.object({
  filename: z.string().trim().regex(/^[^\\/]+\.xlsx$/i, "Le fichier doit être au format .xlsx.").max(180),
  contentBase64: z.string().trim().min(1).max(7 * 1024 * 1024),
});
const templateNameSchema = z.string().trim().min(2, "Le nom du modèle doit contenir au moins 2 caractères.").max(120);

export const appRouter = router({
  system: router({
    health: publicProcedure.query(() => ({ ok: true })),
  }),
  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? toPublicStaffMember(ctx.user) : null)),
    logout: publicProcedure.mutation(() => ({ success: true } as const)),
  }),
  planning: router({
    myWeek: protectedProcedure.input(weekSchema).query(({ ctx, input }) => ctx.user.role === "admin" ? db.getWeekSnapshot(input.weekStart) : db.getEmployeeWeek(ctx.user.id, input.weekStart)),
    fullWeek: adminProcedure.input(weekSchema).query(({ input }) => db.getWeekSnapshot(input.weekStart)),
    // Crée un salarié et renvoie son code d'accès en clair (à transmettre à la main, une seule fois).
    createStaffMember: adminProcedure.input(staffMemberSchema).mutation(async ({ input }) => {
      const code = generateAccessCode();
      const id = await db.createStaffMember(input, code);
      return { id, code };
    }),
    updateStaffMember: adminProcedure.input(staffMemberSchema.extend({ id: z.number().int().positive() })).mutation(({ input }) => {
      const { id, ...changes } = input;
      return db.updateStaffMember(id, changes);
    }),
    // Régénère le code d'un salarié (ex: code oublié/compromis) et le renvoie en clair.
    regenerateStaffCode: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const code = generateAccessCode();
      await db.regenerateStaffCode(input.id, code);
      return { code };
    }),
    setStaffActive: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(({ input }) => db.setStaffActive(input.id, input.active)),
    createShift: adminProcedure.input(shiftSchema).mutation(({ input }) => db.createShift(input)),
    importPlanningExcel: adminProcedure.input(excelImportSchema).mutation(async ({ input }) => {
      const file = Buffer.from(input.contentBase64, "base64");
      if (!file.length || file.length > 5 * 1024 * 1024) {
        throw new Error("Le fichier Excel est vide ou dépasse la limite de 5 Mo.");
      }
      const planning = parsePlanningExcel(file);
      return db.importPlanningExcel({ sourceFilename: input.filename, planning });
    }),
    updateShift: adminProcedure.input(shiftSchema.partial().extend({ id: z.number().int().positive(), note: z.string().trim().max(1000).nullable().optional(), memberIds: z.array(z.number().int().positive()).max(20).optional(), assignmentTimes: z.array(assignmentTimeSchema).max(20).optional() })).mutation(({ input }) => db.updateShift(input)),
    deleteShift: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteShift(input.id)),
    duplicateWeekToNext: adminProcedure.input(weekSchema).mutation(({ input }) => db.duplicateWeekToNext(input.weekStart)),
    duplicateWeekUndoInfo: adminProcedure.input(weekSchema).query(({ input }) => db.getDuplicateWeekUndoInfo(input.weekStart)),
    cancelDuplicatedWeek: adminProcedure.input(weekSchema).mutation(({ input }) => db.cancelDuplicatedWeek(input.weekStart)),
    listWeekTemplates: adminProcedure.query(() => db.listWeekTemplates()),
    saveWeekAsTemplate: adminProcedure
      .input(z.object({ weekStart: isoDateSchema, name: templateNameSchema }))
      .mutation(({ input }) => db.saveWeekAsTemplate(input)),
    renameWeekTemplate: adminProcedure
      .input(z.object({ id: z.number().int().positive(), name: templateNameSchema }))
      .mutation(({ input }) => db.renameWeekTemplate(input)),
    deleteWeekTemplate: adminProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ input }) => db.deleteWeekTemplate(input.id)),
    applyWeekTemplate: adminProcedure
      .input(z.object({ id: z.number().int().positive(), weekStart: isoDateSchema }))
      .mutation(({ input }) => db.applyWeekTemplate(input)),
    prePublishCheck: adminProcedure.input(weekSchema).query(({ input }) => db.getPublicationCheck(input.weekStart)),
    publishWeek: adminProcedure.input(weekSchema).mutation(({ input }) => db.publishWeek(input.weekStart)),
    notifications: protectedProcedure.query(({ ctx }) =>
      ctx.user.role === "employee" ? db.getStaffNotifications(ctx.user.id) : [],
    ),
    markNotificationRead: protectedProcedure
      .input(z.object({ id: z.number().int().positive() }))
      .mutation(({ ctx, input }) => db.markStaffNotificationRead(ctx.user.id, input.id)),
    createUnavailability: protectedProcedure.input(unavailabilitySchema).mutation(({ ctx, input }) => db.createUnavailabilityForMember(ctx.user.id, input)),
    deleteUnavailability: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteUnavailabilityForMember(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
