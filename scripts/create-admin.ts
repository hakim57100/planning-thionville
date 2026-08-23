// Crée (ou met à jour) le tout premier compte administrateur.
// Usage : pnpm tsx scripts/create-admin.ts "Nom Complet" "MON-CODE"
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { eq } from "drizzle-orm";
import { staffMembers } from "../drizzle/schema";
import { hashAccessCode } from "../server/_core/codeAuth";

async function main() {
  const [name, code] = process.argv.slice(2);
  if (!name || !code) {
    console.error('Usage : pnpm tsx scripts/create-admin.ts "Nom Complet" "MON-CODE"');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL manquant : crée un fichier .env avec DATABASE_URL=... (voir .env.example)");
    process.exit(1);
  }

  const db = drizzle(process.env.DATABASE_URL);
  const codeHash = hashAccessCode(code);

  const existing = await db.select().from(staffMembers).where(eq(staffMembers.role, "admin"));

  if (existing.length > 0) {
    await db.update(staffMembers).set({ codeHash, name, active: true }).where(eq(staffMembers.id, existing[0].id));
    console.log(`✅ Admin existant mis à jour : ${name}, code = ${code}`);
  } else {
    await db.insert(staffMembers).values({ name, jobTitle: "Administrateur", color: "#C96442", role: "admin", codeHash, active: true });
    console.log(`✅ Compte admin créé : ${name}, code = ${code}`);
  }

  console.log("Conserve ce code précieusement — il ne sera plus jamais affiché.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Erreur :", error);
  process.exit(1);
});
