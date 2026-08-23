import { describe, expect, it } from "vitest";
import { generateAccessCode, hashAccessCode, verifyAccessCode } from "../server/_core/codeAuth";

describe("codeAuth", () => {
  it("génère des codes au format lisible XXXX-XXXX", () => {
    const code = generateAccessCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("vérifie un code correct après hachage", () => {
    const code = generateAccessCode();
    const hash = hashAccessCode(code);
    expect(verifyAccessCode(code, hash)).toBe(true);
  });

  it("rejette un code incorrect", () => {
    const hash = hashAccessCode(generateAccessCode());
    expect(verifyAccessCode("0000-0000", hash)).toBe(false);
  });

  it("ignore la casse et les espaces", () => {
    const code = generateAccessCode();
    const hash = hashAccessCode(code);
    const spaced = ` ${code.toLowerCase()} `;
    expect(verifyAccessCode(spaced, hash)).toBe(true);
  });
});
