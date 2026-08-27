import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { formatFrenchDate } from "@/lib/planning-utils";
import { usePlanning } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";

function formatTemplateDate(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value));
}

export default function WeekTemplatesScreen() {
  const router = useRouter();
  const {
    isAdmin,
    isDemo,
    snapshot,
    weekStart,
    weekTemplates,
    saveWeekAsTemplate,
    renameWeekTemplate,
    deleteWeekTemplate,
    applyWeekTemplate,
  } = usePlanning();
  const [templateName, setTemplateName] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isAdmin) {
    return <ScreenContainer className="items-center justify-center px-8"><IconSymbol name="lock.fill" size={34} color="#687076" /><Text className="mt-4 text-xl font-bold text-foreground">Accès administrateur requis</Text><Text className="mt-2 text-center text-muted">Les modèles de semaine sont réservés à l’administration.</Text></ScreenContainer>;
  }

  const save = async () => {
    const name = templateName.trim();
    if (name.length < 2) {
      Alert.alert("Nom requis", "Donnez un nom d’au moins 2 caractères à ce modèle, par exemple « Semaine standard ».");
      return;
    }
    if (!snapshot.shifts.length) {
      Alert.alert("Aucun service", "Ajoutez au moins un service à cette semaine avant de l’enregistrer comme modèle.");
      return;
    }
    try {
      setBusy(true);
      const result = await saveWeekAsTemplate(name);
      setTemplateName("");
      haptic.success();
      Alert.alert("Modèle enregistré", `« ${result.name} » contient ${result.savedShiftCount} service${result.savedShiftCount > 1 ? "s" : ""}, avec les cases, affectations et horaires individuels.`);
    } catch (error) {
      Alert.alert("Enregistrement impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const apply = (id: number, name: string) => {
    if (snapshot.shifts.length) {
      Alert.alert("Semaine déjà remplie", "Pour protéger votre planning, un modèle ne peut être appliqué que sur une semaine sans aucun service. Aucune donnée n’a été modifiée.");
      return;
    }
    Alert.alert(
      "Appliquer ce modèle ?",
      `« ${name} » sera copié sur la semaine du ${formatFrenchDate(weekStart)}. La semaine restera en brouillon.`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Appliquer",
          onPress: async () => {
            try {
              setBusy(true);
              const result = await applyWeekTemplate(id);
              haptic.success();
              const inactiveInfo = result.inactiveMemberNames.length
                ? `\n\nÀ vérifier avant publication : ${result.inactiveMemberNames.join(", ")} est/sont inactif(s).`
                : "";
              Alert.alert("Modèle appliqué", `${result.appliedShiftCount} service${result.appliedShiftCount > 1 ? "s" : ""} ont été ajoutés à cette semaine en brouillon.${inactiveInfo}`);
            } catch (error) {
              Alert.alert("Application impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const rename = async () => {
    if (editingId === null) return;
    const name = editingName.trim();
    if (name.length < 2) {
      Alert.alert("Nom requis", "Le nom doit contenir au moins 2 caractères.");
      return;
    }
    try {
      setBusy(true);
      await renameWeekTemplate(editingId, name);
      setEditingId(null);
      haptic.success();
    } catch (error) {
      Alert.alert("Renommage impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  };

  const remove = (id: number, name: string) => {
    Alert.alert("Supprimer ce modèle ?", `« ${name} » sera supprimé. Les plannings créés à partir de ce modèle resteront inchangés.`, [
      { text: "Annuler", style: "cancel" },
      {
        text: "Supprimer", style: "destructive", onPress: async () => {
          try {
            setBusy(true);
            await deleteWeekTemplate(id);
            if (editingId === id) setEditingId(null);
            haptic.success();
          } catch (error) {
            Alert.alert("Suppression impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }} keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour à la gestion du planning" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-base font-bold text-primary">Retour</Text></Pressable>
          <Text className="text-base font-bold text-foreground">Modèles de semaine</Text>
          <View className="w-12" />
        </View>

        <View className="mt-6 rounded-3xl bg-[#E4F1FB] border border-[#B9D9ED] p-4">
          <View className="flex-row items-start gap-3"><View className="h-10 w-10 rounded-xl bg-primary items-center justify-center"><IconSymbol name="calendar" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="font-bold text-foreground">Préparez une semaine type</Text><Text className="mt-1 text-xs leading-4 text-muted">Un modèle conserve les services, le nombre de cases, les salariés, les notes et les horaires individuels. Il s’applique uniquement sur une semaine entièrement vide.</Text></View></View>
        </View>

        {isDemo && <View className="mt-4 rounded-2xl bg-[#FFF7E8] border border-[#F5D49A] p-4"><Text className="font-bold text-foreground">Aperçu non synchronisé</Text><Text className="mt-1 text-xs leading-4 text-muted">Connectez-vous avec le compte administrateur pour enregistrer et appliquer les modèles de votre équipe.</Text></View>}

        <Text className="mt-7 text-sm font-bold text-foreground">Enregistrer la semaine affichée</Text>
        <Text className="mt-1 text-xs leading-4 text-muted">Semaine du {formatFrenchDate(weekStart)} · {snapshot.shifts.length} service{snapshot.shifts.length > 1 ? "s" : ""} à sauvegarder.</Text>
        <View className="mt-3 rounded-2xl bg-surface border border-border p-3">
          <TextInput value={templateName} onChangeText={setTemplateName} placeholder="Ex. Semaine standard" placeholderTextColor="#8B969C" editable={!busy} maxLength={120} className="rounded-xl bg-background border border-border px-3 py-3 text-base text-foreground" accessibilityLabel="Nom du nouveau modèle" />
          <Pressable onPress={() => void save()} disabled={busy} accessibilityRole="button" accessibilityLabel="Enregistrer la semaine comme modèle" style={({ pressed }) => ({ opacity: busy || pressed ? 0.65 : 1 })}><View className="mt-3 rounded-xl bg-primary py-3 flex-row justify-center items-center gap-2"><IconSymbol name="checkmark.circle.fill" size={18} color="#FFFFFF" /><Text className="font-bold text-white">{busy ? "Traitement…" : "Enregistrer comme modèle"}</Text></View></Pressable>
        </View>

        <View className="mt-8 flex-row items-end justify-between gap-3"><View className="flex-1"><Text className="text-sm font-bold text-foreground">Vos modèles enregistrés</Text><Text className="mt-1 text-xs leading-4 text-muted">Appliquez l’un d’eux à la semaine actuellement affichée dans Gérer.</Text></View><View className="rounded-full bg-primary/10 px-3 py-1"><Text className="text-xs font-bold text-primary">{weekTemplates.length}</Text></View></View>

        <View className="mt-3 gap-3">
          {weekTemplates.map((template) => {
            const editing = editingId === template.id;
            return <View key={template.id} className="rounded-2xl bg-surface border border-border p-4"><View className="flex-row items-start gap-3"><View className="h-10 w-10 rounded-xl bg-[#FDE8EC] items-center justify-center"><IconSymbol name="calendar" size={19} color="#C01432" /></View><View className="flex-1"><Text className="text-base font-bold text-foreground">{template.name}</Text><Text className="mt-1 text-xs text-muted">{template.shiftCount} service{template.shiftCount > 1 ? "s" : ""} · Enregistré le {formatTemplateDate(template.createdAt)}</Text></View></View>
              {editing ? <View className="mt-4"><TextInput value={editingName} onChangeText={setEditingName} editable={!busy} maxLength={120} className="rounded-xl bg-background border border-border px-3 py-3 text-base text-foreground" accessibilityLabel={`Nouveau nom pour ${template.name}`} /><View className="mt-3 flex-row gap-2"><SmallButton label="Annuler" onPress={() => setEditingId(null)} /><SmallButton label="Enregistrer" primary onPress={() => void rename()} /></View></View> : <><Pressable onPress={() => apply(template.id, template.name)} disabled={busy} accessibilityRole="button" accessibilityLabel={`Appliquer le modèle ${template.name}`} style={({ pressed }) => ({ opacity: busy || pressed ? 0.65 : 1 })}><View className="mt-4 rounded-xl bg-[#E4F1FB] border border-[#B9D9ED] py-3 flex-row justify-center items-center gap-2"><IconSymbol name="calendar" size={17} color="#006491" /><Text className="font-bold text-primary">Appliquer à cette semaine vide</Text></View></Pressable><View className="mt-3 flex-row gap-2"><SmallButton label="Renommer" onPress={() => { setEditingId(template.id); setEditingName(template.name); }} /><SmallButton label="Supprimer" destructive onPress={() => remove(template.id, template.name)} /></View></>}
            </View>;
          })}
          {!weekTemplates.length && <View className="rounded-2xl bg-surface border border-border p-6 items-center"><IconSymbol name="calendar" size={28} color="#60788A" /><Text className="mt-3 text-center font-bold text-foreground">Aucun modèle pour le moment</Text><Text className="mt-1 text-center text-sm leading-5 text-muted">Préparez une semaine complète, puis donnez-lui un nom pour la réutiliser rapidement.</Text></View>}
        </View>

        <View className="mt-7 rounded-2xl bg-[#ECFDF3] border border-[#B7E4C7] p-4"><Text className="font-bold text-foreground">Protection contre l’écrasement</Text><Text className="mt-1 text-xs leading-4 text-muted">Si la semaine cible contient déjà un seul service, l’application bloque l’opération avant toute modification. Un modèle appliqué reste toujours en brouillon et passe ensuite par le contrôle avant publication.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function SmallButton({ label, onPress, primary = false, destructive = false }: { label: string; onPress: () => void; primary?: boolean; destructive?: boolean }) {
  const textColor = destructive ? "#B42318" : primary ? "#FFFFFF" : "#006491";
  const backgroundColor = destructive ? "#FFF1F0" : primary ? "#006491" : "#FFFFFF";
  const borderColor = destructive ? "#F4C7C3" : primary ? "#006491" : "#B9D9ED";
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label} style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.65 : 1 })}><View style={{ backgroundColor, borderColor }} className="rounded-xl border py-2.5 items-center"><Text style={{ color: textColor }} className="text-sm font-bold">{label}</Text></View></Pressable>;
}
