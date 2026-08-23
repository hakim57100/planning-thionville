import { getWeekDays, formatFrenchDate } from "./planning-utils";
import { getShiftStyle } from "./shift-style";

export type ExportShift = { serviceDate: string; startsAt: string; endsAt: string; position: string; note: string | null; memberIds: number[] };
export type ExportMember = { id: number; name: string; jobTitle: string };

function escapeMarkup(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&#39;");
}

function shiftRows(weekStart: string, shifts: ExportShift[], members: ExportMember[]) {
  return getWeekDays(weekStart).map((day) => {
    const dayShifts = shifts.filter((shift) => shift.serviceDate === day.iso);
    const rows = dayShifts.length
      ? dayShifts.map((shift) => {
        const style = getShiftStyle(shift.position);
        const names = members.filter((member) => shift.memberIds.includes(member.id)).map((member) => member.name.split(" ")[0]).join(" · ") || "À affecter";
        return `<div class="shift"><span class="dot" style="background:${style.color}"></span><div><strong>${escapeMarkup(shift.position)}</strong><span>${shift.startsAt} — ${shift.endsAt} · ${escapeMarkup(names)}</span>${shift.note ? `<em>${escapeMarkup(shift.note)}</em>` : ""}</div></div>`;
      }).join("")
      : `<p class="empty">Aucun service</p>`;
    return `<section><h2>${escapeMarkup(formatFrenchDate(day.iso))}</h2>${rows}</section>`;
  }).join("");
}

export function buildPlanningHtml(weekStart: string, shifts: ExportShift[], members: ExportMember[], scopeLabel: string) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><style>@page{margin:20px}*{box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#073F61;margin:0}.heading{border-bottom:4px solid #E31837;padding:0 0 16px}.eyebrow{color:#E31837;letter-spacing:2px;font-size:11px;font-weight:800;margin:0 0 8px}.title{font-size:27px;margin:0}.subtitle{color:#60788A;font-size:14px;margin:7px 0 0}.legend{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.tag{padding:5px 9px;border-radius:99px;font-weight:700;font-size:11px;background:#F3F7FA}section{margin:17px 0;padding:14px;border:1px solid #D9E4EC;border-radius:12px;break-inside:avoid}h2{font-size:15px;margin:0 0 10px;text-transform:capitalize}.shift{display:flex;gap:10px;padding:9px 0;border-top:1px solid #EAF0F4}.shift:first-of-type{border-top:0}.dot{width:10px;height:10px;border-radius:50%;margin-top:5px;flex:none}strong,span,em{display:block}strong{font-size:13px}span{font-size:12px;color:#60788A;margin-top:2px}em{font-size:11px;color:#60788A;margin-top:3px;font-style:normal}.empty{font-size:12px;color:#60788A;margin:0}.footer{margin-top:20px;color:#60788A;font-size:10px;text-align:center}</style></head><body><header class="heading"><p class="eyebrow">PLANNING · THIONVILLE</p><h1 class="title">Planning de la semaine</h1><p class="subtitle">${escapeMarkup(scopeLabel)} · Semaine du ${escapeMarkup(formatFrenchDate(weekStart, { day: "numeric", month: "long", year: "numeric" }))}</p></header><div class="legend"><span class="tag">Livreur</span><span class="tag">Cuisinier</span><span class="tag">Manager</span><span class="tag">Service</span></div>${shiftRows(weekStart, shifts, members)}<p class="footer">Document généré depuis Planning Thionville.</p></body></html>`;
}

export function buildPlanningSvg(weekStart: string, shifts: ExportShift[], members: ExportMember[], scopeLabel: string) {
  const lines = getWeekDays(weekStart).flatMap((day, dayIndex) => {
    const top = 188 + dayIndex * 190;
    const dayShifts = shifts.filter((shift) => shift.serviceDate === day.iso);
    const entries = dayShifts.length ? dayShifts.slice(0, 3).map((shift, index) => {
      const style = getShiftStyle(shift.position);
      const names = members.filter((member) => shift.memberIds.includes(member.id)).map((member) => member.name.split(" ")[0]).join(" · ") || "À affecter";
      const y = top + 47 + index * 42;
      return `<circle cx="58" cy="${y - 5}" r="7" fill="${style.color}"/><text x="78" y="${y}" fill="#073F61" font-family="Arial, sans-serif" font-weight="700" font-size="16">${escapeMarkup(shift.position)}</text><text x="78" y="${y + 19}" fill="#60788A" font-family="Arial, sans-serif" font-size="13">${escapeMarkup(`${shift.startsAt} — ${shift.endsAt} · ${names}`)}</text>`;
    }).join("") : `<text x="58" y="${top + 48}" fill="#60788A" font-family="Arial, sans-serif" font-size="14">Aucun service</text>`;
    return [`<rect x="32" y="${top}" width="1036" height="164" rx="20" fill="#FFFFFF" stroke="#D9E4EC"/><text x="58" y="${top + 30}" fill="#073F61" font-family="Arial, sans-serif" font-weight="700" font-size="18">${escapeMarkup(formatFrenchDate(day.iso))}</text>${entries}`];
  }).join("");
  const height = 188 + 7 * 190 + 48;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1100" height="${height}" viewBox="0 0 1100 ${height}"><rect width="1100" height="${height}" fill="#F7FAFC"/><rect width="1100" height="18" fill="#E31837"/><text x="50" y="65" fill="#E31837" font-family="Arial, sans-serif" font-weight="700" font-size="16" letter-spacing="3">PLANNING · THIONVILLE</text><text x="50" y="108" fill="#073F61" font-family="Arial, sans-serif" font-weight="700" font-size="32">Planning de la semaine</text><text x="50" y="140" fill="#60788A" font-family="Arial, sans-serif" font-size="17">${escapeMarkup(scopeLabel)} · Semaine du ${escapeMarkup(formatFrenchDate(weekStart, { day: "numeric", month: "long", year: "numeric" }))}</text>${lines}</svg>`;
}
