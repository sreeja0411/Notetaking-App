import { NotesProvider } from "@/context/NotesContext";
import Dashboard from "@/pages/Dashboard";
import { Toaster } from "sonner";

export default function App() {
  return (
    <NotesProvider>
      <Dashboard />
      <Toaster richColors position="bottom-right" />
    </NotesProvider>
  );
}
