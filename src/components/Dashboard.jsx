import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Plus, Search, SlidersHorizontal, Lock, Bell, Trash2,
  Folder, MoreVertical, Clock, User, Menu, FilePlus
} from "lucide-react";
import CreateNoteModal from "./CreateNoteModal";
import NewNoteEditor from "./NewNoteEditor";

const FOLDERS = [
  { id: 1, name: "Movie Review", files: 12, date: "Dec 21, 2021", color: "bg-blue-100", iconColor: "text-blue-700" },
  { id: 2, name: "Class Notes", files: 45, date: "Dec 18, 2021", color: "bg-rose-100", iconColor: "text-rose-700" },
  { id: 3, name: "Book Lists", files: 8, date: "Dec 15, 2021", color: "bg-yellow-100", iconColor: "text-yellow-700" },
];

const NOTES = [
  {
    id: 1,
    title: "Mid test exam preparational list",
    body: "Review chapter 4 and 5 of the biology textbook. Don't forget to check the anatomical diagrams of...",
    date: "Dec 21, 2021 • 10:45 AM",
    color: "bg-yellow-50 border-yellow-200",
  },
  {
    id: 2,
    title: "Final project ideas for History",
    body: "Research the industrial revolution's impact on urban development in London. Focus on housing and...",
    date: "Dec 20, 2021 • 03:20 PM",
    color: "bg-rose-50 border-rose-200",
    titleColor: "text-rose-500",
  },
  {
    id: 3,
    title: "Jonas's notes for the gym",
    body: "3 sets of 12 deadlifts, 4 sets of 10 bench press. Focus on tempo and form over heavy weights this week.",
    date: "Dec 19, 2021 • 08:15 AM",
    color: "bg-blue-50 border-blue-200",
    titleColor: "text-blue-700",
  },
];

const NAV_TABS = ["Today", "This Week", "This Month"];

export default function Dashboard() {
  const [folderTab, setFolderTab] = useState("This Week");
  const [noteTab, setNoteTab] = useState("Today");
  const [showModal, setShowModal] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [notes, setNotes] = useState(NOTES);

  const handleCreateNote = (noteData) => {
    const newNote = {
      id: Date.now(),
      title: noteData.title || "Untitled Note",
      body: noteData.content || "",
      date: new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" }),
      color: noteData.color === "yellow" ? "bg-yellow-50 border-yellow-200"
        : noteData.color === "pink" ? "bg-rose-50 border-rose-200"
        : noteData.color === "blue" ? "bg-blue-50 border-blue-200"
        : "bg-gray-50 border-gray-200",
    };
    setNotes((prev) => [newNote, ...prev]);
    setShowEditor(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden" style={{ minHeight: 680 }}>
        <div className="flex h-full">
          {/* Sidebar */}
          <aside className="w-40 bg-gray-50 border-r border-gray-100 flex flex-col py-6 px-4 gap-4 shrink-0">
            <div>
              <p className="font-bold text-sm text-gray-800">The Archive</p>
              <p className="text-xs text-gray-400">Personal Workspace</p>
            </div>
            <Button
              size="sm"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold gap-1"
              onClick={() => setShowModal(true)}
            >
              <Plus className="w-3.5 h-3.5" /> Add New
            </Button>
            <div className="flex flex-col gap-1 mt-1">
              <div className="flex gap-1.5 items-center py-1 px-2">
                <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" />
                <span className="w-2 h-2 rounded-full bg-green-400 inline-block" />
              </div>
            </div>
            <nav className="flex flex-col gap-2 mt-2">
              {[{ icon: Lock, label: "Locks" }, { icon: Bell, label: "Reminders" }, { icon: Trash2, label: "Trash" }].map(({ icon: Icon, label }) => (
                <button key={label} className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-800 py-1.5 px-2 rounded-lg hover:bg-gray-200 transition-colors">
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Main content */}
          <main className="flex-1 flex flex-col overflow-y-auto">
            {/* Topbar */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h1 className="font-bold text-lg tracking-tight text-gray-800">MY NOTES</h1>
              <div className="flex items-center gap-2 flex-1 mx-6">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <Input className="pl-9 pr-8 h-8 rounded-xl bg-gray-50 border-gray-200 text-xs" placeholder="Search notes, folders..." />
                  <SlidersHorizontal className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 rounded-full hover:bg-gray-100"><User className="w-4 h-4 text-gray-500" /></button>
                <button className="p-1.5 rounded-full hover:bg-gray-100"><Menu className="w-4 h-4 text-gray-500" /></button>
              </div>
            </div>

            <div className="px-6 py-5 flex-1">
              {/* Recent Folders */}
              <section className="mb-6">
                <h2 className="font-bold text-base text-gray-800 mb-3">Recent Folders</h2>
                <div className="flex gap-1 mb-4">
                  {NAV_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setFolderTab(tab)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${folderTab === tab ? "text-gray-800 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {FOLDERS.map((folder) => (
                    <div key={folder.id} className={`${folder.color} rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow relative border border-transparent`}>
                      <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><MoreVertical className="w-3.5 h-3.5" /></button>
                      <Folder className={`w-7 h-7 mb-3 ${folder.iconColor}`} />
                      <p className="font-semibold text-sm text-gray-800">{folder.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{folder.files} files • {folder.date}</p>
                    </div>
                  ))}
                  <div className="rounded-2xl p-4 border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 transition-colors min-h-[110px]">
                    <div className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center mb-2">
                      <Plus className="w-3.5 h-3.5 text-gray-400" />
                    </div>
                    <p className="text-xs text-gray-400">New folder</p>
                  </div>
                </div>
              </section>

              {/* My Notes */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-base text-gray-800">My Notes</h2>
                  <Badge variant="outline" className="text-xs text-gray-500 gap-1">
                    <Clock className="w-3 h-3" /> Dec 2021 ▾
                  </Badge>
                </div>
                <div className="flex gap-1 mb-4">
                  {NAV_TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setNoteTab(tab)}
                      className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${noteTab === tab ? "text-gray-800 border-b-2 border-blue-600" : "text-gray-400 hover:text-gray-600"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {notes.map((note) => (
                    <div key={note.id} className={`${note.color} border rounded-2xl p-4 cursor-pointer hover:shadow-md transition-shadow relative`}>
                      <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"><MoreVertical className="w-3.5 h-3.5" /></button>
                      <p className={`font-semibold text-sm mb-2 pr-4 ${note.titleColor || "text-gray-800"}`}>{note.title}</p>
                      <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{note.body}</p>
                      <div className="flex items-center gap-1 mt-3">
                        <Clock className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-400">{note.date}</span>
                      </div>
                    </div>
                  ))}
                  {/* New Note Card */}
                  <div
                    className="rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-blue-300 transition-colors min-h-[150px] gap-2"
                    onClick={() => setShowEditor(true)}
                  >
                    <FilePlus className="w-7 h-7 text-gray-300" />
                    <p className="text-xs text-gray-400">New Note</p>
                  </div>
                </div>
              </section>
            </div>
          </main>
        </div>
      </div>

      {/* Modals */}
      {showModal && (
        <CreateNoteModal
          onClose={() => setShowModal(false)}
          onCreateNote={() => { setShowModal(false); setShowEditor(true); }}
        />
      )}
      {showEditor && (
        <NewNoteEditor
          onClose={() => setShowEditor(false)}
          onSave={handleCreateNote}
        />
      )}
    </div>
  );
}
