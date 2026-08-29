import { IconSymbol } from "@/components/ui/icon-symbol";
import { ScreenContainer } from "@/components/screen-container";
import { haptic } from "@/lib/haptics";
import { formatUnavailabilityPeriod, isUnavailableForShift, isValidShiftTime, toIsoDate } from "@/lib/planning-utils";
import { buildShiftAssignmentTimes } from "@/lib/shift-assignment-utils";
import { usePlanning, useWeekDays } from "@/providers/planning-provider";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Alert, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useMemo, useState } from "react";

export default function ShiftEditor() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { snapshot, createShift, updateShift, deleteShift } = usePlanning();
  const days = useWeekDays();
  const existing = useMemo(() => snapshot.shifts.find((shift) => String(shift.id) === id), [id, snapshot.shifts]);
  const [date, setDate] = useState(existing?.serviceDate ?? days[0]?.iso ?? toIsoDate(new Date()));
  const [position, setPosition] = useState(existing?.position ?? "Service du midi");
  const [startsAt, setStartsAt] = useState(existing?.startsAt ?? "11:30");
  const [endsAt, setEndsAt] = useState(existing?.endsAt ?? "15:00");
  const [note, setNote] = useState(existing?.note ?? "");
  const [memberIds, setMemberIds] = useState<number[]>(existing?.memberIds ?? []);
  const getBlockingUnavailability = (memberId: number) => snapshot.unavailabilities.find((entry) => entry.staffMemberId === memberId && isUnavailableForShift(entry, date, startsAt));
  const save = async () => {
    if (position.trim().length < 2 || !isValidShiftTime(startsAt, endsAt)) { Alert.alert("Informations à corriger", "Renseignez un poste et des horaires valides au format 11:30 — 15:00."); return; }
    const assignmentTimes = existing
      ? buildShiftAssignmentTimes(existing, memberIds)
      : memberIds.map((staffMemberId) => ({ staffMemberId, startsAt, endsAt }));
    const input = { serviceDate: date, startsAt, endsAt, position: position.trim(), note: note.trim() || null, memberIds, assignmentTimes };
    if (existing) await updateShift(existing.id, input); else await createShift(input);
    haptic.success(); router.back();
  };
  const remove = () => Alert.alert("Supprimer ce service ?", "Cette action retirera le créneau de la semaine.", [{ text: "Annuler", style: "cancel" }, { text: "Supprimer", style: "destructive", onPress: async () => { if (existing) { await deleteShift(existing.id); haptic.medium(); router.back(); } } }]);
  return <ScreenContainer edges={["top", "bottom", "left", "right"]}><ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }}><View className="flex-row items-center justify-between"><Pressable onPress={() => router.back()} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}><Text className="text-base font-bold text-primary">Annuler</Text></Pressable><Text className="text-base font-bold text-foreground">{existing ? "Modifier le service" : "Nouveau service"}</Text><Pressable onPress={save} style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}><Text className="text-base font-bold text-primary">Enregistrer</Text></Pressable></View><View className="mt-7 gap-6"><Field label="Poste / service" value={position} onChangeText={setPosition} /><View><Text className="mb-2 text-sm font-bold text-foreground">Jour</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><View className="flex-row gap-2">{days.map((day) => <Choice key={day.iso} label={`${day.shortLabel} ${day.date.getDate()}`} active={date === day.iso} onPress={() => setDate(day.iso)} />)}</View></ScrollView></View><View className="flex-row gap-3"><View className="flex-1"><Field label="Début" value={startsAt} onChangeText={setStartsAt} keyboardType="numbers-and-punctuation" /></View><View className="flex-1"><Field label="Fin" value={endsAt} onChangeText={setEndsAt} keyboardType="numbers-and-punctuation" /></View></View><Field label="Note de service (facultatif)" value={note} onChangeText={setNote} multiline /><View><Text className="mb-2 text-sm font-bold text-foreground">Équipe affectée</Text><Text className="mb-3 text-xs leading-4 text-muted">Les salariés déclarés indisponibles pour ce créneau sont signalés et ne peuvent pas être ajoutés.</Text><View className="gap-2">{snapshot.members.map((member) => { const unavailable = getBlockingUnavailability(member.id); const selected = memberIds.includes(member.id); return <Pressable key={member.id} disabled={Boolean(unavailable) && !selected} onPress={() => { if (unavailable && !selected) { Alert.alert("Salarié indisponible", `${member.name} a déclaré : ${formatUnavailabilityPeriod(unavailable.period)}${unavailable.reason ? ` · ${unavailable.reason}` : ""}.`); return; } setMemberIds((current) => selected ? current.filter((id) => id !== member.id) : [...current, member.id]); }} style={({ pressed }) => ({ opacity: pressed ? 0.7 : unavailable && !selected ? 0.55 : 1 })} className={`rounded-2xl border p-3 flex-row items-center gap-3 ${unavailable && !selected ? "bg-[#FFF0E1] border-[#F6D6A8]" : selected ? "bg-[#FDE8EC] border-primary" : "bg-surface border-border"}`}><View style={{ backgroundColor: member.color }} className="h-9 w-9 rounded-xl items-center justify-center"><Text className="text-xs font-bold text-white">{member.name.split(" ").map((part) => part[0]).join("").slice(0, 2)}</Text></View><View className="flex-1"><Text className="font-bold text-foreground">{member.name}</Text><Text className="text-xs text-muted">{unavailable ? `Indisponible · ${formatUnavailabilityPeriod(unavailable.period)}` : member.jobTitle}</Text></View>{selected ? <IconSymbol name="checkmark.circle.fill" size={20} color="#E31837" /> : unavailable ? <IconSymbol name="calendar.badge.exclamationmark" size={20} color="#BD7B13" /> : null}</Pressable>; })}</View></View>{existing && <Pressable onPress={remove} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className="mt-2 py-3 items-center"><Text className="font-bold text-error">Supprimer ce service</Text></Pressable>}</View></ScrollView></ScreenContainer>;
}
function Field({ label, value, onChangeText, multiline = false, keyboardType }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; keyboardType?: "default" | "numbers-and-punctuation" }) { return <View><Text className="mb-2 text-sm font-bold text-foreground">{label}</Text><TextInput value={value} onChangeText={onChangeText} multiline={multiline} keyboardType={keyboardType} returnKeyType="done" className={`rounded-2xl bg-surface border border-border px-4 text-base text-foreground ${multiline ? "h-24 py-3" : "h-13"}`} /></View>; }
function Choice({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) { return <Pressable onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })} className={`rounded-full px-4 py-2 ${active ? "bg-primary" : "bg-surface border border-border"}`}><Text className={`text-sm font-bold capitalize ${active ? "text-white" : "text-foreground"}`}>{label}</Text></Pressable>; }
