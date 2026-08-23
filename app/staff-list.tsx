import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { usePlanning } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, View } from "react-native";

export default function StaffList() {
  const router = useRouter();
  const { snapshot, regenerateStaffCode, setStaffActive } = usePlanning();

  const onRegenerate = (id: number, name: string) => {
    Alert.alert(
      "Régénérer le code",
      `L’ancien code de ${name} cessera de fonctionner immédiatement. Continuer ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Régénérer",
          style: "destructive",
          onPress: async () => {
            const code = await regenerateStaffCode(id);
            haptic.success();
            if (code) {
              Alert.alert("Nouveau code", `Nouveau code d’accès de ${name} :\n\n${code}\n\nCommuniquez-le lui, il ne sera plus jamais affiché en clair.`);
            }
          },
        },
      ],
    );
  };

  const onToggleActive = (id: number, name: string, active: boolean) => {
    Alert.alert(
      active ? "Désactiver l’accès" : "Réactiver l’accès",
      active
        ? `${name} ne pourra plus se connecter avec son code tant que l’accès n’est pas réactivé.`
        : `${name} pourra de nouveau se connecter avec son code existant.`,
      [
        { text: "Annuler", style: "cancel" },
        { text: active ? "Désactiver" : "Réactiver", onPress: async () => { await setStaffActive(id, !active); haptic.success(); } },
      ],
    );
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5">
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text className="text-base font-bold text-primary">Retour</Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Salariés</Text>
        <Pressable onPress={() => router.push("/staff-editor")} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
          <Text className="text-base font-bold text-primary">Ajouter</Text>
        </Pressable>
      </View>

      <View className="mt-6 gap-3">
        {snapshot.members.map((member) => {
          const active = member.active !== false;
          return (
            <View key={member.id} className={`rounded-2xl border p-4 ${active ? "bg-surface border-border" : "bg-surface/50 border-border opacity-60"}`}>
              <View className="flex-row items-center gap-3">
                <View style={{ backgroundColor: member.color }} className="h-10 w-10 rounded-full items-center justify-center">
                  <Text className="text-sm font-bold text-white">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Text>
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-foreground">{member.name}</Text>
                  <Text className="mt-0.5 text-sm text-muted">{member.jobTitle}{member.role === "admin" ? " · Admin" : ""}</Text>
                </View>
                {!active && (
                  <View className="rounded-full bg-error/10 px-2.5 py-1">
                    <Text className="text-xs font-bold text-error">Désactivé</Text>
                  </View>
                )}
              </View>
              <View className="mt-3 flex-row gap-3">
                <Pressable onPress={() => onRegenerate(member.id, member.name)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="flex-1 flex-row items-center justify-center gap-1.5 rounded-xl bg-[#E4F1FB] py-2.5">
                  <IconSymbol name="arrow.clockwise" size={16} color="#006491" />
                  <Text className="text-xs font-bold text-[#006491]">Régénérer le code</Text>
                </Pressable>
                <Pressable onPress={() => onToggleActive(member.id, member.name, active)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className={`flex-1 flex-row items-center justify-center gap-1.5 rounded-xl py-2.5 ${active ? "bg-error/10" : "bg-[#E3F3EA]"}`}>
                  <IconSymbol name="power" size={16} color={active ? "#B3261E" : "#1E7A46"} />
                  <Text className={`text-xs font-bold ${active ? "text-error" : "text-[#1E7A46]"}`}>{active ? "Désactiver" : "Réactiver"}</Text>
                </Pressable>
              </View>
            </View>
          );
        })}
        {snapshot.members.length === 0 && (
          <Text className="mt-8 text-center text-sm text-muted">Aucun salarié pour le moment.</Text>
        )}
      </View>
    </ScreenContainer>
  );
}
