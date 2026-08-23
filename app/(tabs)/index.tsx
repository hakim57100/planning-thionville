import { IconSymbol } from "@/components/ui/icon-symbol";
import { ShiftCard, StatusPill } from "@/components/planning-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatFrenchDate } from "@/lib/planning-utils";
import { usePlanning } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

export default function HomeScreen() {
  const router = useRouter();
  const { snapshot, role, isDemo } = usePlanning();
  const today = new Date();
  const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const upcoming = [...snapshot.shifts].sort((a, b) => `${a.serviceDate}${a.startsAt}`.localeCompare(`${b.serviceDate}${b.startsAt}`)).find((shift) => shift.serviceDate >= todayIso) ?? snapshot.shifts[0];

  return (
    <ScreenContainer>
      <FlatList
        data={[{ key: "home" }]}
        keyExtractor={(item) => item.key}
        contentContainerStyle={{ padding: 20, paddingBottom: 28 }}
        renderItem={() => (
          <View className="gap-5">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-4">
                <Text className="text-sm font-semibold uppercase tracking-widest text-primary">Planning · Thionville</Text>
                <Text className="mt-2 text-3xl leading-9 font-bold text-foreground">Bonjour{isDemo ? ", Camille" : ""}</Text>
                <Text className="mt-1 text-base text-muted capitalize">{formatFrenchDate(todayIso)}</Text>
              </View>
              <StatusPill />
            </View>

            {isDemo && <View className="rounded-2xl bg-primary px-4 py-3 flex-row gap-3">
              <IconSymbol name="lock.fill" size={18} color="#FFFFFF" />
              <Text className="flex-1 text-sm leading-5 text-white">Vous consultez l’aperçu. Connectez-vous depuis votre profil pour accéder à l’équipe réelle.</Text>
            </View>}

            <View className="rounded-[28px] bg-foreground px-5 py-5 overflow-hidden">
              <View className="absolute -right-5 -top-7 h-28 w-28 rounded-full bg-primary opacity-40" />
              <Text className="text-sm font-semibold text-white/70">{role === "admin" ? "Semaine en cours" : "Votre prochain service"}</Text>
              <Text className="mt-2 text-2xl font-bold text-white">{role === "admin" ? `${snapshot.shifts.length} services à organiser` : upcoming ? `${upcoming.startsAt} — ${upcoming.endsAt}` : "Aucun service"}</Text>
              <Text className="mt-1 text-sm text-white/70">{role === "admin" ? snapshot.week?.status === "published" ? "Le planning est visible par l’équipe." : "Finalisez-le puis publiez-le." : upcoming?.position ?? "Votre planning sera visible ici."}</Text>
              <Pressable onPress={() => router.push(role === "admin" ? "/(tabs)/manage" : "/(tabs)/planning")} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })} className="self-start mt-5 rounded-full bg-white px-4 py-2.5">
                <Text className="text-sm font-bold text-foreground">{role === "admin" ? "Gérer la semaine" : "Voir mon planning"}</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center justify-between mt-1">
              <Text className="text-xl font-bold text-foreground">À venir</Text>
              <Pressable onPress={() => router.push("/(tabs)/planning")} style={({ pressed }) => ({ opacity: pressed ? 0.55 : 1 })}>
                <Text className="text-sm font-bold text-primary">Tout voir</Text>
              </Pressable>
            </View>
            {upcoming ? <ShiftCard shift={upcoming} /> : <EmptyState text="Aucun service prévu sur cette semaine." />}

            <View className="rounded-3xl bg-surface border border-border px-5 py-4 flex-row items-center gap-4">
              <View className="h-11 w-11 rounded-2xl bg-[#F4E6DE] items-center justify-center"><IconSymbol name="person.2.fill" size={21} color="#C96442" /></View>
              <View className="flex-1"><Text className="font-bold text-foreground">{snapshot.members.length} membres dans l’équipe</Text><Text className="mt-1 text-sm text-muted">Tous les services sont centralisés ici.</Text></View>
              <IconSymbol name="chevron.right" size={20} color="#687076" />
            </View>
          </View>
        )}
      />
    </ScreenContainer>
  );
}

function EmptyState({ text }: { text: string }) {
  return <View className="rounded-3xl border border-dashed border-border px-5 py-8 items-center"><IconSymbol name="calendar" size={28} color="#687076" /><Text className="mt-3 text-center text-sm text-muted">{text}</Text></View>;
}
