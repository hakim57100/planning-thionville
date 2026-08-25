import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

import { IconSymbol } from "@/components/ui/icon-symbol";
import { usePlanning } from "@/providers/planning-provider";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

export function PlanningExcelImportButton() {
  const { importPlanningExcel, isDemo } = usePlanning();
  const [isImporting, setIsImporting] = useState(false);

  const chooseAndImport = async () => {
    if (isDemo) {
      Alert.alert("Connexion requise", "Connectez-vous avec un compte administrateur pour importer un planning.");
      return;
    }

    try {
      const selection = await DocumentPicker.getDocumentAsync({
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (selection.canceled) return;

      const file = selection.assets[0];
      if (!file || !/\.xlsx$/i.test(file.name)) {
        Alert.alert("Fichier non pris en charge", "Sélectionnez un fichier Excel au format .xlsx.");
        return;
      }
      if (file.size && file.size > MAX_FILE_SIZE) {
        Alert.alert("Fichier trop volumineux", "Le fichier Excel ne doit pas dépasser 5 Mo.");
        return;
      }

      setIsImporting(true);
      const contentBase64 = await FileSystem.readAsStringAsync(file.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const result = await importPlanningExcel({ filename: file.name, contentBase64 });
      Alert.alert(
        "Planning importé",
        `${result.importedShiftCount} créneaux ont été importés pour la semaine du ${result.weekStart}.`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Une erreur inconnue est survenue pendant l’import.";
      Alert.alert("Import impossible", message);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <Pressable
      onPress={() => void chooseAndImport()}
      disabled={isImporting}
      accessibilityLabel="Importer un planning Excel"
      style={({ pressed }) => [
        styles.button,
        { opacity: isImporting ? 0.55 : pressed ? 0.72 : 1 },
      ]}
    >
      <View className="flex-row items-center gap-2">
        <IconSymbol name="arrow.down.doc" size={20} color="#FFFFFF" />
        <Text className="flex-1 text-sm font-bold text-white">
          {isImporting ? "Import en cours…" : "Importer Excel"}
        </Text>
      </View>
      <Text className="mt-1 text-xs text-white/80">
        Remplace les imports Excel de la semaine, sans toucher aux saisies manuelles.
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: "#006491",
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
});
