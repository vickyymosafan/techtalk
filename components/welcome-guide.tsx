import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import {
  Moon,
  FolderPlus,
  Code2,
  FileCode2,
  Database,
  MessageSquare,
} from "lucide-react";

interface WelcomeGuideProps {
  onCreateGroup: () => void;
}

export function WelcomeGuide({ onCreateGroup }: WelcomeGuideProps) {
  const { theme, setTheme } = useTheme();

  return (
    <main className="flex flex-col items-center justify-center h-[calc(100vh-120px)] p-4">
      <section className="w-full max-w-[280px] xs:max-w-[350px] sm:max-w-[450px] md:max-w-[500px] mx-auto overflow-y-auto max-h-full">
        {/* Header */}
        <header className="text-center mb-6">
          <h2 className="text-xl font-semibold mb-2 bg-gradient-to-r from-primary/90 to-primary/60 bg-clip-text text-transparent">
            Selamat Datang di Techtalk! 👋
          </h2>
          <p className="text-sm text-muted-foreground/80 leading-relaxed">
            3 Langkah Mudah Memulai Percakapan
          </p>
        </header>

        {/* Dark Mode Tip - Simplified */}
        {theme === "light" && (
          <aside className="mb-6 p-2.5 bg-secondary/20 rounded-lg border border-border/40">
            <figure className="flex items-center gap-2 text-sm">
              <Moon className="h-4 w-4 text-slate-700" />
              <Button
                variant="link"
                onClick={() => setTheme("dark")}
                className="h-auto text-primary hover:text-primary/80 text-sm p-0"
              >
                Aktifkan Dark Mode
              </Button>
            </figure>
          </aside>
        )}

        <nav className="space-y-4">
          {/* Langkah 1 - Simplified */}
          <article className="group relative bg-gradient-to-br from-background to-secondary/20 rounded-lg p-4 border border-border/40">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary">
                1
              </span>
              <h3 className="text-base font-semibold">Buat Folder</h3>
            </div>

            <div className="pl-10">
              <Button
                onClick={onCreateGroup}
                className="w-half bg-primary/90 hover:bg-primary text-primary-foreground h-9 text-sm font-bold"
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                KLIK DISINI
              </Button>
            </div>
          </article>

          {/* Langkah 2 - Simplified */}
          <article className="bg-gradient-to-br from-background to-secondary/10 rounded-lg p-4 border border-border/40">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary/30 text-muted-foreground">
                2
              </span>
              <h3 className="text-base font-semibold">Mulai Obrolan</h3>
            </div>
            <p className="text-sm text-muted-foreground/90 pl-10">
              Klik tombol "Obrolan Baru" di dalam folder
            </p>
          </article>

          {/* Langkah 3 - Simplified */}
          <article className="bg-gradient-to-br from-background to-secondary/10 rounded-lg p-4 border border-border/40">
            <div className="flex items-center gap-3 mb-2">
              <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-secondary/30 text-muted-foreground">
                3
              </span>
              <h3 className="text-base font-semibold">Tanyakan Apapun!</h3>
            </div>
            <div className="pl-10 space-y-2">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-secondary/20 text-sm">
                <Code2 className="h-4 w-4 text-primary/70" />
                Contoh: "Bagaimana cara belajar coding?"
              </div>
            </div>
          </article>

          {/* Quick Tips - Simplified */}
          <aside className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg p-3 border border-primary/20">
            <div className="flex items-center gap-2 text-primary mb-1 text-sm">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium">Tips</span>
            </div>
            <p className="text-xs text-muted-foreground/90">
              Enter untuk kirim • Shift + Enter untuk baris baru
            </p>
          </aside>
        </nav>
      </section>
    </main>
  );
}
