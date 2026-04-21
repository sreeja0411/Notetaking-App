export const NAV_TABS = ["All", "Today", "This Week", "This Month"];

export const PROFILE_STORAGE_KEY = "archive_profile_v1";
export const ALERTS_PREF_STORAGE_KEY = "archive_desktop_alerts_enabled_v1";
export const GLOBAL_LOCK_STORAGE_KEY = "archive_global_lock_v1";
export const TAGS_STORAGE_KEY = "archive_tags_v1";

export const NOTE_COLOR_MAP = {
  yellow: { color: "bg-yellow-50 border-yellow-200", titleColor: "text-gray-800" },
  pink:   { color: "bg-rose-50 border-rose-200",     titleColor: "text-rose-500"  },
  blue:   { color: "bg-blue-50 border-blue-200",     titleColor: "text-blue-700"  },
  gray:   { color: "bg-gray-50 border-gray-200",     titleColor: "text-gray-800"  },
};

export const SIDEBAR_LINKS = [
  { id: "workspace", label: "My notes"  },
  { id: "locks",     label: "Private"   },
  { id: "archive",   label: "Archive"   },
  { id: "trash",     label: "Trash"     },
];

export const FOLDER_COLOR_OPTIONS = [
  { bg: "bg-yellow-100", icon: "text-yellow-700" },
  { bg: "bg-red-100",    icon: "text-red-700"    },
  { bg: "bg-blue-100",   icon: "text-blue-700"   },
  { bg: "bg-green-100",  icon: "text-green-700"  },
  { bg: "bg-pink-100",   icon: "text-pink-700"   },
];

export const COLORS = [
  { id: "yellow", bg: "bg-yellow-50", border: "border-yellow-200", hex: "#fefce8" },
  { id: "pink",   bg: "bg-rose-50",   border: "border-rose-200",   hex: "#fff1f2" },
  { id: "blue",   bg: "bg-blue-50",   border: "border-blue-200",   hex: "#eff6ff" },
  { id: "gray",   bg: "bg-gray-100",  border: "border-gray-200",   hex: "#f3f4f6" },
  { id: "red",    bg: "bg-red-100",   border: "border-red-300",    hex: "#fee2e2" },
];

export const FONT_SIZES = ["10","11","12","13","14","16","18","20","24","28","32","36","48","64"];

export const FONT_FAMILIES = [
  { value: "serif",                         label: "Serif"           },
  { value: "sans-serif",                    label: "Sans Serif"      },
  { value: "monospace",                     label: "Monospace"       },
  { value: "Georgia, serif",                label: "Georgia"         },
  { value: "'Times New Roman', serif",      label: "Times New Roman" },
  { value: "'Courier New', monospace",      label: "Courier New"     },
  { value: "Verdana, sans-serif",           label: "Verdana"         },
];

export const HEADING_STYLES = [
  { value: "p",          label: "Paragraph" },
  { value: "h1",         label: "Heading 1" },
  { value: "h2",         label: "Heading 2" },
  { value: "h3",         label: "Heading 3" },
  { value: "h4",         label: "Heading 4" },
  { value: "blockquote", label: "Quote"     },
];

export const TEXT_COLORS = [
  "#000000","#374151","#dc2626","#ea580c","#ca8a04",
  "#16a34a","#2563eb","#9333ea","#db2777","#ffffff",
];

export const HIGHLIGHT_COLORS = [
  "#fef08a","#bbf7d0","#bfdbfe","#fecaca",
  "#e9d5ff","#fed7aa","#f0fdf4","#f0f9ff",
];
