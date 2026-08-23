import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { usePlanning } from "@/providers/planning-provider";
import type { PlanningRole } from "@/lib/demo-planning";
import { useRouter } from "expo-router";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { useState } from "react";

const colors = ["#C96442", "#3E826E", "#5B6FA8", "#A57947", "#8C5A8C"];

export default function StaffEditor() {
  const router = useRouter();
  const { createStaffMember } = usePlanning();
  const [name, setName] = useState("");
  const [jobTitle, setJobTitle] = useState("Serveur·se");
  const [email, setEmail] = useState("");
  const [color, setColor] = useState(colors[0]);
  const [role, setRole] = useState<PlanningRole>("employee");

  const save = async () => {
    if (name.trim().length < 2 || jobTitle.trim().length < 2) {
      Alert.alert("Informations manquantes", "Indiquez un nom et un poste pour ce salarié.");
      return;
    }
    const code = await createStaffMember({ name: name.trim(), jobTitle: jobTitle.trim(), email: email.trim() || null, color, role });
    haptic.success();
    if (code) {
      Alert.alert(
        "Salarié ajouté",
        `Code d’accès de ${name.trim()} :\n\n${code}\n\nCommuniquez-le lui, il ne sera plus jamais affiché en clair. Vous pourrez le régénérer depuis la fiche du salarié si besoin.`,
        [{ text: "OK", onPress: () => router.back() }],
      );
    } else {
      router.back();
    }
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]} className="px-5">
      <View className="mt-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text className="text-base font-bold text-primary">Annuler</Text>
        </Pressable>
        <Text className="text-base font-bold text-foreground">Nouveau salarié</Text>
        <Pressable onPress={save} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}>
          <Text className="text-base font-bold text-primary">Ajouter</Text>
        </Pressable>
      </View>
      <View className="mt-8 gap-5">
        <FormField label="Nom complet" value={name} onChangeText={setName} />
        <FormField label="Poste" value={jobTitle} onChangeText={setJobTitle} />
        <FormField label="E-mail professionnel (facultatif)" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <View>
          <Text className="mb-2 text-sm font-bold text-foreground">Rôle</Text>
          <View className="flex-row gap-3">
            <RoleChip label="Salarié" active={role === "employee"} onPress={() => setRole("employee")} />
            <RoleChip label="Administrateur" active={role === "admin"} onPress={() => setRole("admin")} />
          </View>
        </View>
        <View>
          <Text className="mb-2 text-sm font-bold text-foreground">Couleur d’identification</Text>
          <View className="flex-row gap-3">
            {colors.map((item) => (
              <Pressable
                key={item}
                onPress={() => setColor(item)}
                style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, backgroundColor: item })}
                className={`h-10 w-10 rounded-full ${color === item ? "border-4 border-foreground" : ""}`}
              />
            ))}
          </View>
        </View>
        <Text className="text-xs leading-4 text-muted">
          Un code d’accès unique sera généré automatiquement et affiché une seule fois après l’ajout.
        </Text>
      </View>
    </ScreenContainer>
  );
}

function RoleChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })} className={`flex-1 rounded-2xl border px-3 py-3 ${active ? "bg-primary border-primary" : "bg-surface border-border"}`}>
      <Text className={`text-center text-sm font-bold ${active ? "text-white" : "text-foreground"}`}>{label}</Text>
    </Pressable>
  );
}

function FormField({ label, value, onChangeText, keyboardType = "default" }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "email-address" }) {
  return (
    <View>
      <Text className="mb-2 text-sm font-bold text-foreground">{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : "words"} returnKeyType="done" className="h-13 rounded-2xl bg-surface border border-border px-4 text-base text-foreground" />
    </View>
  );
}
