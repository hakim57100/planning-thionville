export type ShiftVisualStyle = { label: string; color: string; softColor: string; textColor: string };

const POSITION_STYLES: Array<{ terms: string[]; style: ShiftVisualStyle }> = [
  { terms: ["livreur", "livraison", "delivery"], style: { label: "Livreur", color: "#0E8A73", softColor: "#E1F5EF", textColor: "#076B58" } },
  { terms: ["cuisinier", "cuisine", "chef"], style: { label: "Cuisinier", color: "#E87820", softColor: "#FFF0E1", textColor: "#A84D09" } },
  { terms: ["manager", "management", "responsable"], style: { label: "Manager", color: "#6D4DB2", softColor: "#EFE9FB", textColor: "#543590" } },
  { terms: ["bar", "barman"], style: { label: "Bar", color: "#1674B8", softColor: "#E4F1FB", textColor: "#075489" } },
];

const DEFAULT_STYLE: ShiftVisualStyle = { label: "Service", color: "#E31837", softColor: "#FDE8EC", textColor: "#AD0D27" };

export function getShiftStyle(position: string): ShiftVisualStyle {
  const normalized = position.toLocaleLowerCase("fr-FR");
  return POSITION_STYLES.find((entry) => entry.terms.some((term) => normalized.includes(term)))?.style ?? DEFAULT_STYLE;
}
