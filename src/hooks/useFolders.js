// Folder-specific helpers derived from NotesContext
import { useNotes } from "@/context/NotesContext";
import { useMemo } from "react";

export function useFolders() {
  const { folders, notes, addFolder, archiveFolderCascade, moveFolderToTrash } = useNotes();

  const folderNoteCounts = useMemo(() => {
    const m = new Map();
    for (const n of notes) {
      if (n.archived || n.folderId == null) continue;
      m.set(n.folderId, (m.get(n.folderId) || 0) + 1);
    }
    return m;
  }, [notes]);

  const folderChildCounts = useMemo(() => {
    const m = new Map();
    for (const f of folders) {
      if (f.archived || f.parentFolderId == null) continue;
      m.set(f.parentFolderId, (m.get(f.parentFolderId) || 0) + 1);
    }
    return m;
  }, [folders]);

  return {
    folders,
    folderNoteCounts,
    folderChildCounts,
    addFolder,
    archiveFolderCascade,
    moveFolderToTrash,
  };
}
