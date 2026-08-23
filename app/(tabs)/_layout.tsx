import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useColors } from "@/hooks/use-colors";
import { usePlanning } from "@/providers/planning-provider";

export default function TabLayout() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { isAdmin } = usePlanning();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 56 + bottomPadding;
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.muted,
      headerShown: false,
      tabBarButton: HapticTab,
      tabBarStyle: { paddingTop: 8, paddingBottom: bottomPadding, height: tabBarHeight, backgroundColor: colors.background, borderTopColor: colors.border, borderTopWidth: 0.5 },
      tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
    }}>
      <Tabs.Screen name="index" options={{ title: "Accueil", tabBarIcon: ({ color }) => <IconSymbol size={25} name="house.fill" color={color} /> }} />
      <Tabs.Screen name="planning" options={{ title: "Planning", tabBarIcon: ({ color }) => <IconSymbol size={25} name="calendar" color={color} /> }} />
      <Tabs.Screen name="team" options={{ title: "Équipe", tabBarIcon: ({ color }) => <IconSymbol size={25} name="person.2.fill" color={color} /> }} />
      <Tabs.Screen name="manage" options={{ title: "Gérer", href: isAdmin ? undefined : null, tabBarIcon: ({ color }) => <IconSymbol size={25} name="slider.horizontal.3" color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: "Profil", tabBarIcon: ({ color }) => <IconSymbol size={25} name="person.crop.circle" color={color} /> }} />
    </Tabs>
  );
}
