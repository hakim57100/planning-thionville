Skip to content
hakim57100
planning-thionville
Type / to search
Repository navigation
Code
Issues
Pull requests
Agents
Actions
Projects
Wiki
Security and quality
Insights
Settings
Files
main
t
T
app
assets
components
constants
drizzle
hooks
lib
providers
planning-provider.tsx
scripts
server
shared
tests
.env.client.example
.env.example
.gitignore
.gitkeep
.npmrc
.watchmanconfig
DEPLOIEMENT.md
LISEZ_MOI.txt
app.config.ts
babel.config.js
design.md
drizzle.config.ts
eas.json
eslint.config.js
expo-env.d.ts
global.css
metro.config.js
nativewind-env.d.ts
package.json
pnpm-lock.yaml
tailwind.config.js
theme.config.d.ts
theme.config.js
todo.md
tsconfig.json
Editing planning-provider.tsx in planning-thionville
Breadcrumbs
planning-thionville/providers
/
in
main
Cancel changes
Commit changes...
Edit
Preview
Indent mode
Spaces
Tabs
Indent size
2
4
8
Line wrap mode
No wrap
Soft wrap
Editing planning-provider.tsx file contents
  1
  2
  3
  4
  5
  6
  7
  8
  9
 10
 11
 12
 13
 14
 15
 16
 17
 18
 19
 20
 21
 22
 23
 24
 25
 26
 27
 28
 29
 30
 31
 32
 33
 34
 35
 36
 37
 38
 39
 40
 41
 42
 43
 44
 45
 46
 47
 48
 49
 50
 51
 52
 53
 54
 55
 56
 57
 58
 59
 60
 61
 62
 63
 64
 65
 66
 67
 68
 69
import { trpc } from "@/lib/trpc";
import { buildDemoWeek, type PlanningRole, type PlanningShift, type PlanningSnapshot, type Staff, type StaffUnavailability, type UnavailabilityPeriod } from "@/lib/demo-planning";
import { filterShiftsForMember, getMonday, getWeekDays, toIsoDate } from "@/lib/planning-utils";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "expo-router";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";


type ShiftInput = Omit<PlanningShift, "id">;
type StaffInput = Omit<Staff, "id">;
type UnavailabilityInput = { serviceDate: string; period: UnavailabilityPeriod; reason?: string };
type ExcelImportInput = { filename: string; contentBase64: string };
type ExcelImportResult = { weekStart: string; importedShiftCount: number; planningWeekId: number | null };
type DuplicateWeekResult = { sourceWeekStart: string; weekStart: string; copiedShiftCount: number };
type PlanningPublicationResult = { weekStart: string; notifiedStaffCount: number; alreadyPublished: boolean };
type PlanningNotification = { id: number; weekStart: string; title: string; message: string; createdAt: Date; readAt: Date | null };


function addDaysToIsoDate(isoDate: string, days: number) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}


type PlanningContextValue = {
  isDemo: boolean; role: PlanningRole; weekStart: string; snapshot: PlanningSnapshot; loading: boolean; isAdmin: boolean;
  showOnlyMine: boolean; personalMember: Staff | null; visibleShifts: PlanningShift[];
  setWeekStart: (value: string) => void; changeWeek: (offset: number) => void; setDemoRole: (role: PlanningRole) => void; setShowOnlyMine: (value: boolean) => void;
  createShift: (input: ShiftInput) => Promise<void>; importPlanningExcel: (input: ExcelImportInput) => Promise<ExcelImportResult>; updateShift: (id: number, input: Partial<ShiftInput>) => Promise<void>; deleteShift: (id: number) => Promise<void>; createStaffMember: (input: StaffInput) => Promise<string | null>; updateStaffMember: (id: number, input: StaffInput) => Promise<void>; regenerateStaffCode: (id: number) => Promise<string | null>; setStaffActive: (id: number, active: boolean) => Promise<void>; duplicateWeekToNext: () => Promise<DuplicateWeekResult>; publishWeek: () => Promise<PlanningPublicationResult>;
  createUnavailability: (input: UnavailabilityInput) => Promise<void>; deleteUnavailability: (id: number) => Promise<void>; signIn: () => Promise<void>;
  notifications: PlanningNotification[]; unreadNotificationCount: number; markNotificationRead: (id: number) => Promise<void>;
  user: ReturnType<typeof useAuth>["user"]; login: (code: string) => Promise<void>; logout: () => Promise<void>;
};


const PlanningContext = createContext<PlanningContextValue | null>(null);


export function PlanningProvider({ children }: { children: ReactNode }) {
  const router = useRouter(); const { isAuthenticated, user, loginWithCode, logout: authLogout } = useAuth(); const initialWeek = toIsoDate(getMonday());
  const [weekStart, setWeekStart] = useState(initialWeek); const [demoRole, setDemoRole] = useState<PlanningRole>("admin"); const [showOnlyMine, setShowOnlyMine] = useState(false); const [localWeeks, setLocalWeeks] = useState<Record<string, PlanningSnapshot>>({});
  const authQuery = trpc.auth.me.useQuery(undefined, { enabled: isAuthenticated }); const remoteQuery = trpc.planning.myWeek.useQuery({ weekStart }, { enabled: isAuthenticated });
  const notificationsQuery = trpc.planning.notifications.useQuery(undefined, { enabled: isAuthenticated });
  const createStaffMutation = trpc.planning.createStaffMember.useMutation(); const updateStaffMutation = trpc.planning.updateStaffMember.useMutation(); const regenerateCodeMutation = trpc.planning.regenerateStaffCode.useMutation(); const setStaffActiveMutation = trpc.planning.setStaffActive.useMutation(); const createShiftMutation = trpc.planning.createShift.useMutation(); const importPlanningExcelMutation = trpc.planning.importPlanningExcel.useMutation(); const updateShiftMutation = trpc.planning.updateShift.useMutation(); const deleteShiftMutation = trpc.planning.deleteShift.useMutation(); const duplicateWeekMutation = trpc.planning.duplicateWeekToNext.useMutation(); const publishWeekMutation = trpc.planning.publishWeek.useMutation();
  const createUnavailabilityMutation = trpc.planning.createUnavailability.useMutation(); const deleteUnavailabilityMutation = trpc.planning.deleteUnavailability.useMutation(); const markNotificationReadMutation = trpc.planning.markNotificationRead.useMutation();
  const isDemo = !isAuthenticated; const role: PlanningRole = isDemo ? demoRole : authQuery.data?.role === "admin" ? "admin" : "employee"; const fallback = localWeeks[weekStart] ?? buildDemoWeek(weekStart); const snapshot = (isAuthenticated ? remoteQuery.data : fallback) ?? fallback;
  const personalId = isDemo ? undefined : authQuery.data?.id;
  const personalMember = useMemo(() => snapshot.members.find((member) => member.id === personalId) ?? (isDemo ? snapshot.members[0] ?? null : null), [isDemo, personalId, snapshot.members]);
  const visibleShifts = useMemo(() => showOnlyMine ? filterShiftsForMember(snapshot.shifts, personalMember?.id ?? null) : snapshot.shifts, [personalMember?.id, showOnlyMine, snapshot.shifts]);
  const notifications = useMemo<PlanningNotification[]>(() => isDemo || role !== "employee" ? [] : notificationsQuery.data ?? [], [isDemo, notificationsQuery.data, role]);
  const unreadNotificationCount = useMemo(() => notifications.filter((notification) => !notification.readAt).length, [notifications]);
  const patchLocalWeek = useCallback((updater: (previous: PlanningSnapshot) => PlanningSnapshot) => setLocalWeeks((previous) => ({ ...previous, [weekStart]: updater(previous[weekStart] ?? buildDemoWeek(weekStart)) })), [weekStart]);
  const refetch = useCallback(async () => { if (isAuthenticated) await Promise.all([remoteQuery.refetch(), notificationsQuery.refetch()]); }, [isAuthenticated, notificationsQuery, remoteQuery]);
  const createShift = useCallback(async (input: ShiftInput) => { if (isDemo) { patchLocalWeek((previous) => ({ ...previous, shifts: [...previous.shifts, { ...input, id: -Date.now() }] })); return; } await createShiftMutation.mutateAsync({ ...input, note: input.note ?? undefined, weekStart }); await refetch(); }, [createShiftMutation, isDemo, patchLocalWeek, refetch, weekStart]);
  const importPlanningExcel = useCallback(async (input: ExcelImportInput): Promise<ExcelImportResult> => {
    if (isDemo) throw new Error("Connectez-vous avec un compte administrateur pour importer un planning.");
    const result = await importPlanningExcelMutation.mutateAsync(input);
    if (result.weekStart === weekStart) await refetch(); else setWeekStart(result.weekStart);
    return result;
  }, [importPlanningExcelMutation, isDemo, refetch, weekStart]);
  const updateShift = useCallback(async (id: number, input: Partial<ShiftInput>) => { if (isDemo) { patchLocalWeek((previous) => ({ ...previous, shifts: previous.shifts.map((shift) => shift.id === id ? { ...shift, ...input } : shift) })); return; } await updateShiftMutation.mutateAsync({ id, ...input }); await refetch(); }, [isDemo, patchLocalWeek, refetch, updateShiftMutation]);
  const deleteShift = useCallback(async (id: number) => { if (isDemo) { patchLocalWeek((previous) => ({ ...previous, shifts: previous.shifts.filter((shift) => shift.id !== id) })); return; } await deleteShiftMutation.mutateAsync({ id }); await refetch(); }, [deleteShiftMutation, isDemo, patchLocalWeek, refetch]);
  const createStaffMember = useCallback(async (input: StaffInput) => { if (isDemo) { patchLocalWeek((previous) => ({ ...previous, members: [...previous.members, { ...input, id: -Date.now() }] })); return null; } const result = await createStaffMutation.mutateAsync({ ...input, email: input.email ?? undefined }); await refetch(); return result.code; }, [createStaffMutation, isDemo, patchLocalWeek, refetch]);
  const updateStaffMember = useCallback(async (id: number, input: StaffInput) => { if (isDemo) { patchLocalWeek((previous) => ({ ...previous, members: previous.members.map((member) => member.id === id ? { ...member, ...input } : member) })); return; } await updateStaffMutation.mutateAsync({ id, ...input, email: input.email ?? undefined }); await refetch(); }, [isDemo, patchLocalWeek, refetch, updateStaffMutation]);
  const regenerateStaffCode = useCallback(async (id: number) => { if (isDemo) return null; const result = await regenerateCodeMutation.mutateAsync({ id }); await refetch(); return result.code; }, [isDemo, refetch, regenerateCodeMutation]);
  const setStaffActive = useCallback(async (id: number, active: boolean) => { if (isDemo) { patchLocalWeek((previous) => ({ ...previous, members: previous.members.map((member) => member.id === id ? { ...member, active } : member) })); return; } await setStaffActiveMutation.mutateAsync({ id, active }); await refetch(); }, [isDemo, patchLocalWeek, refetch, setStaffActiveMutation]);
  const duplicateWeekToNext = useCallback(async (): Promise<DuplicateWeekResult> => {
    const targetWeekStart = addDaysToIsoDate(weekStart, 7);
    if (isDemo) {
      if (localWeeks[targetWeekStart]?.shifts.length) throw new Error(`La semaine du ${targetWeekStart} contient déjà des services.`);
      const copiedShifts = snapshot.shifts.map((shift, index) => ({ ...shift, id: -(Date.now() + index), serviceDate: addDaysToIsoDate(shift.serviceDate, 7), memberIds: [...shift.memberIds] }));
      setLocalWeeks((previous) => ({ ...previous, [targetWeekStart]: { week: { id: -Date.now(), weekStart: targetWeekStart, status: "draft", publishedAt: null }, members: snapshot.members, shifts: copiedShifts, unavailabilities: [] } }));
Use Control + Shift + m to toggle the tab key moving focus. Alternatively, use esc then tab to move to the next interactive element on the page.
