export const ARCHIVE_STORAGE_KEY = "archive_workspace_v1";

export function loadWorkspace() {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.v !== 1 || !Array.isArray(data.notes)) return null;
    const revive = (arr) =>
      (arr || []).map((item) => ({
        ...item,
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
        reminderAt: item.reminderAt ? new Date(item.reminderAt) : null,
        deletedAt:  item.deletedAt  ? new Date(item.deletedAt)  : undefined,
      }));
    return {
      notes:   revive(data.notes),
      folders: revive(data.folders || []),
      trash:   revive(data.trash   || []),
    };
  } catch {
    return null;
  }
}

export function saveWorkspace({ notes, folders, trash }) {
  try {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      ARCHIVE_STORAGE_KEY,
      JSON.stringify({ v: 1, notes, folders, trash })
    );
  } catch { /* ignore quota errors */ }
}

export function exportWorkspaceBlob({ notes, folders, trash }) {
  const payload = JSON.stringify({ v: 1, notes, folders, trash }, null, 2);
  return new Blob([payload], { type: "application/json" });
}
