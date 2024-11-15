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
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4 md:p-6">
      <section className="w-full max-w-[280px] xs:max-w-[350px] sm:max-w-[450px] md:max-w-[500px] mx-auto">
        <header className="text-center mb-8 md:mb-10">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 bg-gradient-to-r from-primary/90 to-primary/60 bg-clip-text text-transparent">
            Selamat Datang di Techtalk! 👋
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground/80 leading-relaxed max-w-[80%] mx-auto">
            Mari mulai percakapan pertama Anda dengan langkah sederhana
          </p>

          {theme === "light" && (
            <aside className="mt-4 p-3 bg-secondary/20 rounded-lg border border-border/40 max-w-[90%] mx-auto">
              <figure className="flex items-center gap-2 text-sm">
                <Moon className="h-4 w-4 text-slate-700" />
                <figcaption className="text-muted-foreground">
                  Tip: Gunakan Dark Mode untuk pengalaman yang lebih nyaman.
                  <Button
                    variant="link"
                    onClick={() => setTheme("dark")}
                    className="px-1.5 h-auto text-primary hover:text-primary/80"
                  >
                    Aktifkan Dark Mode
                  </Button>
                  atau buka menu di sidebar.
                </figcaption>
              </figure>
            </aside>
          )}
        </header>

        <nav className="space-y-5 sm:space-y-6">
          {/* Langkah 1 */}
          <article className="group relative bg-gradient-to-br from-background to-secondary/20 rounded-xl p-4 sm:p-5 text-left border border-border/40 hover:border-primary/30 transition-all duration-300 hover:shadow-[0_0_25px_-5px] hover:shadow-primary/10">
            {/* Indikator aktif dengan animasi */}
            <div className="absolute -left-0.5 sm:-left-1 top-1/2 -translate-y-1/2 w-1 h-16 bg-gradient-to-b from-primary to-primary/50 rounded-full group-hover:scale-y-110 transition-transform duration-300" />

            <div className="relative">
              <div className="flex items-center gap-3 mb-3">
                <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary ring-1 ring-primary/25 group-hover:ring-primary/40 transition-all duration-300">
                  <span className="text-sm font-semibold">1</span>
                </span>
                <h3 className="text-base sm:text-lg font-semibold tracking-tight">
                  Buat Folder Baru
                </h3>
              </div>

              <p className="text-sm text-muted-foreground/90 mb-4 pl-11 leading-relaxed">
                Mulai dengan membuat folder untuk mengorganisir percakapan Anda.
                Seperti direktori yang menyimpan obrolan terkait.
              </p>

              {/* Contoh Folder dengan scrolling halus */}
              <div className="mb-4 pl-11">
                <div className="overflow-x-auto pb-2 hide-scrollbar">
                  <div className="flex items-center gap-2 min-w-max">
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground/70">
                      <FolderPlus className="h-3.5 w-3.5" />
                      Contoh:
                    </span>
                    {[
                      "Proyek Kerja",
                      "Catatan Pribadi",
                      "Belajar Coding",
                      "Ide Bisnis",
                    ].map((folder) => (
                      <span
                        key={folder}
                        className="px-2.5 py-1.5 text-xs rounded-md bg-secondary/40 border border-border/40 text-foreground/80 whitespace-nowrap"
                      >
                        {folder}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pl-11">
                <Button
                  onClick={onCreateGroup}
                  className="w-full bg-primary/90 hover:bg-primary text-primary-foreground h-9 sm:h-10 text-sm font-medium shadow-sm hover:shadow-md transition-all duration-300"
                >
                  <FolderPlus className="mr-2 h-4 w-4" />
                  Buat Folder Sekarang
                </Button>
              </div>
            </div>
          </article>

          {/* Langkah 2 */}
          <article className="group relative bg-gradient-to-br from-background to-secondary/10 rounded-xl p-4 sm:p-5 text-left border border-border/40 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/30 text-muted-foreground ring-1 ring-border/40 transition-all duration-300">
                <span className="text-sm font-semibold">2</span>
              </span>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight">
                Mulai Obrolan Baru
              </h3>
            </div>

            <div className="space-y-3 pl-11">
              <p className="text-sm text-muted-foreground/90 leading-relaxed">
                Setelah membuat folder, cari tombol "Obrolan Baru" untuk memulai
                percakapan.
              </p>
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-secondary/20 border border-border/40">
                <FolderPlus className="h-4 w-4 text-primary/70" />
                <span className="text-sm">
                  Tombol ini akan muncul di dalam folder Anda
                </span>
              </div>
            </div>
          </article>

          {/* Langkah 3 */}
          <article className="group relative bg-gradient-to-br from-background to-secondary/10 rounded-xl p-4 sm:p-5 text-left border border-border/40 transition-all duration-300">
            <div className="flex items-center gap-3 mb-3">
              <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-secondary/30 text-muted-foreground ring-1 ring-border/40 transition-all duration-300">
                <span className="text-sm font-semibold">3</span>
              </span>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight">
                Mulai Mengobrol
              </h3>
            </div>

            <div className="space-y-3 pl-11">
              <p className="text-sm text-muted-foreground/90 leading-relaxed">
                Sekarang Anda bisa mulai mengobrol! Berikut beberapa contoh
                pertanyaan:
              </p>
              <div className="space-y-2">
                {[
                  {
                    icon: <Code2 className="h-4 w-4" />,
                    text: "Jelaskan cara kerja React hooks",
                  },
                  {
                    icon: <FileCode2 className="h-4 w-4" />,
                    text: "Buatkan fungsi Python untuk mengurutkan array",
                  },
                  {
                    icon: <Database className="h-4 w-4" />,
                    text: "Jelaskan konsep database NoSQL",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2.5 p-2.5 rounded-lg bg-secondary/20 border border-border/40 group-hover:border-border/60 transition-all duration-300"
                  >
                    <span className="text-primary/70">{item.icon}</span>
                    <span className="text-sm">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </article>

          {/* Tips */}
          <aside className="relative overflow-hidden rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 p-4">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="relative">
              <div className="flex items-center gap-2 text-primary mb-2">
                <MessageSquare className="h-4 w-4" />
                <span className="font-medium">Tips Berguna</span>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                  <span className="font-medium text-foreground/90">Enter</span>{" "}
                  untuk mengirim pesan
                </p>
                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                  <span className="font-medium text-foreground/90">
                    Shift + Enter
                  </span>{" "}
                  untuk baris baru
                </p>
                <p className="text-sm text-muted-foreground/90 leading-relaxed">
                  <span className="font-medium text-foreground/90">≡</span>{" "}
                  untuk mengelola folder & obrolan
                </p>
              </div>
            </div>
          </aside>
        </nav>
      </section>
    </main>
  );
}
