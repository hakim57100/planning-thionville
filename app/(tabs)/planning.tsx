import { PlanningExportButton, ShiftCard, WeekNavigator } from "@/components/planning-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatFrenchDate } from "@/lib/planning-utils";
import { usePlanning, useWeekDays } from "@/providers/planning-provider";
import { FlatList, Pressable, Text, View } from "react-native";

export default function PlanningScreen() {
  const { role, visibleShifts, showOnlyMine, setShowOnlyMine, personalMember } = usePlanning();
  const days = useWeekDays();
  return (
    <ScreenContainer>
      <FlatList
        data={days}
        keyExtractor={(day) => day.iso}
        contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 18 }}
        ListHeaderComponent={<View className="gap-5 mb-1"><View><Text className="text-sm font-semibold uppercase tracking-widest text-primary">{role === "admin" ? "Vue équipe" : "Espace salarié"}</Text><Text className="mt-1 text-3xl font-bold text-foreground">{role === "admin" ? "Planning de la semaine" : "Mon planning"}</Text><Text className="mt-1 text-base text-muted">Vos horaires, service par service.</Text></View><WeekNavigator /><View className="flex-row gap-3"><Pressable onPress={() => setShowOnlyMine(!showOnlyMine)} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className={`flex-1 rounded-2xl border px-4 py-3 ${showOnlyMine ? "bg-primary border-primary" : "bg-surface border-border"}`}><Text className={`text-sm font-bold ${showOnlyMine ? "text-white" : "text-foreground"}`}>{showOnlyMine ? "Mes horaires" : "Filtrer mes horaires"}</Text><Text className={`mt-1 text-xs ${showOnlyMine ? "text-white/80" : "text-muted"}`}>{personalMember ? personalMember.name : "Aucun profil associé"}</Text></Pressable><PlanningExportButton compact /></View></View>}
        renderItem={({ item: day }) => {
          const shifts = visibleShifts.filter((shift) => shift.serviceDate === day.iso);
          return <View className="gap-3"><Text className="text-base font-bold text-foreground capitalize">{formatFrenchDate(day.iso)}</Text>{shifts.length ? shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} />) : <View className="rounded-2xl border border-dashed border-border px-4 py-4"><Text className="text-sm text-muted">Repos ou aucun service programmé.</Text></View>}</View>;
        }}
      />
    </ScreenContainer>
  );
}
