import * as FileSystem from "expo-file-system/legacy";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";
import type { ExportMember, ExportShift } from "@/lib/planning-export-template";
import { buildPlanningHtml, buildPlanningSvg } from "@/lib/planning-export-template";

type ExportPayload = { weekStart: string; shifts: ExportShift[]; members: ExportMember[]; scopeLabel: string };

function webDownload(contents: string, filename: string, mimeType: string) {
  const blob = new Blob([contents], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportPlanningPdf(payload: ExportPayload) {
  const html = buildPlanningHtml(payload.weekStart, payload.shifts, payload.members, payload.scopeLabel);
  if (Platform.OS === "web") {
    const printWindow = window.open("", "_blank");
    if (!printWindow) throw new Error("La fenêtre d’export a été bloquée.");
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    return;
  }
  const { uri } = await Print.printToFileAsync({ html, margins: { top: 24, right: 18, bottom: 24, left: 18 } });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Le partage de fichiers n’est pas disponible sur cet appareil.");
  await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: "Exporter le planning en PDF" });
}

export async function exportPlanningImage(payload: ExportPayload) {
  const svg = buildPlanningSvg(payload.weekStart, payload.shifts, payload.members, payload.scopeLabel);
  const filename = `planning-thionville-${payload.weekStart}.svg`;
  if (Platform.OS === "web") {
    webDownload(svg, filename, "image/svg+xml");
    return;
  }
  if (!FileSystem.cacheDirectory) throw new Error("Le répertoire d’export est indisponible.");
  const uri = `${FileSystem.cacheDirectory}${filename}`;
  await FileSystem.writeAsStringAsync(uri, svg, { encoding: FileSystem.EncodingType.UTF8 });
  if (!(await Sharing.isAvailableAsync())) throw new Error("Le partage de fichiers n’est pas disponible sur cet appareil.");
  await Sharing.shareAsync(uri, { mimeType: "image/svg+xml", dialogTitle: "Exporter le planning en image" });
}
