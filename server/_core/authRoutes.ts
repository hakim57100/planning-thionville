import type { Express, Request, Response } from "express";
import * as db from "../db";
import { createSessionToken, verifyAccessCode } from "./codeAuth";
import { toPublicStaffMember } from "../../drizzle/schema";

function getBearerToken(req: Request): string | undefined {
  const header = req.headers.authorization || req.headers.Authorization;
  if (typeof header === "string" && header.startsWith("Bearer ")) {
    return header.slice("Bearer ".length).trim();
  }
  return undefined;
}

export function registerAuthRoutes(app: Express) {
  // Connexion par code d'accès : renvoie un token de session (utilisé par le client,
  // web comme mobile, via l'en-tête Authorization: Bearer <token>).
  app.post("/api/auth/code-login", async (req: Request, res: Response) => {
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    if (!code.trim()) {
      res.status(400).json({ error: "Code requis" });
      return;
    }

    try {
      const members = await db.getActiveStaffMembersWithCode();
      const match = members.find((member) => verifyAccessCode(code, member.codeHash));

      if (!match) {
        res.status(401).json({ error: "Ce code est incorrect, désactivé ou ne correspond à aucun salarié." });
        return;
      }

      const token = await createSessionToken({ staffMemberId: match.id, role: match.role });
      res.json({ token, user: toPublicStaffMember(match) });
    } catch (error) {
      console.error("[Auth] code-login failed:", error);
      res.status(500).json({ error: "Erreur serveur lors de la connexion." });
    }
  });

  app.post("/api/auth/logout", (_req: Request, res: Response) => {
    // Sans état côté serveur : le client supprime simplement son token stocké.
    res.json({ success: true });
  });

  app.get("/api/auth/me", async (req: Request, res: Response) => {
    try {
      const token = getBearerToken(req);
      const { verifySessionToken } = await import("./codeAuth");
      const session = await verifySessionToken(token);
      if (!session) {
        res.status(401).json({ error: "Not authenticated", user: null });
        return;
      }
      const member = await db.getStaffMemberById(session.staffMemberId);
      if (!member || !member.active) {
        res.status(401).json({ error: "Not authenticated", user: null });
        return;
      }
      res.json({ user: toPublicStaffMember(member) });
    } catch (error) {
      console.error("[Auth] /api/auth/me failed:", error);
      res.status(401).json({ error: "Not authenticated", user: null });
    }
  });
}
