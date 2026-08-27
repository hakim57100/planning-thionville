import { PlanningExcelImportButton } from "@/components/planning-excel-import-button";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { PlanningExportButton, ShiftCard, StatusPill, WeekNavigator } from "@/components/planning-ui";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { usePlanning } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { Alert, FlatList, Pressable, Text, View } from "react-native";

type PublicationCheck = ReturnType<typeof usePlanning>["publicationCheck"];

function listIssues(items: PublicationCheck["blocking"], maximum = 4) {
  const lines = items.slice(0, maximum).map((item, index) => `${index + 1}. ${item.message}`);
  if (items.length > maximum) lines.push(`… et ${items.length - maximum} autre${items.length - maximum > 1 ? "s" : ""} problème${items.length - maximum > 1 ? "s" : ""}.`);
  return lines.join("\n");
}

function validationDescription(check: PublicationCheck) {
  if (check.blocking.length) return `${check.blocking.length} correction${check.blocking.length > 1 ? "s" : ""} obligatoire${check.blocking.length > 1 ? "s" : ""} avant publication.`;
  if (check.warnings.length) return `${check.warnings.length} avertissement${check.warnings.length > 1 ? "s" : ""} à vérifier avant publication.`;
  return "Aucun conflit ou indisponibilité détecté. Le planning est prêt à être publié.";
}

export default function ManageScreen() {
  const router = useRouter();
  const { snapshot, isAdmin, publishWeek, duplicateWeekToNext, isDemo, publicationCheck, checkBeforePublish } = usePlanning();

  const showCheck = (check: PublicationCheck) => {
    if (!check.blocking.length && !check.warnings.length) {
      Alert.alert("Contrôle terminé", "Aucun conflit, salarié indisponible, profil inactif ou service vide n’a été détecté.");
      return;
    }
    const sections: string[] = [];
    if (check.blocking.length) sections.push(`CORRECTIONS OBLIGATOIRES\n${listIssues(check.blocking)}`);
    if (check.warnings.length) sections.push(`AVERTISSEMENTS\n${listIssues(check.warnings)}`);
    Alert.alert(check.blocking.length ? "Publication à corriger" : "Avertissements à vérifier", sections.join("\n\n"));
  };

  const completePublication = async () => {
    try {
      const result = await publishWeek();
      haptic.success();
      if (result.alreadyPublished) {
        Alert.alert("Planning déjà publié", "Cette semaine reste disponible. Aucune nouvelle alerte n’a été créée pour éviter les doublons.");
        return;
      }
      Alert.alert(
        "Planning publié",
        result.notifiedStaffCount
          ? `Le planning est publié. Une alerte est prête pour ${result.notifiedStaffCount} salarié${result.notifiedStaffCount > 1 ? "s" : ""}.`
          : "Le planning est publié. Aucun salarié actif n’est actuellement à alerter.",
      );
    } catch (error) {
      Alert.alert("Publication impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
    }
  };

  const publish = async () => {
    try {
      const check = await checkBeforePublish();
      if (check.blocking.length) {
        showCheck(check);
        return;
      }
      if (check.warnings.length) {
        Alert.alert(
          "Avertissements à vérifier",
          `${listIssues(check.warnings)}\n\nVous pouvez corriger ces situations ou publier quand même si elles sont intentionnelles.`,
          [
            { text: "Retour au planning", style: "cancel" },
            { text: "Publier quand même", style: "destructive", onPress: () => void completePublication() },
          ],
        );
        return;
      }
      Alert.alert(
        "Publier le planning ?",
        "Le contrôle ne détecte aucun problème. Les salariés pourront consulter cette semaine et recevront une alerte dans l’application.",
        [
          { text: "Annuler", style: "cancel" },
          { text: "Publier", onPress: () => void completePublication() },
        ],
      );
    } catch (error) {
      Alert.alert("Contrôle impossible", error instanceof Error ? error.message : "Le planning ne peut pas être contrôlé pour le moment.");
    }
  };

  const duplicate = () => {
    if (!snapshot.shifts.length) {
      Alert.alert("Aucun service à dupliquer", "Ajoutez au moins un service à cette semaine avant de la copier.");
      return;
    }
    Alert.alert(
      "Dupliquer sur la semaine suivante ?",
      "Les services, leurs horaires et les salariés affectés seront copiés à J+7. La nouvelle semaine restera en brouillon. Une semaine déjà remplie ne sera jamais écrasée.",
      [
        { text: "Annuler", style: "cancel" },
        { text: "Dupliquer", onPress: async () => {
          try {
            const result = await duplicateWeekToNext();
            haptic.success();
            Alert.alert("Planning dupliqué", `${result.copiedShiftCount} service${result.copiedShiftCount > 1 ? "s" : ""} ont été copiés pour la semaine du ${result.weekStart}.`);
          } catch (error) {
            Alert.alert("Duplication impossible", error instanceof Error ? error.message : "Une erreur est survenue.");
          }
        } },
      ],
    );
  };

  if (!isAdmin) return <ScreenContainer className="items-center justify-center px-8"><IconSymbol name="lock.fill" size={34} color="#687076" /><Text className="mt-4 text-xl font-bold text-foreground">Accès administrateur requis</Text><Text className="mt-2 text-center text-muted">Cet espace est réservé à la création et à la publication des plannings.</Text></ScreenContainer>;

  const hasBlocking = publicationCheck.blocking.length > 0;
  const hasWarnings = publicationCheck.warnings.length > 0;
  const validationColor = hasBlocking ? "#B42318" : hasWarnings ? "#9A6700" : "#087443";
  const validationBackground = hasBlocking ? "#FFF1F0" : hasWarnings ? "#FFF7E8" : "#ECFDF3";
  const validationBorder = hasBlocking ? "#F4C7C3" : hasWarnings ? "#F5D49A" : "#B7E4C7";
  const validationIcon = hasBlocking ? "exclamationmark.triangle.fill" : hasWarnings ? "exclamationmark.circle.fill" : "checkmark.circle.fill";

  return (
    <ScreenContainer>
      <FlatList
        data={snapshot.shifts}
        keyExtractor={(shift) => String(shift.id)}
        contentContainerStyle={{ padding: 20, paddingBottom: 30, gap: 12 }}
        ListHeaderComponent={
          <View className="gap-5 mb-5">
            <View className="flex-row justify-between items-start">
              <View className="flex-1 pr-3">
                <Text className="text-sm font-semibold uppercase tracking-widest text-primary">Administration</Text>
                <Text className="mt-1 text-3xl font-bold text-foreground">Gérer le planning</Text>
                <Text className="mt-1 text-base text-muted">Créez les créneaux et affectez l’équipe.</Text>
              </View>
              <StatusPill />
            </View>
            <WeekNavigator />
            {isDemo && <Text className="text-xs leading-4 text-muted">Les modifications réalisées dans l’aperçu restent visibles sur cet appareil. Connectez-vous pour synchroniser le planning avec votre équipe.</Text>}

            <Pressable onPress={() => showCheck(publicationCheck)} accessibilityRole="button" accessibilityLabel="Voir le contrôle avant publication" style={({ pressed }) => ({ opacity: pressed ? 0.74 : 1 })}>
              <View style={{ backgroundColor: validationBackground, borderColor: validationBorder }} className="rounded-2xl border px-4 py-4 flex-row items-center gap-3">
                <View style={{ backgroundColor: validationColor }} className="h-10 w-10 rounded-xl items-center justify-center">
                  <IconSymbol name={validationIcon} size={20} color="#FFFFFF" />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-foreground">Contrôle avant publication</Text>
                  <Text className="mt-1 text-xs leading-4 text-muted">{validationDescription(publicationCheck)}</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color={validationColor} />
              </View>
            </Pressable>

            <Pressable onPress={() => router.push("/day-composer")} accessibilityRole="button" accessibilityLabel="Composer une journée avec des cases de salariés" style={({ pressed }) => ({ opacity: pressed ? 0.74 : 1 })}><View className="rounded-2xl bg-[#FDE8EC] border border-[#F0B8C5] px-4 py-4 flex-row items-center gap-3"><View className="h-10 w-10 rounded-xl bg-primary items-center justify-center"><IconSymbol name="person.2.fill" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="font-bold text-foreground">Composer une journée</Text><Text className="mt-1 text-xs leading-4 text-muted">Placez l’équipe dans des cases midi et soir, avec les horaires individuels.</Text></View><IconSymbol name="chevron.right" size={20} color="#C01432" /></View></Pressable>
            <Pressable onPress={() => router.push("/week-templates")} accessibilityRole="button" accessibilityLabel="Gérer les modèles de semaine" style={({ pressed }) => ({ opacity: pressed ? 0.74 : 1 })}><View className="rounded-2xl bg-[#ECFDF3] border border-[#B7E4C7] px-4 py-4 flex-row items-center gap-3"><View className="h-10 w-10 rounded-xl bg-[#087443] items-center justify-center"><IconSymbol name="calendar" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="font-bold text-foreground">Modèles de semaine</Text><Text className="mt-1 text-xs leading-4 text-muted">Enregistrez une semaine type et réappliquez-la uniquement sur une semaine vide.</Text></View><IconSymbol name="chevron.right" size={20} color="#087443" /></View></Pressable>
            <View className="flex-row gap-3"><AdminButton label="Ajouter un service" icon="plus" onPress={() => router.push("/shift-editor")} /><AdminButton label="Ajouter un salarié" icon="person.2.fill" onPress={() => router.push("/staff-editor")} /></View>
            <View className="flex-row gap-3"><PlanningExcelImportButton /><PlanningExportButton shifts={snapshot.shifts} compact /></View>
            <Pressable onPress={duplicate} accessibilityRole="button" accessibilityLabel="Dupliquer le planning sur la semaine suivante" style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}><View className="rounded-2xl bg-[#E4F1FB] border border-[#B9D9ED] px-4 py-4 flex-row items-center gap-3"><View className="h-10 w-10 rounded-xl bg-primary items-center justify-center"><IconSymbol name="calendar" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="font-bold text-foreground">Dupliquer la semaine suivante</Text><Text className="mt-1 text-xs leading-4 text-muted">Copie les services et les affectations à J+7, en brouillon.</Text></View><IconSymbol name="chevron.right" size={20} color="#006491" /></View></Pressable>
            <Pressable onPress={() => router.push("/dashboard")} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}><View className="rounded-2xl bg-foreground px-4 py-4 flex-row items-center gap-3"><View className="h-10 w-10 rounded-xl bg-primary items-center justify-center"><IconSymbol name="chart.bar.fill" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="font-bold text-white">Tableau de bord des heures</Text><Text className="mt-1 text-xs text-white/70">Consultez le total hebdomadaire par salarié.</Text></View><IconSymbol name="chevron.right" size={20} color="#FFFFFF" /></View></Pressable>
          </View>
        }
        renderItem={({ item }) => <ShiftCard shift={item} onPress={() => router.push({ pathname: "/shift-editor", params: { id: String(item.id) } })} />}
        ListEmptyComponent={<View className="rounded-3xl bg-surface p-6 items-center"><IconSymbol name="calendar" size={30} color="#60788A" /><Text className="mt-3 text-center font-semibold text-foreground">Aucun service cette semaine</Text><Text className="mt-1 text-center text-sm text-muted">Ajoutez un premier créneau pour démarrer.</Text></View>}
        ListFooterComponent={<Pressable onPress={() => void publish()} style={({ pressed }) => ({ opacity: pressed ? 0.78 : 1 })}><View className="mt-5 rounded-2xl bg-primary py-4 flex-row justify-center items-center gap-2"><IconSymbol name="checkmark.circle.fill" size={20} color="#FFFFFF" /><Text className="text-base font-bold text-white">{snapshot.week?.status === "published" ? "Mettre à jour la publication" : "Vérifier et publier la semaine"}</Text></View></Pressable>}
      />
    </ScreenContainer>
  );
}

function AdminButton({ label, icon, onPress }: { label: string; icon: "plus" | "person.2.fill"; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}><View className="rounded-2xl bg-surface border border-border px-3 py-3"><IconSymbol name={icon} size={20} color="#C96442" /><Text className="mt-2 text-sm font-bold text-foreground">{label}</Text></View></Pressable>;
}
