import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { usePlanning } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from "react-native";

export default function Login() {
  const router = useRouter();
  const { login } = usePlanning();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!code.trim()) return;
    setSubmitting(true);
    try {
      await login(code);
      router.replace("/(tabs)");
    } catch (error) {
      Alert.alert(
        "Accès refusé",
        error instanceof Error ? error.message : "Ce code est incorrect, désactivé ou ne correspond à aucun salarié.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer className="px-5">
      <View className="pt-3 flex-row items-center justify-between">
        <Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          <Text className="text-base font-bold text-primary">Retour</Text>
        </Pressable>
      </View>
      <View className="mt-4">
        <Text className="text-sm font-semibold uppercase tracking-widest text-primary">Thionville</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Mon accès</Text>
      </View>
      <View className="mt-7 rounded-3xl bg-foreground p-5">
        <View className="h-14 w-14 rounded-2xl bg-primary items-center justify-center">
          <IconSymbol name="lock.fill" size={22} color="#FFFFFF" />
        </View>
        <Text className="mt-4 text-xl font-bold text-white">Accéder au planning</Text>
        <Text className="mt-2 text-sm leading-5 text-white/70">
          Utilisez le code transmis par votre responsable. Aucun compte n’est nécessaire.
        </Text>
      </View>
      <View className="mt-6 gap-4">
        <TextInput
          value={code}
          onChangeText={(value) => setCode(value.toUpperCase())}
          placeholder="Ex : 7K4P-9QRT"
          placeholderTextColor="#60788A"
          autoCapitalize="characters"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={submit}
          className="h-14 rounded-2xl bg-surface border border-border px-4 text-base font-bold tracking-widest text-foreground"
        />
        <Pressable
          onPress={submit}
          disabled={submitting || !code.trim()}
          style={({ pressed }) => ({ opacity: pressed || submitting || !code.trim() ? 0.6 : 1 })}
          className="rounded-2xl bg-primary py-4 flex-row items-center justify-center gap-2"
        >
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <IconSymbol name="checkmark.circle.fill" size={19} color="#FFFFFF" />}
          <Text className="text-base font-bold text-white">Valider</Text>
        </Pressable>
        <Text className="text-center text-xs leading-4 text-muted">
          Demandez un code à l’administrateur du restaurant. Il peut être régénéré à tout moment depuis l’espace admin.
        </Text>
      </View>
    </ScreenContainer>
  );
}
