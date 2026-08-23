import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { StaffMember } from "../../drizzle/schema";
import { verifySessionToken } from "./codeAuth";
import * as db from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: StaffMember | null;
};

function getBearerToken(req: CreateExpressContextOptions["req"]): string | undefined {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return undefined;
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: StaffMember | null = null;

  try {
    const token = getBearerToken(opts.req);
    const session = await verifySessionToken(token);
    if (session) {
      const member = await db.getStaffMemberById(session.staffMemberId);
      if (member && member.active) user = member;
    }
  } catch (error) {
    // L'authentification est optionnelle pour les procédures publiques.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
