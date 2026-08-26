import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { usePlanning } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { FlatList, Pressable, Text, View } from "react-native";

export default function TeamScreen() {
  const router = useRouter();
  const { snapshot, isAdmin } = usePlanning();
  return (
    <ScreenContainer>
      <FlatList
        data={snapshot.members}
        keyExtractor={(member) => String(member.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 28, gap: 12 }}
        ListHeaderComponent={<View className="mb-4"><Text className="text-sm font-semibold uppercase tracking-widest text-primary">Organisation</Text><Text className="mt-1 text-3xl font-bold text-foreground">L’équipe</Text><Text className="mt-1 text-base text-muted">{snapshot.members.length} collaborateurs au service{isAdmin ? " · Touchez une fiche pour la modifier." : "."}</Text></View>}
        renderItem={({ item: member }) => {
          const card = <View className="rounded-3xl bg-surface border border-border p-4 flex-row items-center gap-3"><View style={{ backgroundColor: member.color }} className="h-12 w-12 rounded-2xl items-center justify-center"><Text className="text-sm font-bold text-white">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Text></View><View className="flex-1"><Text className="text-base font-bold text-foreground">{member.name}</Text><View className="mt-1 flex-row items-center gap-1"><IconSymbol name="briefcase.fill" size={13} color="#687076" /><Text className="text-sm text-muted">{member.jobTitle}</Text></View></View>{isAdmin ? <View className="items-end"><Text className="text-xs font-bold text-primary">Modifier</Text><IconSymbol name="chevron.right" size={20} color="#687076" /></View> : null}</View>;
          if (!isAdmin) return card;
          return <Pressable onPress={() => router.push({ pathname: "/staff-editor", params: { id: String(member.id) } })} accessibilityRole="button" accessibilityLabel={`Modifier ${member.name}`} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}>{card}</Pressable>;
        }}
      />
    </ScreenContainer>
  );
}
