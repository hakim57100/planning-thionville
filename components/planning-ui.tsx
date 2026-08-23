import { IconSymbol } from "@/components/ui/icon-symbol";
import { formatFrenchDate } from "@/lib/planning-utils";
import { exportPlanningImage, exportPlanningPdf } from "@/lib/planning-export";
import { getShiftStyle } from "@/lib/shift-style";
import { usePlanning, useWeekDays } from "@/providers/planning-provider";
import { Alert, Pressable, Text, View } from "react-native";

export function WeekNavigator() {
  const { changeWeek, weekStart } = usePlanning();
  const days = useWeekDays();
  return <View className="rounded-3xl bg-surface px-3 py-3 border border-border"><View className="flex-row items-center justify-between px-1 mb-3"><Pressable onPress={() => changeWeek(-1)} accessibilityLabel="Semaine précédente" style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}><IconSymbol name="chevron.left" size={24} color="#006491" /></Pressable><Text className="text-sm font-semibold text-foreground capitalize">{formatFrenchDate(weekStart, { day: "numeric", month: "long", year: "numeric" })}</Text><Pressable onPress={() => changeWeek(1)} accessibilityLabel="Semaine suivante" style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}><IconSymbol name="chevron.right" size={24} color="#006491" /></Pressable></View><View className="flex-row justify-between">{days.map((day) => <View key={day.iso} className="items-center w-10"><Text className="text-[11px] text-muted capitalize">{day.shortLabel}</Text><View className="mt-1 h-8 w-8 rounded-full bg-background items-center justify-center"><Text className="text-sm font-semibold text-foreground">{day.date.getDate()}</Text></View></View>)}</View></View>;
}

export function ShiftCard({ shift, compact = false, onPress }: { shift: { id: number; startsAt: string; endsAt: string; position: string; note: string | null; memberIds: number[] }; compact?: boolean; onPress?: () => void }) {
  const { snapshot } = usePlanning();
  const assigned = snapshot.members.filter((member) => shift.memberIds.includes(member.id));
  const visualStyle = getShiftStyle(shift.position);
  const card = <View style={{ borderLeftWidth: 5, borderLeftColor: visualStyle.color }} className="rounded-3xl bg-surface border border-border px-4 py-4"><View className="flex-row justify-between gap-3"><View className="flex-row gap-3 flex-1"><View style={{ backgroundColor: visualStyle.color }} className="h-11 w-11 rounded-2xl items-center justify-center"><IconSymbol name="clock.fill" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="text-base leading-5 font-semibold text-foreground">{shift.position}</Text><Text className="mt-1 text-sm text-muted">{shift.startsAt} — {shift.endsAt}</Text></View></View>{!compact && <View style={{ backgroundColor: visualStyle.softColor }} className="rounded-full px-2 py-1 self-start"><Text style={{ color: visualStyle.textColor }} className="text-xs font-semibold">{visualStyle.label}</Text></View>}</View>{!compact && assigned.length > 0 && <View className="mt-4 flex-row items-center gap-2"><View className="flex-row">{assigned.slice(0, 4).map((member, index) => <View key={member.id} style={{ backgroundColor: member.color, marginLeft: index ? -7 : 0 }} className="h-7 w-7 rounded-full border-2 border-surface items-center justify-center"><Text className="text-[9px] font-bold text-white">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Text></View>)}</View><Text className="text-xs text-muted flex-1" numberOfLines={1}>{assigned.map((member) => member.name.split(" ")[0]).join(" · ")}</Text></View>}{!compact && shift.note && <Text className="mt-3 text-xs leading-4 text-muted">{shift.note}</Text>}</View>;
  return onPress ? <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>{card}</Pressable> : card;
}

export function PlanningExportButton({ shifts, compact = false }: { shifts?: Array<{ serviceDate: string; startsAt: string; endsAt: string; position: string; note: string | null; memberIds: number[] }>; compact?: boolean }) {
  const { snapshot, visibleShifts, weekStart, showOnlyMine } = usePlanning();
  const data = shifts ?? visibleShifts;
  const scopeLabel = showOnlyMine && !shifts ? "Mes horaires" : "Planning de l’équipe";
  const payload = { weekStart, shifts: data, members: snapshot.members, scopeLabel };
  const handleExport = () => Alert.alert("Exporter la semaine", "Choisissez un format à télécharger ou partager.", [{ text: "PDF", onPress: () => void exportPlanningPdf(payload).catch((error) => Alert.alert("Export impossible", error instanceof Error ? error.message : "Une erreur est survenue.")) }, { text: "Image", onPress: () => void exportPlanningImage(payload).catch((error) => Alert.alert("Export impossible", error instanceof Error ? error.message : "Une erreur est survenue.")) }, { text: "Annuler", style: "cancel" }]);
  return <Pressable onPress={handleExport} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className={compact ? "rounded-xl bg-surface border border-border p-3 items-center" : "rounded-2xl bg-foreground px-4 py-3 flex-row items-center justify-center gap-2"}><IconSymbol name="square.and.arrow.up" size={18} color={compact ? "#006491" : "#FFFFFF"} /><Text className={compact ? "mt-1 text-xs font-bold text-foreground" : "text-sm font-bold text-white"}>{compact ? "Exporter" : "Exporter la semaine"}</Text></Pressable>;
}

export function StatusPill() {
  const { snapshot, isDemo } = usePlanning();
  const published = snapshot.week?.status === "published";
  return <View className={`self-start flex-row items-center rounded-full px-3 py-1.5 ${published ? "bg-success" : "bg-warning"}`}><IconSymbol name={published ? "checkmark.circle.fill" : "pencil"} size={14} color="#FFFFFF" /><Text className="ml-1.5 text-xs font-bold text-white">{isDemo ? "Aperçu · " : ""}{published ? "Publié" : "Brouillon"}</Text></View>;
}
