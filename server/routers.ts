import { z } from "zod";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { toPublicStaffMember } from "../drizzle/schema";
import { generateAccessCode } from "./_core/codeAuth";
import * as db from "./db";

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const weekSchema = z.object({ weekStart: isoDateSchema });
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const shiftSchema = z.object({ weekStart: isoDateSchema, serviceDate: isoDateSchema, startsAt: timeSchema, endsAt: timeSchema, position: z.string().trim().min(2).max(120), note: z.string().trim().max(1000).optional(), memberIds: z.array(z.number().int().positive()).max(20) });
const unavailabilitySchema = z.object({ serviceDate: isoDateSchema, period: z.enum(["all_day", "midi", "soir"]), reason: z.string().trim().max(255).optional() });

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
    createStaffMember: adminProcedure.input(z.object({ name: z.string().trim().min(2).max(120), email: z.string().email().optional(), jobTitle: z.string().trim().min(2).max(120), color: z.string().regex(/^#[0-9A-Fa-f]{6}$/), role: z.enum(["admin", "employee"]).optional() })).mutation(async ({ input }) => {
      const code = generateAccessCode();
      const id = await db.createStaffMember(input, code);
      return { id, code };
    }),
    // Régénère le code d'un salarié (ex: code oublié/compromis) et le renvoie en clair.
    regenerateStaffCode: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      const code = generateAccessCode();
      await db.regenerateStaffCode(input.id, code);
      return { code };
    }),
    setStaffActive: adminProcedure.input(z.object({ id: z.number().int().positive(), active: z.boolean() })).mutation(({ input }) => db.setStaffActive(input.id, input.active)),
    createShift: adminProcedure.input(shiftSchema).mutation(({ input }) => db.createShift(input)),
    updateShift: adminProcedure.input(shiftSchema.partial().extend({ id: z.number().int().positive(), note: z.string().trim().max(1000).nullable().optional(), memberIds: z.array(z.number().int().positive()).max(20).optional() })).mutation(({ input }) => db.updateShift(input)),
    deleteShift: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => db.deleteShift(input.id)),
    publishWeek: adminProcedure.input(weekSchema).mutation(({ input }) => db.publishWeek(input.weekStart)),
    createUnavailability: protectedProcedure.input(unavailabilitySchema).mutation(({ ctx, input }) => db.createUnavailabilityForMember(ctx.user.id, input)),
    deleteUnavailability: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => db.deleteUnavailabilityForMember(ctx.user.id, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
