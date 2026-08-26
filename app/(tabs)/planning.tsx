import { IconSymbol } from "@/components/ui/icon-symbol";
import { PlanningExportButton, ShiftCard, WeekNavigator } from "@/components/planning-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatFrenchDate } from "@/lib/planning-utils";
import { usePlanning, useWeekDays } from "@/providers/planning-provider";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

export default function PlanningScreen() {
  const {
    role,
    visibleShifts,
    showOnlyMine,
    setShowOnlyMine,
    personalMember,
    notifications,
    unreadNotificationCount,
    markNotificationRead,
    setWeekStart,
  } = usePlanning();
  const days = useWeekDays();
  const latestUnreadNotification = notifications.find((notification) => !notification.readAt);

  const openLatestNotification = async () => {
    if (!latestUnreadNotification) return;
    setWeekStart(latestUnreadNotification.weekStart);
    await markNotificationRead(latestUnreadNotification.id);
  };

  return (
    <ScreenContainer>
      <FlatList
        data={days}
        keyExtractor={(day) => day.iso}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View className="gap-5 mb-1">
            <View>
              <Text className="text-sm font-semibold uppercase tracking-widest text-primary">
                {role === "admin" ? "Vue équipe" : "Espace salarié"}
              </Text>
              <Text className="mt-1 text-3xl font-bold text-foreground">
                {role === "admin" ? "Planning de la semaine" : "Mon planning"}
              </Text>
              <Text className="mt-1 text-base text-muted">Vos horaires, service par service.</Text>
            </View>

            {role === "employee" && latestUnreadNotification ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Ouvrir le nouveau planning"
                onPress={() => void openLatestNotification()}
                style={({ pressed }) => [styles.notificationCard, pressed && styles.notificationCardPressed]}
              >
                <View style={styles.notificationIcon}>
                  <IconSymbol name="bell.fill" size={20} color="#FFFFFF" />
                </View>
                <View style={styles.notificationText}>
                  <View style={styles.notificationTitleRow}>
                    <Text style={styles.notificationTitle}>{latestUnreadNotification.title}</Text>
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>{unreadNotificationCount}</Text>
                    </View>
                  </View>
                  <Text style={styles.notificationMessage}>{latestUnreadNotification.message}</Text>
                  <Text style={styles.notificationAction}>Appuyez pour ouvrir le planning</Text>
                </View>
                <IconSymbol name="chevron.right" size={20} color="#006491" />
              </Pressable>
            ) : null}

            <WeekNavigator />
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setShowOnlyMine(!showOnlyMine)}
                style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}
                className={`flex-1 rounded-2xl border px-4 py-3 ${showOnlyMine ? "bg-primary border-primary" : "bg-surface border-border"}`}
              >
                <Text className={`text-sm font-bold ${showOnlyMine ? "text-white" : "text-foreground"}`}>
                  {showOnlyMine ? "Mes horaires" : "Filtrer mes horaires"}
                </Text>
                <Text className={`mt-1 text-xs ${showOnlyMine ? "text-white/80" : "text-muted"}`}>
                  {personalMember ? personalMember.name : "Aucun profil associé"}
                </Text>
              </Pressable>
              <PlanningExportButton compact />
            </View>
          </View>
        }
        renderItem={({ item: day }) => {
          const shifts = visibleShifts.filter((shift) => shift.serviceDate === day.iso);
          return (
            <View className="gap-3">
              <Text className="text-base font-bold text-foreground capitalize">{formatFrenchDate(day.iso)}</Text>
              {shifts.length ? (
                shifts.map((shift) => <ShiftCard key={shift.id} shift={shift} />)
              ) : (
                <View className="rounded-2xl border border-dashed border-border px-4 py-4">
                  <Text className="text-sm text-muted">Repos ou aucun service programmé.</Text>
                </View>
              )}
            </View>
          );
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: 20, paddingBottom: 28, gap: 18 },
  notificationCard: {
    alignItems: "center",
    backgroundColor: "#E4F1FB",
    borderColor: "#9DCCE8",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  notificationCardPressed: { opacity: 0.76 },
  notificationIcon: {
    alignItems: "center",
    backgroundColor: "#006491",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  notificationText: { flex: 1, gap: 2 },
  notificationTitleRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  notificationTitle: { color: "#12384E", flexShrink: 1, fontSize: 15, fontWeight: "800" },
  notificationMessage: { color: "#31566C", fontSize: 13, lineHeight: 18 },
  notificationAction: { color: "#006491", fontSize: 12, fontWeight: "700", marginTop: 2 },
  notificationBadge: {
    alignItems: "center",
    backgroundColor: "#E31837",
    borderRadius: 10,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
  },
  notificationBadgeText: { color: "#FFFFFF", fontSize: 11, fontWeight: "800" },
});
