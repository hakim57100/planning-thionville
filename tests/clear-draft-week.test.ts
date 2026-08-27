import { describe, expect, it } from "vitest";
import { assertDraftWeekCanBeCleared } from "../server/draftWeekUtils";

describe("effacement de brouillon", () => {
  it("autorise uniquement une semaine existante encore en brouillon", () => {
    expect(() => assertDraftWeekCanBeCleared({
      weekStart: "2026-09-07",
      exists: true,
      status: "draft",
    })).not.toThrow();
  });

  it("refuse une semaine publiée avant toute suppression", () => {
    expect(() => assertDraftWeekCanBeCleared({
      weekStart: "2026-09-07",
      exists: true,
      status: "published",
    })).toThrow("déjà publiée");
  });

  it("refuse une semaine qui n’existe pas", () => {
    expect(() => assertDraftWeekCanBeCleared({
      weekStart: "2026-09-07",
      exists: false,
      status: undefined,
    })).toThrow("introuvable");
  });
});
