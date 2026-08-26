import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { type PlanningRole } from "@/lib/demo-planning";
import { usePlanning } from "@/providers/planning-provider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";

const colors = ["#C96442", "#3E826E", "#5B6FA8", "#A57947", "#8C5A8C"];

export default function StaffEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { snapshot, createStaffMember, updateStaffMember, setStaffActive, regenerateStaffCode } = usePlanning();
  const existing = snapshot.members.find((member) => String(member.id) === id);
  const isEditing = Boolean(existing);
  const [name, setName] = useState(existing?.name ?? "");
  const [jobTitle, setJobTitle] = useState(existing?.jobTitle ?? "Serveur·se");
  const [email, setEmail] = useState(existing?.email ?? "");
  const [color, setColor] = useState(existing?.color ?? colors[0]);
  const [role, setRole] = useState<PlanningRole>(existing?.role ?? "employee");

  const save = async () => {
    if (name.trim().length < 2 || jobTitle.trim().length < 2) {
      Alert.alert("Informations manquantes", "Indiquez un nom et un poste pour ce salarié.");
      return;
    }
    const input = { name: name.trim(), jobTitle: jobTitle.trim(), email: email.trim() || null, color, role };
    try {
      if (existing) {
        await updateStaffMember(existing.id, input);
        haptic.success();
        router.back();
        return;
      }
      const code = await createStaffMember(input);
      haptic.success();
      if (code) {
        Alert.alert(
          "Salarié ajouté",
          `Code d’accès de ${name.trim()} :\n\n${code}\n\nCommuniquez-le lui, il ne sera plus jamais affiché en clair.`,
          [{ text: "OK", onPress: () => router.back() }],
        );
      } else router.back();
    } catch (error) {
      Alert.alert("Enregistrement impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  const changeActiveStatus = () => {
    if (!existing) return;
    const nextActive = !existing.active;
    Alert.alert(
      nextActive ? "Réactiver ce salarié ?" : "Désactiver ce salarié ?",
      nextActive ? "Le salarié pourra à nouveau être affecté aux services." : "Le salarié ne sera plus proposé pour les nouveaux services.",
      [
        { text: "Annuler", style: "cancel" },
        { text: nextActive ? "Réactiver" : "Désactiver", style: nextActive ? "default" : "destructive", onPress: async () => { await setStaffActive(existing.id, nextActive); haptic.success(); router.back(); } },
      ],
    );
  };

  const resetCode = () => {
    if (!existing) return;
    Alert.alert("Régénérer le code ?", "L’ancien code cessera immédiatement de fonctionner.", [
      { text: "Annuler", style: "cancel" },
      { text: "Régénérer", onPress: async () => {
        try {
          const code = await regenerateStaffCode(existing.id);
          if (code) Alert.alert("Nouveau code d’accès", `Code de ${existing.name} :\n\n${code}\n\nCommuniquez-le au salarié : il ne sera plus affiché ensuite.`);
        } catch (error) {
          Alert.alert("Action impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
        }
      } },
    ]);
  };

  if (id && !existing) {
    return <ScreenContainer className="items-center justify-center px-8"><Text className="text-xl font-bold text-foreground">Profil introuvable</Text><Text className="mt-2 text-center text-muted">Ce salarié n’est plus disponible dans l’équipe active.</Text><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><Text className="mt-5 text-base font-bold text-primary">Retour</Text></Pressable></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5">
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-base font-bold text-primary">Annuler</Text></Pressable>
        <Text className="text-base font-bold text-foreground">{isEditing ? "Modifier le salarié" : "Nouveau salarié"}</Text>
        <Pressable onPress={() => void save()} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-base font-bold text-primary">{isEditing ? "Enregistrer" : "Ajouter"}</Text></Pressable>
      </View>
      <View className="mt-8 gap-5">
        <FormField label="Nom complet" value={name} onChangeText={setName} />
        <FormField label="Poste" value={jobTitle} onChangeText={setJobTitle} />
        <FormField label="E-mail professionnel (facultatif)" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <View><Text className="mb-2 text-sm font-bold text-foreground">Rôle</Text><View className="flex-row gap-3"><RoleChip label="Salarié" active={role === "employee"} onPress={() => setRole("employee")} /><RoleChip label="Administrateur" active={role === "admin"} onPress={() => setRole("admin")} /></View></View>
        <View><Text className="mb-2 text-sm font-bold text-foreground">Couleur d’identification</Text><View className="flex-row gap-3">{colors.map((item) => <Pressable key={item} onPress={() => setColor(item)} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: item })} className={`h-10 w-10 rounded-full ${color === item ? "border-4 border-foreground" : ""}`} />)}</View></View>
        {existing && <View className="mt-2 gap-3 border-t border-border pt-5"><Text className="text-sm font-bold text-foreground">Accès et statut</Text><Pressable onPress={resetCode} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="rounded-2xl bg-surface border border-border px-4 py-3"><Text className="font-bold text-foreground">Régénérer le code d’accès</Text><Text className="mt-1 text-xs text-muted">À utiliser en cas d’oubli ou de compromission du code.</Text></Pressable><Pressable onPress={changeActiveStatus} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className={`rounded-2xl border px-4 py-3 ${existing.active ? "border-error bg-[#FDE8EC]" : "border-success bg-[#E7F5ED]"}`}><Text className={`font-bold ${existing.active ? "text-error" : "text-success"}`}>{existing.active ? "Désactiver ce salarié" : "Réactiver ce salarié"}</Text><Text className="mt-1 text-xs text-muted">{existing.active ? "Il ne sera plus proposé pour les nouveaux services." : "Il redeviendra disponible pour les nouveaux services."}</Text></Pressable></View>}
      </View>
    </ScreenContainer>
  );
}

function RoleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })} className={`flex-1 rounded-2xl border px-3 py-3 ${active ? "bg-primary border-primary" : "bg-surface border-border"}`}><Text className={`text-center text-sm font-bold ${active ? "text-white" : "text-foreground"}`}>{label}</Text></Pressable>;
}

function FormField({ label, value, onChangeText, keyboardType = "default" }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "email-address" }) {
  return <View><Text className="mb-2 text-sm font-bold text-foreground">{label}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : "words"} returnKeyType="done" className="h-13 rounded-2xl bg-surface border border-border px-4 text-base text-foreground" /></View>;
}
