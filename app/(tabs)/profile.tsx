import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { useAuth } from "@/hooks/use-auth";
import { usePlanning } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { Pressable, Text, View } from "react-native";

export default function ProfileScreen() {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const { role, isDemo, setDemoRole } = usePlanning();

  return (
    <ScreenContainer className="px-5">
      <View className="pt-3">
        <Text className="text-sm font-semibold uppercase tracking-widest text-primary">Thionville</Text>
        <Text className="mt-1 text-3xl font-bold text-foreground">Profil</Text>
      </View>
      <View className="mt-7 rounded-[28px] bg-foreground p-5">
        <View className="h-14 w-14 rounded-2xl bg-primary items-center justify-center">
          <Text className="text-xl font-bold text-white">
            {(user?.name ?? "CB").split(" ").map((part) => part[0]).join("").slice(0, 2)}
          </Text>
        </View>
        <Text className="mt-4 text-xl font-bold text-white">{user?.name ?? "Aperçu"}</Text>
        <Text className="mt-1 text-sm text-white/70">
          {isAuthenticated ? user?.jobTitle : "Mode aperçu · Thionville"}
        </Text>
        <View className="mt-4 self-start rounded-full bg-white/15 px-3 py-1.5">
          <Text className="text-xs font-bold text-white">{role === "admin" ? "Administrateur" : "Salarié"}</Text>
        </View>
      </View>
      {isDemo ? (
        <View className="mt-6 gap-3">
          <Text className="text-base font-bold text-foreground">Tester l’expérience</Text>
          <Text className="text-sm leading-5 text-muted">
            Sélectionnez le rôle à prévisualiser, ou connectez-vous pour utiliser l’espace réel de votre restaurant.
          </Text>
          <View className="flex-row gap-3">
            <RoleOption label="Administrateur" active={role === "admin"} onPress={() => setDemoRole("admin")} />
            <RoleOption label="Salarié" active={role === "employee"} onPress={() => setDemoRole("employee")} />
          </View>
          {role === "employee" && <AvailabilityButton onPress={() => router.push("/unavailability")} />}
          <Pressable
            onPress={() => router.push("/login")}
            style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
            className="mt-3 rounded-2xl bg-primary py-4 flex-row justify-center items-center gap-2"
          >
            <IconSymbol name="lock.fill" size={19} color="#FFFFFF" />
            <Text className="text-base font-bold text-white">Se connecter</Text>
          </Pressable>
        </View>
      ) : (
        <View className="mt-6 gap-4">
          <InfoRow icon="briefcase.fill" label="Rôle" value={role === "admin" ? "Administrateur" : "Salarié"} />
          {role === "employee" && <AvailabilityButton onPress={() => router.push("/unavailability")} />}
          {role === "admin" && (
            <Pressable
              onPress={() => router.push("/staff-list")}
              style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
              className="rounded-2xl bg-[#E4F1FB] border border-[#BFE0F5] p-4 flex-row items-center gap-3"
            >
              <IconSymbol name="person.2.fill" size={21} color="#006491" />
              <View className="flex-1">
                <Text className="font-bold text-foreground">Gérer les salariés</Text>
                <Text className="mt-1 text-sm text-muted">Voir l’équipe et gérer les codes d’accès.</Text>
              </View>
              <IconSymbol name="chevron.right" size={20} color="#60788A" />
            </Pressable>
          )}
          <InfoRow icon="bell.fill" label="Notifications" value="Disponibles prochainement" />
          <Pressable
            onPress={() => void logout()}
            style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
            className="rounded-2xl border border-border py-4 items-center"
          >
            <Text className="font-bold text-error">Se déconnecter</Text>
          </Pressable>
        </View>
      )}
    </ScreenContainer>
  );
}

function AvailabilityButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })} className="rounded-2xl bg-[#FFF0E1] border border-[#F6D6A8] p-4 flex-row items-center gap-3">
      <IconSymbol name="calendar.badge.exclamationmark" size={21} color="#BD7B13" />
      <View className="flex-1">
        <Text className="font-bold text-foreground">Mes indisponibilités</Text>
        <Text className="mt-1 text-sm text-muted">Déclarez vos créneaux non disponibles.</Text>
      </View>
      <IconSymbol name="chevron.right" size={20} color="#60788A" />
    </Pressable>
  );
}

function RoleOption({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })} className={`flex-1 rounded-2xl border px-3 py-3 ${active ? "bg-primary border-primary" : "bg-surface border-border"}`}>
      <Text className={`text-center text-sm font-bold ${active ? "text-white" : "text-foreground"}`}>{label}</Text>
    </Pressable>
  );
}

function InfoRow({ icon, label, value }: { icon: "briefcase.fill" | "bell.fill"; label: string; value: string }) {
  return (
    <View className="rounded-2xl bg-surface border border-border p-4 flex-row gap-3 items-center">
      <IconSymbol name={icon} size={20} color="#006491" />
      <View>
        <Text className="text-xs text-muted">{label}</Text>
        <Text className="mt-1 text-sm font-bold text-foreground">{value}</Text>
      </View>
    </View>
  );
}
