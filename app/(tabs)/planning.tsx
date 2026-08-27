import { IconSymbol } from "@/components/ui/icon-symbol";
import { PlanningExportButton, ShiftCard, WeekNavigator } from "@/components/planning-ui";
import { ScreenContainer } from "@/components/screen-container";
import { formatFrenchDate } from "@/lib/planning-utils";
import { usePlanning, useWeekDays } from "@/providers/planning-provider";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";

type PlannedMember = {
  id: number;
  name: string;
  jobTitle: string;
  color: string;
  shifts: Array<{ id: number; startsAt: string; endsAt: string; position: string }>;
};

export default function PlanningScreen() {
  const {
    role,
    snapshot,
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
  const [selectedDayIso, setSelectedDayIso] = useState("");
  const latestUnreadNotification = notifications.find((notification) => !notification.readAt);
  const selectedDay = days.find((day) => day.iso === selectedDayIso) ?? days[0];

  useEffect(() => {
    setSelectedDayIso(days[0]?.iso ?? "");
  }, [days[0]?.iso]);

  const plannedMembers = useMemo<PlannedMember[]>(() => {
    if (!selectedDay) return [];
    const shiftsForDay = snapshot.shifts.filter((shift) => shift.serviceDate === selectedDay.iso);

    return snapshot.members
      .filter((member) => member.active !== false)
      .map((member) => ({
        id: member.id,
        name: member.name,
        jobTitle: member.jobTitle,
        color: member.color,
        shifts: shiftsForDay
          .filter((shift) => shift.memberIds.includes(member.id))
          .map((shift) => ({ id: shift.id, startsAt: shift.startsAt, endsAt: shift.endsAt, position: shift.position }))
          .sort((first, second) => first.startsAt.localeCompare(second.startsAt)),
      }))
      .filter((member) => member.shifts.length > 0)
      .sort((first, second) => first.shifts[0].startsAt.localeCompare(second.shifts[0].startsAt) || first.name.localeCompare(second.name, "fr"));
  }, [selectedDay, snapshot.members, snapshot.shifts]);

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

            {role === "admin" && selectedDay ? (
              <View style={styles.daySection}>
                <View style={styles.daySectionHeading}>
                  <View>
                    <Text style={styles.daySectionEyebrow}>Équipe par jour</Text>
                    <Text style={styles.daySectionTitle}>Qui est programmé ?</Text>
                  </View>
                  <View style={styles.memberCountPill}>
                    <Text style={styles.memberCountText}>{plannedMembers.length}</Text>
                  </View>
                </View>

                <View style={styles.daySelector}>
                  {days.map((day) => {
                    const selected = day.iso === selectedDay.iso;
                    return (
                      <Pressable
                        key={day.iso}
                        accessibilityRole="button"
                        accessibilityLabel={`Afficher les personnes programmées ${formatFrenchDate(day.iso)}`}
                        onPress={() => setSelectedDayIso(day.iso)}
                        style={({ pressed }) => [styles.dayButton, selected && styles.dayButtonSelected, pressed && styles.dayButtonPressed]}
                      >
                        <Text style={[styles.dayButtonLabel, selected && styles.dayButtonLabelSelected]}>{day.shortLabel}</Text>
                        <Text style={[styles.dayButtonDate, selected && styles.dayButtonDateSelected]}>{day.iso.slice(-2)}</Text>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.daySelectedTitle}>{formatFrenchDate(selectedDay.iso)}</Text>
                {plannedMembers.length ? (
                  <View style={styles.plannedMembersList}>
                    {plannedMembers.map((member) => (
                      <View key={member.id} style={styles.plannedMemberRow}>
                        <View style={[styles.memberColor, { backgroundColor: member.color }]} />
                        <View style={styles.memberDetails}>
                          <Text style={styles.memberName}>{member.name}</Text>
                          <Text style={styles.memberSchedule} numberOfLines={1}>
                            {member.shifts.map((shift) => `${shift.startsAt}–${shift.endsAt} · ${shift.position}`).join("  |  ")}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : (
                  <View style={styles.emptyDay}>
                    <Text style={styles.emptyDayText}>Aucune personne n’est programmée ce jour.</Text>
                  </View>
                )}
              </View>
            ) : null}

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
  daySection: {
    backgroundColor: "#F5FAFD",
    borderColor: "#C8E0EF",
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 15,
  },
  daySectionHeading: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  daySectionEyebrow: { color: "#006491", fontSize: 11, fontWeight: "800", letterSpacing: 0.8, textTransform: "uppercase" },
  daySectionTitle: { color: "#12384E", fontSize: 18, fontWeight: "800", lineHeight: 23 },
  memberCountPill: { alignItems: "center", backgroundColor: "#006491", borderRadius: 14, justifyContent: "center", minWidth: 28, paddingHorizontal: 8, paddingVertical: 5 },
  memberCountText: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  daySelector: { flexDirection: "row", gap: 5, justifyContent: "space-between" },
  dayButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#C8E0EF",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    minHeight: 52,
    justifyContent: "center",
    paddingVertical: 5,
  },
  dayButtonSelected: { backgroundColor: "#006491", borderColor: "#006491" },
  dayButtonPressed: { opacity: 0.72 },
  dayButtonLabel: { color: "#41657A", fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  dayButtonLabelSelected: { color: "#FFFFFF" },
  dayButtonDate: { color: "#12384E", fontSize: 16, fontWeight: "800" },
  dayButtonDateSelected: { color: "#FFFFFF" },
  daySelectedTitle: { color: "#31566C", fontSize: 13, fontWeight: "700", textTransform: "capitalize" },
  plannedMembersList: { borderColor: "#D4E7F2", borderRadius: 13, borderWidth: 1, overflow: "hidden" },
  plannedMemberRow: { alignItems: "center", backgroundColor: "#FFFFFF", borderBottomColor: "#E1EEF5", borderBottomWidth: 1, flexDirection: "row", gap: 10, minHeight: 53, paddingHorizontal: 11, paddingVertical: 8 },
  memberColor: { borderRadius: 5, height: 30, width: 5 },
  memberDetails: { flex: 1, gap: 2 },
  memberName: { color: "#17384A", fontSize: 14, fontWeight: "800" },
  memberSchedule: { color: "#58717F", fontSize: 12, lineHeight: 16 },
  emptyDay: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#D4E7F2", borderRadius: 13, borderStyle: "dashed", borderWidth: 1, padding: 14 },
  emptyDayText: { color: "#58717F", fontSize: 13, textAlign: "center" },
});
