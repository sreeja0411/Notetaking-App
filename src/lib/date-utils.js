export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime();
}

export function isInThisWeek(d, now = new Date()) {
  const sd  = startOfDay(now);
  const day = sd.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const weekStart    = new Date(sd);
  weekStart.setDate(sd.getDate() + mondayOffset);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  return d >= weekStart && d < weekEnd;
}

export function isInThisMonth(d, now = new Date()) {
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

export function filterByTimeTab(items, getDate, tab, now) {
  if (tab === "All")        return items;
  if (tab === "Today")      return items.filter((i) => isSameDay(getDate(i), now));
  if (tab === "This Week")  return items.filter((i) => isInThisWeek(getDate(i), now));
  if (tab === "This Month") return items.filter((i) => isInThisMonth(getDate(i), now));
  return items;
}

export function monthYearKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function formatMonthYearLabel(key) {
  if (key === "all") return "All months";
  const [y, m] = key.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function formatNoteFooter(d) {
  return d.toLocaleString("en-US", {
    month:  "short",
    day:    "numeric",
    year:   "numeric",
    hour:   "2-digit",
    minute: "2-digit",
  });
}

export function formatFolderLine(d) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function buildMonthOptions() {
  const out = [{ value: "all", label: "All months" }];
  const cur = new Date();
  for (let i = 0; i < 18; i++) {
    const d   = new Date(cur.getFullYear(), cur.getMonth() - i, 1);
    const key = monthYearKey(d);
    out.push({ value: key, label: d.toLocaleDateString("en-US", { month: "short", year: "numeric" }) });
  }
  return out;
}
