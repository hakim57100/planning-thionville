export function assertDraftWeekCanBeCleared(input: {
  weekStart: string;
  exists: boolean;
  status: "draft" | "published" | undefined;
}) {
  if (!input.exists) {
    throw new Error("Le brouillon de cette semaine est introuvable.");
  }

  if (input.status !== "draft") {
    throw new Error(`La semaine du ${input.weekStart} est déjà publiée et ne peut pas être effacée.`);
  }
}
