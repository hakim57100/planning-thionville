import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { formatFrenchDate, isValidShiftTime } from "@/lib/planning-utils";
import type { PlanningShift, ShiftAssignmentTime, Staff } from "@/lib/demo-planning";
import { usePlanning, useWeekDays } from "@/providers/planning-provider";
import { useRouter } from "expo-router";
import { createElement, useEffect, useMemo, useState } from "react";
import { Alert, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";

type ServiceTemplate = {
  key: "midi" | "soir";
  title: string;
  startsAt: string;
  endsAt: string;
  defaultStaff: number;
};

const SERVICE_TEMPLATES: ServiceTemplate[] = [
  { key: "midi", title: "Service du midi", startsAt: "11:30", endsAt: "15:00", defaultStaff: 4 },
  { key: "soir", title: "Service du soir", startsAt: "17:30", endsAt: "22:15", defaultStaff: 6 },
];

function defaultTimes(shift: PlanningShift, memberIds: number[]) {
  return memberIds.map((staffMemberId) => {
    const current = shift.assignmentTimes?.find((assignment) => assignment.staffMemberId === staffMemberId);
    return {
      staffMemberId,
      startsAt: current?.startsAt ?? shift.startsAt,
      endsAt: current?.endsAt ?? shift.endsAt,
    };
  });
}

export default function DayComposerScreen() {
  const router = useRouter();
  const days = useWeekDays();
  const { snapshot, isAdmin } = usePlanning();
  const [selectedDate, setSelectedDate] = useState(days[0]?.iso ?? "");
  const [selectedMemberId, setSelectedMemberId] = useState<number | null>(null);

  useEffect(() => {
    if (!days.some((day) => day.iso === selectedDate)) setSelectedDate(days[0]?.iso ?? "");
  }, [days, selectedDate]);

  const selectedDay = days.find((day) => day.iso === selectedDate) ?? days[0];
  const selectedMember = snapshot.members.find((member) => member.id === selectedMemberId) ?? null;

  if (!isAdmin) {
    return <ScreenContainer className="items-center justify-center px-8"><IconSymbol name="lock.fill" size={34} color="#687076" /><Text className="mt-4 text-xl font-bold text-foreground">Accès administrateur requis</Text><Text className="mt-2 text-center text-muted">La préparation visuelle des services est réservée à l’administrateur.</Text></ScreenContainer>;
  }

  return (
    <ScreenContainer edges={["top", "bottom", "left", "right"]}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 36 }}>
        <View className="flex-row items-center justify-between">
          <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour à la gestion du planning" style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-base font-bold text-primary">Retour</Text></Pressable>
          <Text className="text-base font-bold text-foreground">Composer une journée</Text>
          <View className="w-12" />
        </View>

        <View className="mt-6 rounded-3xl bg-[#E4F1FB] border border-[#B9D9ED] p-4">
          <View className="flex-row items-start gap-3"><View className="h-10 w-10 rounded-xl bg-primary items-center justify-center"><IconSymbol name="calendar" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="font-bold text-foreground">Préparation rapide par jour</Text><Text className="mt-1 text-xs leading-4 text-muted">Choisissez un salarié dans la liste, puis touchez une case vide. Chaque case possède ensuite ses propres heures de début et de fin.</Text></View></View>
        </View>

        <Text className="mt-6 mb-2 text-sm font-bold text-foreground">Choisir le jour</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="flex-row gap-2 pr-4">{days.map((day) => <DayChoice key={day.iso} label={`${day.shortLabel} ${day.date.getDate()}`} active={day.iso === selectedDate} onPress={() => { setSelectedDate(day.iso); setSelectedMemberId(null); }} />)}</View></ScrollView>
        {selectedDay && <Text className="mt-3 text-base font-bold capitalize text-foreground">{formatFrenchDate(selectedDay.iso)}</Text>}

        <Text className="mt-7 text-sm font-bold text-foreground">Équipe à placer</Text>
        <Text className="mt-1 text-xs leading-4 text-muted">Sélectionnez une personne, puis une case. Les indisponibilités du jour sont signalées.</Text>
        <View className="mt-3 flex-row flex-wrap gap-2">
          {snapshot.members.filter((member) => member.active !== false).map((member) => {
            const active = member.id === selectedMemberId;
            const unavailableAllDay = snapshot.unavailabilities.some((entry) => entry.staffMemberId === member.id && entry.serviceDate === selectedDate && entry.period === "all_day");
            const chip = <Pressable onPress={() => setSelectedMemberId(active ? null : member.id)} accessibilityRole="button" accessibilityLabel={`Sélectionner ou faire glisser ${member.name}`} style={({ pressed }) => ({ opacity: pressed ? 0.72 : 1 })}><View style={{ borderColor: active ? member.color : "#D8E0E5", backgroundColor: active ? `${member.color}18` : "#FFFFFF" }} className="rounded-full border px-3 py-2 flex-row items-center gap-2"><View style={{ backgroundColor: member.color }} className="h-7 w-7 rounded-full items-center justify-center"><Text className="text-[10px] font-bold text-white">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Text></View><Text className="text-sm font-bold text-foreground">{member.name.split(" ")[0]}</Text>{unavailableAllDay && <Text className="text-[10px] font-bold text-warning">Indispo.</Text>}</View></Pressable>;
            return Platform.OS === "web" ? createElement("div", { key: member.id, draggable: true, onDragStart: () => setSelectedMemberId(member.id), style: { display: "inline-flex" } }, chip) : <View key={member.id}>{chip}</View>;
          })}
        </View>
        <Text className="mt-3 text-xs font-semibold text-primary">{selectedMember ? `${selectedMember.name} est sélectionné(e) : touchez une case libre pour l’affecter.` : "Aucun salarié sélectionné."}</Text>

        <View className="mt-7 gap-5">
          {SERVICE_TEMPLATES.map((template) => {
            const matching = snapshot.shifts.filter((shift) => shift.serviceDate === selectedDate && shift.position.toLocaleLowerCase("fr-FR") === template.title.toLocaleLowerCase("fr-FR"));
            return <ServiceBoard key={template.key} template={template} serviceDate={selectedDate} shift={matching[0]} extraServiceCount={Math.max(0, matching.length - 1)} selectedMember={selectedMember} unavailableEntries={snapshot.unavailabilities} onClearSelected={() => setSelectedMemberId(null)} />;
          })}
        </View>

        <View className="mt-6 rounded-2xl bg-surface border border-border p-4"><Text className="font-bold text-foreground">Autres services</Text><Text className="mt-1 text-xs leading-4 text-muted">Les services avec un intitulé différent restent accessibles depuis la liste « Gérer le planning ». Cette vue rapide prépare les deux services standards midi et soir.</Text></View>
      </ScrollView>
    </ScreenContainer>
  );
}

function ServiceBoard({ template, serviceDate, shift, extraServiceCount, selectedMember, unavailableEntries, onClearSelected }: { template: ServiceTemplate; serviceDate: string; shift?: PlanningShift; extraServiceCount: number; selectedMember: Staff | null; unavailableEntries: Array<{ staffMemberId: number; serviceDate: string; period: "all_day" | "midi" | "soir"; reason: string | null }>; onClearSelected: () => void }) {
  const { createShift, updateShift } = usePlanning();
  const [saving, setSaving] = useState(false);
  const target = Math.max(shift?.requiredStaff ?? template.defaultStaff, shift?.memberIds.length ?? 0);
  const [capacity, setCapacity] = useState(target);

  useEffect(() => setCapacity(target), [target, shift?.id]);

  const slots = useMemo(() => Array.from({ length: capacity }, (_, index) => shift?.memberIds[index] ?? null), [capacity, shift?.memberIds]);
  const periodUnavailable = selectedMember ? unavailableEntries.find((entry) => entry.staffMemberId === selectedMember.id && entry.serviceDate === serviceDate && (entry.period === "all_day" || entry.period === template.key)) : undefined;

  const persist = async (memberIds: number[], nextCapacity: number, assignmentTimes?: ShiftAssignmentTime[]) => {
    setSaving(true);
    try {
      if (shift) {
        await updateShift(shift.id, { memberIds, requiredStaff: nextCapacity, assignmentTimes: assignmentTimes ?? defaultTimes(shift, memberIds) });
      } else {
        await createShift({ serviceDate, startsAt: template.startsAt, endsAt: template.endsAt, position: template.title, requiredStaff: nextCapacity, note: null, memberIds, assignmentTimes: assignmentTimes ?? memberIds.map((staffMemberId) => ({ staffMemberId, startsAt: template.startsAt, endsAt: template.endsAt })) });
      }
      haptic.success();
    } catch (error) {
      Alert.alert("Enregistrement impossible", error instanceof Error ? error.message : "Une erreur est survenue pendant la mise à jour du service.");
    } finally {
      setSaving(false);
    }
  };

  const updateCapacity = async (offset: number) => {
    const next = Math.max(1, Math.min(20, capacity + offset));
    if (next < (shift?.memberIds.length ?? 0)) {
      Alert.alert("Cases déjà occupées", "Retirez d’abord un salarié avant de diminuer le nombre de cases.");
      return;
    }
    setCapacity(next);
    await persist(shift?.memberIds ?? [], next);
  };

  const assignToSlot = async (index: number) => {
    if (!selectedMember) {
      Alert.alert("Sélectionnez un salarié", "Touchez d’abord une personne dans la liste Équipe à placer.");
      return;
    }
    if (periodUnavailable) {
      Alert.alert("Salarié indisponible", `${selectedMember.name} est indisponible pour ce service${periodUnavailable.reason ? ` : ${periodUnavailable.reason}` : "."}`);
      return;
    }
    const currentIds = [...(shift?.memberIds ?? [])];
    const currentAtSlot = currentIds[index];
    const alreadyAssignedElsewhere = currentIds.includes(selectedMember.id) && currentAtSlot !== selectedMember.id;
    if (alreadyAssignedElsewhere) {
      Alert.alert("Salarié déjà placé", `${selectedMember.name} est déjà affecté(e) à ce service.`);
      return;
    }
    if (index < currentIds.length) currentIds[index] = selectedMember.id; else currentIds.push(selectedMember.id);
    const uniqueIds = [...new Set(currentIds)];
    const existingTimes = shift ? defaultTimes(shift, uniqueIds) : [];
    const assignmentTimes = uniqueIds.map((staffMemberId) => {
      const previous = existingTimes.find((assignment) => assignment.staffMemberId === staffMemberId);
      return previous ?? { staffMemberId, startsAt: template.startsAt, endsAt: template.endsAt };
    });
    await persist(uniqueIds, Math.max(capacity, uniqueIds.length), assignmentTimes);
    onClearSelected();
  };

  const removeFromSlot = (staffMemberId: number) => {
    const name = shift ? "ce salarié" : "ce salarié";
    Alert.alert("Retirer de la case ?", `Voulez-vous retirer ${name} de ${template.title} ?`, [{ text: "Annuler", style: "cancel" }, { text: "Retirer", style: "destructive", onPress: () => void persist((shift?.memberIds ?? []).filter((id) => id !== staffMemberId), capacity, shift ? defaultTimes(shift, (shift.memberIds ?? []).filter((id) => id !== staffMemberId)) : []) }]);
  };

  const saveIndividualTime = async (staffMemberId: number, startsAt: string, endsAt: string) => {
    if (!shift) return;
    if (!isValidShiftTime(startsAt, endsAt)) {
      Alert.alert("Horaire à corriger", "Utilisez des heures valides, par exemple 11:30 et 15:00.");
      return;
    }
    const assignmentTimes = defaultTimes(shift, shift.memberIds).map((assignment) => assignment.staffMemberId === staffMemberId ? { ...assignment, startsAt, endsAt } : assignment);
    await persist(shift.memberIds, capacity, assignmentTimes);
  };

  return <View className="rounded-3xl bg-surface border border-border overflow-hidden">
    <View className={`px-4 py-4 ${template.key === "midi" ? "bg-[#FFF6DE]" : "bg-[#EAF1FF]"}`}>
      <View className="flex-row items-center justify-between gap-3"><View className="flex-row items-center gap-3 flex-1"><View className={`h-10 w-10 rounded-xl items-center justify-center ${template.key === "midi" ? "bg-[#D68A00]" : "bg-[#3867B7]"}`}><IconSymbol name="clock.fill" size={20} color="#FFFFFF" /></View><View className="flex-1"><Text className="text-base font-bold text-foreground">{template.title}</Text><Text className="mt-0.5 text-xs text-muted">Service : {shift?.startsAt ?? template.startsAt} — {shift?.endsAt ?? template.endsAt}</Text></View></View><View className="rounded-full bg-white/80 px-2.5 py-1"><Text className="text-xs font-bold text-foreground">{shift?.memberIds.length ?? 0}/{capacity}</Text></View></View>
      {extraServiceCount > 0 && <Text className="mt-2 text-xs leading-4 text-muted">{extraServiceCount} autre service du même type existe déjà dans la liste classique.</Text>}
    </View>

    <View className="p-4"><View className="flex-row items-center justify-between"><Text className="text-sm font-bold text-foreground">Nombre de cases</Text><View className="flex-row items-center gap-3"><Pressable disabled={saving || capacity <= 1} onPress={() => void updateCapacity(-1)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : saving || capacity <= 1 ? 0.4 : 1 })}><View className="h-8 w-8 rounded-full bg-white border border-border items-center justify-center"><Text className="text-lg font-bold text-foreground">−</Text></View></Pressable><Text className="w-5 text-center text-base font-bold text-foreground">{capacity}</Text><Pressable disabled={saving || capacity >= 20} onPress={() => void updateCapacity(1)} style={({ pressed }) => ({ opacity: pressed ? 0.6 : saving || capacity >= 20 ? 0.4 : 1 })}><View className="h-8 w-8 rounded-full bg-primary items-center justify-center"><Text className="text-lg font-bold text-white">+</Text></View></Pressable></View></View>
      <Text className="mt-2 text-xs leading-4 text-muted">Les cases vides sont enregistrées dans le brouillon dès que vous modifiez leur nombre.</Text>
      <View className="mt-4 gap-3">{slots.map((staffMemberId, index) => <ServiceSlot key={`${shift?.id ?? template.key}-${index}-${staffMemberId ?? "empty"}`} index={index} staffMemberId={staffMemberId} shift={shift} selectedMember={selectedMember} saving={saving} onAssign={() => void assignToSlot(index)} onRemove={() => staffMemberId && removeFromSlot(staffMemberId)} onSaveTime={saveIndividualTime} />)}</View>
    </View>
  </View>;
}

function ServiceSlot({ index, staffMemberId, shift, selectedMember, saving, onAssign, onRemove, onSaveTime }: { index: number; staffMemberId: number | null; shift?: PlanningShift; selectedMember: Staff | null; saving: boolean; onAssign: () => void; onRemove: () => void; onSaveTime: (staffMemberId: number, startsAt: string, endsAt: string) => Promise<void> }) {
  const { snapshot } = usePlanning();
  const member = snapshot.members.find((entry) => entry.id === staffMemberId);
  const time = staffMemberId && shift ? defaultTimes(shift, [staffMemberId])[0] : undefined;
  if (!member || !staffMemberId) {
    const emptySlot = <Pressable disabled={saving} onPress={onAssign} accessibilityRole="button" accessibilityLabel={`Case ${index + 1} vide${selectedMember ? `, affecter ${selectedMember.name}` : ""}`} style={({ pressed }) => ({ opacity: pressed ? 0.72 : saving ? 0.55 : 1 })}><View className="rounded-2xl border-2 border-dashed border-[#B9D9ED] bg-white px-4 py-4 flex-row items-center gap-3"><View className="h-9 w-9 rounded-xl bg-[#E4F1FB] items-center justify-center"><IconSymbol name="plus" size={19} color="#006491" /></View><View className="flex-1"><Text className="font-bold text-foreground">Case {index + 1} · vide</Text><Text className="mt-1 text-xs text-muted">{selectedMember ? `Placer ${selectedMember.name}` : Platform.OS === "web" ? "Glissez un salarié ici ou touchez après sélection." : "Touchez après avoir sélectionné un salarié."}</Text></View></View></Pressable>;
    return Platform.OS === "web" ? createElement("div", { onDragOver: (event: any) => event.preventDefault(), onDrop: (event: any) => { event.preventDefault(); onAssign(); }, style: { display: "block" } }, emptySlot) : <View>{emptySlot}</View>;
  }
  return <View style={{ borderLeftColor: member.color, borderLeftWidth: 4 }} className="rounded-2xl bg-white border border-border px-4 py-3"><View className="flex-row items-center gap-3"><View style={{ backgroundColor: member.color }} className="h-9 w-9 rounded-xl items-center justify-center"><Text className="text-xs font-bold text-white">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Text></View><View className="flex-1"><Text className="font-bold text-foreground">{member.name}</Text><Text className="text-xs text-muted">{member.jobTitle}</Text></View><View className="items-end gap-2"><Pressable disabled={saving} onPress={onAssign} accessibilityRole="button" accessibilityLabel={`Remplacer ${member.name}`} style={({ pressed }) => ({ opacity: pressed ? 0.6 : saving ? 0.4 : 1 })}><Text className="text-xs font-bold text-primary">Remplacer</Text></Pressable><Pressable disabled={saving} onPress={onRemove} accessibilityRole="button" accessibilityLabel={`Retirer ${member.name}`} style={({ pressed }) => ({ opacity: pressed ? 0.6 : saving ? 0.4 : 1 })}><Text className="text-xs font-bold text-error">Retirer</Text></Pressable></View></View><View className="mt-3 flex-row gap-3"><TimeInput label="Début" initialValue={time?.startsAt ?? shift?.startsAt ?? ""} disabled={saving} onSave={(value) => void onSaveTime(staffMemberId, value, time?.endsAt ?? shift?.endsAt ?? "")} /><TimeInput label="Fin" initialValue={time?.endsAt ?? shift?.endsAt ?? ""} disabled={saving} onSave={(value) => void onSaveTime(staffMemberId, time?.startsAt ?? shift?.startsAt ?? "", value)} /></View></View>;
}

function TimeInput({ label, initialValue, disabled, onSave }: { label: string; initialValue: string; disabled: boolean; onSave: (value: string) => void }) {
  const [value, setValue] = useState(initialValue);
  useEffect(() => setValue(initialValue), [initialValue]);
  return <View className="flex-1"><Text className="mb-1 text-[11px] font-bold text-muted">{label}</Text><TextInput value={value} editable={!disabled} onChangeText={setValue} onEndEditing={() => onSave(value)} keyboardType="numbers-and-punctuation" returnKeyType="done" maxLength={5} placeholder="11:30" className="h-10 rounded-xl border border-border bg-surface px-3 text-sm font-bold text-foreground" /></View>;
}

function DayChoice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><View className={`rounded-full px-4 py-2 ${active ? "bg-primary" : "bg-surface border border-border"}`}><Text className={`text-sm font-bold capitalize ${active ? "text-white" : "text-foreground"}`}>{label}</Text></View></Pressable>;
}

