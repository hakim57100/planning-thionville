import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { SignJWT, jwtVerify } from "jose";
import { ENV } from "./env";

// --- Génération de codes d'accès lisibles (ex: "7K4P-9QRT") ---
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"; // sans 0/O/1/I pour éviter la confusion

export function generateAccessCode(): string {
  const bytes = randomBytes(8);
  let raw = "";
  for (let i = 0; i < 8; i++) {
    raw += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

// --- Hachage (scrypt, natif à Node, pas de dépendance externe) ---
export function hashAccessCode(code: string): string {
  const normalized = normalizeCode(code);
  const salt = randomBytes(16);
  const derived = scryptSync(normalized, salt, 64);
  return `${salt.toString("hex")}:${derived.toString("hex")}`;
}

export function verifyAccessCode(code: string, storedHash: string): boolean {
  const normalized = normalizeCode(code);
  const [saltHex, hashHex] = storedHash.split(":");
  if (!saltHex || !hashHex) return false;
  const salt = Buffer.from(saltHex, "hex");
  const expected = Buffer.from(hashHex, "hex");
  const actual = scryptSync(normalized, salt, 64);
  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}

// --- Session JWT (remplace le cookie/JWT Manus) ---
export type SessionPayload = {
  staffMemberId: number;
  role: "admin" | "employee";
};

const ONE_YEAR_MS = 1000 * 60 * 60 * 24 * 365;

function getSecretKey() {
  if (!ENV.jwtSecret) {
    throw new Error("JWT_SECRET n'est pas configuré. Définissez-le dans les variables d'environnement.");
  }
  return new TextEncoder().encode(ENV.jwtSecret);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const issuedAt = Date.now();
  const expirationSeconds = Math.floor((issuedAt + ONE_YEAR_MS) / 1000);
  return new SignJWT({ staffMemberId: payload.staffMemberId, role: payload.role })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecretKey(), { algorithms: ["HS256"] });
    const { staffMemberId, role } = payload as Record<string, unknown>;
    if (typeof staffMemberId !== "number" || (role !== "admin" && role !== "employee")) return null;
    return { staffMemberId, role };
  } catch {
    return null;
  }
}
