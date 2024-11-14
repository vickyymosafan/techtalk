"use client";

import React, {
  useState,
  useCallback,
  lazy,
  Suspense,
  useRef,
  useEffect,
} from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Menu,
  X,
  Moon,
  Sun,
  LogOut,
  FolderPlus,
  FilePlus,
  Paperclip,
  Send,
  ChevronDown,
  ChevronRight,
  MoreVertical,
  MessageSquare,
  Code2,
  BrainCircuit,
  Database,
  FileCode2,
  Cpu,
  Terminal,
  Webhook,
  Binary,
  FolderOpen,
  Folder,
  Trash,
  Pencil,
  Check,
  Copy,
} from "lucide-react";
import { useTheme } from "next-themes";
import { format } from "date-fns";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { Resizable } from "re-resizable";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { streamGroqResponse } from "@/lib/groq";
import type {
  Message,
  StreamHandler,
  Chat,
  Group as GroupType,
  ChainedResponse,
} from "@/types/chat";
import { useAuth } from "@/contexts/auth-context";

const MonacoEditor = lazy(() => import("@monaco-editor/react"));

interface ChatTypeInfo {
  id: string;
  type: "general" | "code" | "database" | "ai" | "system";
  icon: React.ReactNode;
  color: string;
  name?: string;
  createdAt?: Date;
}

const chatTypes: { [key: string]: ChatTypeInfo } = {
  general: {
    id: "general",
    type: "general",
    icon: <MessageSquare className="h-4 w-4" />,
    color: "text-blue-500",
  },
  code: {
    id: "code",
    type: "code",
    icon: <Code2 className="h-4 w-4" />,
    color: "text-green-500",
  },
  database: {
    id: "database",
    type: "database",
    icon: <Database className="h-4 w-4" />,
    color: "text-purple-500",
  },
  ai: {
    id: "ai",
    type: "ai",
    icon: <BrainCircuit className="h-4 w-4" />,
    color: "text-red-500",
  },
  system: {
    id: "system",
    type: "system",
    icon: <Cpu className="h-4 w-4" />,
    color: "text-orange-500",
  },
};

interface SupportedLanguage {
  id: string;
  name: string;
}

const supportedLanguages: SupportedLanguage[] = [
  { id: "plaintext", name: "Plain Text" },
  { id: "javascript", name: "JavaScript" },
  { id: "typescript", name: "TypeScript" },
  { id: "html", name: "HTML" },
  { id: "css", name: "CSS" },
  { id: "php", name: "PHP" },
  { id: "python", name: "Python" },
  { id: "java", name: "Java" },
  { id: "csharp", name: "C#" },
  { id: "cpp", name: "C++" },
  { id: "ruby", name: "Ruby" },
  { id: "go", name: "Go" },
  { id: "rust", name: "Rust" },
  { id: "sql", name: "SQL" },
  { id: "markdown", name: "Markdown" },
  { id: "json", name: "JSON" },
  { id: "yaml", name: "YAML" },
  { id: "shell", name: "Shell" },
];

const getLanguageFromCode = (code: string): string => {
  if (code.includes("<?php")) return "php";
  if (code.includes("<html") || code.includes("<!DOCTYPE")) return "html";
  if (code.includes("import React")) return "typescript";
  if (code.includes("def ") || code.includes("print(")) return "python";
  if (code.includes("function") || code.includes("=>")) return "javascript";
  if (code.includes(".css") || code.includes("{")) return "css";
  return "plaintext";
};

// Tambahkan fungsi untuk mengevaluasi JavaScript/TypeScript secara aman
const evaluateJavaScript = (code: string): string => {
  try {
    // Gunakan Function constructor untuk membuat sandbox
    const result = new Function(`
      "use strict";
      let console = {
        log: function(...args) {
          return args.join(' ');
        }
      };
      return (function() {
        ${code}
      })();
    `)();

    return String(result);
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
};

// Fungsi untuk mengeksekusi Python code di backend
const executePythonCode = async (code: string) => {
  try {
    const response = await fetch("/api/execute-python", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code }),
    });
    const data = await response.json();
    return data.output;
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
};

// Tambahkan utility function untuk mendeteksi jumlah yang diminta
const extractRequestedCount = (message: string): number | null => {
  // Cari pola angka yang diikuti dengan item/data/baris/entries dll
  const patterns = [
    /(\d+)\s*(items?|data|rows?|entries|examples?|samples?)/i,
    /generate\s*(\d+)/i,
    /create\s*(\d+)/i,
    /list\s*(\d+)/i,
    /show\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1]);
    }
  }
  return null;
};

// Tambahkan komponen WelcomeGuide
const WelcomeGuide = ({ onCreateGroup }: { onCreateGroup: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-120px)] p-4 md:p-6">
      {/* Container utama dengan max-width yang responsif */}
      <div className="w-full max-w-[280px] xs:max-w-[350px] sm:max-w-[450px] md:max-w-[500px] mx-auto">
        {/* Header dengan font yang lebih modern */}
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-xl xs:text-2xl md:text-3xl font-bold mb-2 tracking-tight">
            Selamat Datang di Techtalk! 👋
          </h2>
          <p className="text-sm xs:text-base text-muted-foreground leading-relaxed">
            Mari mulai percakapan pertama Anda
          </p>
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Langkah 1 dengan font yang lebih readable */}
          <div className="bg-secondary/30 rounded-lg p-3 sm:p-4 text-left relative">
            {/* Indikator aktif */}
            <div className="absolute -left-1 sm:-left-2 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary rounded-full" />

            <h3 className="font-semibold flex items-center gap-2 mb-2 sm:mb-3">
              <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-medium">
                1
              </span>
              <span className="text-sm sm:text-base tracking-tight">
                Buat Folder Baru
              </span>
            </h3>

            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4 leading-relaxed">
              Pertama, buat Folder untuk mengatur percakapan Anda. Anggap saja
              seperti folder untuk menyimpan obrolan yang saling berhubungan.
            </p>

            {/* Contoh Folder - Scrollable pada mobile */}
            <div className="overflow-x-auto pb-2 mb-3 hide-scrollbar">
              <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground min-w-max">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <FolderPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                  Contoh Folder:
                </span>
                <span className="bg-secondary/50 px-2 py-1 rounded whitespace-nowrap">
                  Proyek Kerja
                </span>
                <span className="bg-secondary/50 px-2 py-1 rounded whitespace-nowrap">
                  Catatan Pribadi
                </span>
                <span className="bg-secondary/50 px-2 py-1 rounded whitespace-nowrap">
                  Belajar
                </span>
              </div>
            </div>

            <Button
              onClick={onCreateGroup}
              className="w-full bg-primary hover:bg-primary/90 h-9 sm:h-10 text-xs sm:text-sm"
            >
              <FolderPlus className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Klik Disini
            </Button>
          </div>

          {/* Langkah 2 dengan font yang lebih konsisten */}
          <div className="bg-secondary/30 rounded-lg p-3 sm:p-4 text-left opacity-70">
            <h3 className="font-semibold flex items-center gap-2 mb-2 sm:mb-3">
              <span className="bg-primary/20 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-medium">
                2
              </span>
              <span className="text-sm sm:text-base tracking-tight">
                Mulai Obrolan Baru
              </span>
            </h3>

            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Setelah membuat Folder, Anda akan melihat tombol "Obrolan Baru".
                Klik untuk memulai percakapan.
              </p>
              <div className="bg-secondary/20 rounded-lg p-2 sm:p-3">
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <FilePlus className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                  <span>Cari tombol ini di dalam Folder Anda</span>
                </div>
              </div>
            </div>
          </div>

          {/* Langkah 3: Mulai Mengobrol */}
          <div className="bg-secondary/30 rounded-lg p-3 sm:p-4 text-left opacity-70">
            <h3 className="font-semibold flex items-center gap-2 mb-2 sm:mb-3">
              <span className="bg-primary/20 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs sm:text-sm font-medium">
                3
              </span>
              <span className="text-sm sm:text-base tracking-tight">
                Mulai Mengobrol
              </span>
            </h3>

            <div className="space-y-2 sm:space-y-3">
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Sekarang Anda bisa mulai mengobrol! Berikut beberapa contoh
                pertanyaan yang bisa Anda ajukan:
              </p>
              <div className="space-y-2">
                <div className="bg-secondary/20 rounded-lg p-2 text-xs sm:text-sm">
                  "Tolong jelaskan cara kerja React hooks"
                </div>
                <div className="bg-secondary/20 rounded-lg p-2 text-xs sm:text-sm">
                  "Buatkan fungsi Python untuk mengurutkan daftar"
                </div>
                <div className="bg-secondary/20 rounded-lg p-2 text-xs sm:text-sm">
                  "Jelaskan bagaimana database bekerja"
                </div>
              </div>
            </div>
          </div>

          {/* Tips Cepat */}
          <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 text-xs sm:text-sm">
            <div className="flex items-center gap-2 text-primary font-medium mb-2">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4" />
              Tips Cepat
            </div>
            <p className="text-muted-foreground">
              Tekan Enter untuk mengirim pesan dan Shift + Enter untuk baris
              baru. Gunakan menu samping (≡) untuk mengelola Folder dan obrolan
              Anda.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Tambahkan CSS untuk menyembunyikan scrollbar pada overflow-x
const styles = `
  .hide-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .hide-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  
  .prevent-overscroll {
    overscroll-behavior: none;
  }
  
  .touch-scroll {
    -webkit-overflow-scrolling: touch;
  }
  
  .ios-height {
    height: -webkit-fill-available;
  }
  
  .overscroll-contain {
    overscroll-behavior-y: contain;
  }
  
  .markdown-content {
    overflow-wrap: break-word;
    word-wrap: break-word;
    word-break: break-word;
    background: transparent;
  }
  
  .markdown-content > * {
    position: relative;
    padding: 0.5rem 0;
  }

  .markdown-content h1,
  .markdown-content h2,
  .markdown-content h3,
  .markdown-content h4,
  .markdown-content h5,
  .markdown-content h6 {
    margin: 1.5rem 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border) / 0.2);
    line-height: 1.25;
  }

  .markdown-content h1:first-child,
  .markdown-content h2:first-child,
  .markdown-content h3:first-child,
  .markdown-content h4:first-child,
  .markdown-content h5:first-child,
  .markdown-content h6:first-child {
    margin-top: 0;
  }

  .markdown-content p {
    margin: 0.75rem 0;
    line-height: 1.6;
  }

  .markdown-content ul,
  .markdown-content ol {
    margin: 0.75rem 0;
    padding-left: 1.5rem;
  }

  .markdown-content li {
    margin: 0.375rem 0;
    padding-left: 0.25rem;
  }

  .markdown-content blockquote {
    margin: 1rem 0;
    padding: 0.5rem 1rem;
    border-left: 3px solid hsl(var(--primary) / 0.5);
    background: hsl(var(--muted) / 0.3);
    border-radius: 0.375rem;
  }

  .markdown-content pre {
    margin: 1rem 0;
    padding: 1rem;
    background: hsl(var(--secondary) / 0.3);
    border: 1px solid hsl(var(--border) / 0.2);
    border-radius: 0.5rem;
    overflow-x: auto;
  }

  .markdown-content code:not(pre code) {
    padding: 0.2em 0.4em;
    background: hsl(var(--secondary) / 0.3);
    border-radius: 0.25rem;
    font-size: 0.875em;
  }

  .markdown-content table {
    width: 100%;
    margin: 1rem 0;
    border-collapse: collapse;
    font-size: 0.875em;
  }

  .markdown-content th,
  .markdown-content td {
    padding: 0.5rem;
    border: 1px solid hsl(var(--border) / 0.2);
  }

  .markdown-content th {
    background: hsl(var(--secondary) / 0.3);
    font-weight: 600;
  }

  @media (max-width: 640px) {
    .markdown-content {
      font-size: 0.875rem;
    }

    .markdown-content h1 { font-size: 1.5rem; }
    .markdown-content h2 { font-size: 1.25rem; }
    .markdown-content h3 { font-size: 1.125rem; }
    .markdown-content h4,
    .markdown-content h5,
    .markdown-content h6 { font-size: 1rem; }

    .markdown-content pre {
      margin: 0.75rem -0.5rem;
      padding: 0.75rem;
      font-size: 0.75rem;
    }

    .markdown-content code:not(pre code) {
      font-size: 0.75rem;
    }
  }
`;

// Update fungsi copyToClipboard
const copyToClipboard = async (text: string) => {
  try {
    // Proses teks untuk mempertahankan hanya format yang diinginkan
    const processedText = text
      // Hapus code blocks
      .replace(/```[\s\S]*?```/g, "")
      // Hapus inline code
      .replace(/`[^`]*`/g, "")
      // Hapus markdown links tapi pertahankan teksnya
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Hapus markdown images
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, "")
      // Pertahankan bold
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1")
      // Hapus italic
      .replace(/\*([^*]+)\*/g, "$1")
      .replace(/_([^_]+)_/g, "$1")
      // Pertahankan lists dan bullet points
      .replace(/^\s*[-*+]\s+/gm, "• ")
      .replace(/^\s*\d+\.\s+/gm, (match) => match)
      // Bersihkan multiple newlines
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    await navigator.clipboard.writeText(processedText);

    // Visual feedback
    const button = document.activeElement as HTMLButtonElement;
    if (button) {
      const originalContent = button.innerHTML;
      button.innerHTML =
        '<svg class="h-2.5 w-2.5 sm:h-3 sm:w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>';
      setTimeout(() => {
        button.innerHTML = originalContent;
      }, 1000);
    }
  } catch (err) {
    console.error("Failed to copy text: ", err);
  }
};

const inputClassName =
  "w-full px-2 py-1 text-sm bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary";

export function DashboardComponent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [groups, setGroups] = useState<GroupType[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);
  const [currentChat, setCurrentChat] = useState<ChatTypeInfo | null>(null);
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({});
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [codeContent, setCodeContent] = useState("");
  const { setTheme, theme } = useTheme();
  const [isPreviewOpen, setIsPreviewOpen] = useLocalStorage(
    "preview-open",
    true
  );

  const [previewWidth, setPreviewWidth] = useLocalStorage("preview-width", 400);
  const [newItems, setNewItems] = useState<{ [key: string]: boolean }>({});
  const [isEditing, setIsEditing] = useState(false);
  const [editedCode, setEditedCode] = useState("");
  const [currentLanguage, setCurrentLanguage] = useState("javascript");
  const [isChaining, setIsChaining] = useState(false);
  const [chainedResponses, setChainedResponses] = useState<{
    [key: string]: ChainedResponse[];
  }>({});

  const [currentChainCursor, setCurrentChainCursor] = useState(0);
  const [executionResult, setExecutionResult] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const messageContainerRef = React.useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);

  // Enhanced scroll to bottom function for mobile support
  const scrollToBottom = useCallback((force: boolean = false) => {
    if (mainContentRef.current && lastMessageRef.current) {
      const container = mainContentRef.current;
      const lastMessage = lastMessageRef.current;

      // Get container dimensions
      const containerHeight = container.clientHeight;
      const scrollTop = container.scrollTop;
      const scrollHeight = container.scrollHeight;

      // Check if we're already near bottom (within 100px) or if force scroll is requested
      const isNearBottom = scrollHeight - (scrollTop + containerHeight) < 100;

      if (isNearBottom || force) {
        // Use smooth scroll for iOS
        if (
          typeof CSS !== "undefined" &&
          CSS.supports("scroll-behavior", "smooth")
        ) {
          container.style.scrollBehavior = "smooth";
          lastMessage.scrollIntoView({ block: "end" });
          // Reset scroll behavior after animation
          setTimeout(() => {
            container.style.scrollBehavior = "auto";
          }, 500);
        } else {
          // Fallback for browsers that don't support smooth scrolling
          container.scrollTo({
            top: scrollHeight,
            behavior: "smooth",
          });
        }
      }
    }
  }, []);

  // Add intersection observer for better scroll tracking
  useEffect(() => {
    if (!mainContentRef.current) return;

    const options = {
      root: mainContentRef.current,
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && isLoading) {
          scrollToBottom(true);
        }
      });
    }, options);

    if (lastMessageRef.current) {
      observer.observe(lastMessageRef.current);
    }

    return () => observer.disconnect();
  }, [isLoading, scrollToBottom]);

  // Add effect to automatically open preview when code is detected
  useEffect(() => {
    if (codeContent && !isPreviewOpen) {
      setIsPreviewOpen(true);
    }
  }, [codeContent]);

  // Update handleSendMessage to detect code blocks
  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && currentChat) {
      const count = extractRequestedCount(inputMessage);
      setRequestedCount(count);
      setCurrentCount(0);

      const updatedMessages: Message[] = [
        ...(messages[currentChat.id] || []),
        { role: "user" as const, content: inputMessage },
      ];

      setMessages((prev) => ({
        ...prev,
        [currentChat.id]: updatedMessages,
      }));
      setInputMessage("");
      setIsLoading(true);

      // Reset textarea height
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.style.height = "2.5rem";
      }

      // Initial scroll without smooth behavior
      if (lastMessageRef.current) {
        lastMessageRef.current.scrollIntoView({
          behavior: "auto",
          block: "end",
        });
      }

      // Start AI response with empty content
      setMessages((prev) => ({
        ...prev,
        [currentChat.id]: [
          ...updatedMessages,
          { role: "assistant", content: "" },
        ],
      }));

      const systemPrompt = count
        ? `Berikan tepat ${count} item. Format setiap item dengan nomor urut dimulai dari 1.`
        : "";

      // Force scroll to bottom immediately when sending
      scrollToBottom(true);

      streamGroqResponse(
        [
          ...updatedMessages,
          ...(systemPrompt
            ? [{ role: "system" as const, content: systemPrompt }]
            : []),
        ],
        {
          onToken: (token) => {
            setMessages((prev) => {
              const prevContent =
                prev[currentChat.id]?.slice(-1)[0]?.content || "";
              const newContent = prevContent + token;

              // Check for code blocks in the response
              const codeBlockMatch = newContent.match(
                /```(\w+)?\n([\s\S]*?)```/
              );
              if (codeBlockMatch) {
                const [, language, code] = codeBlockMatch;
                setCodeContent(code.trim());
                setCurrentLanguage(language || getLanguageFromCode(code));
              }

              return {
                ...prev,
                [currentChat.id]: [
                  ...updatedMessages,
                  { role: "assistant", content: newContent },
                ],
              };
            });
            requestAnimationFrame(() => scrollToBottom(false));
          },
          onComplete: () => {
            setIsLoading(false);
            // Final scroll with force enabled
            scrollToBottom(true);
          },
          onError: (error) => {
            console.error("Groq API Error:", error);
            setIsLoading(false);
            setMessages((prev) => ({
              ...prev,
              [currentChat.id]: [
                ...updatedMessages,
                {
                  role: "assistant",
                  content:
                    "❌ Sorry, there was an error generating the response. Please try again.",
                },
              ],
            }));
            scrollToBottom(true);
          },
        }
      );
    }
  }, [inputMessage, currentChat, messages, scrollToBottom]);

  // Add useEffect to handle initial scroll
  useEffect(() => {
    if (lastMessageRef.current && messages[currentChat?.id ?? ""]?.length) {
      scrollToBottom();
    }
  }, [messages, currentChat, scrollToBottom]);

  // Update progress indicator
  const renderChainIndicator = () => {
    if (isChaining && requestedCount) {
      const progress = (currentCount / requestedCount) * 100;
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1">
            <div className="text-xs mb-1">
              Generating {currentCount} of {requestedCount} items (
              {progress.toFixed(1)}%)
            </div>
            <div className="w-full bg-secondary h-1 rounded-full">
              <div
                className="bg-primary h-1 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const handleCodeChange = useCallback((value: string | undefined) => {
    setEditedCode(value || "");
  }, []);

  const handleSaveCode = useCallback(() => {
    setCodeContent(editedCode);
    setIsEditing(false);
  }, [editedCode]);

  const deleteAllGroups = useCallback(() => {
    // Clear all data for all groups and chats
    groups.forEach((group) => {
      group.chats.forEach((chat) => {
        // Clear from localStorage
        localStorage.removeItem(`chat-${chat.id}`);
        localStorage.removeItem(`responses-${chat.id}`);
      });
      localStorage.removeItem(`group-${group.id}`);
    });

    // Reset all states
    setGroups([]);
    setExpandedGroups([]);
    setCurrentChat(null);
    setMessages({});
    setChainedResponses({});
    setCurrentCount(0);
    setRequestedCount(null);
    setIsChaining(false);
    setCurrentChainCursor(0);
    setCodeContent("");
    setEditedCode("");
    setIsEditing(false);

    // Clear any other related localStorage items
    localStorage.removeItem("groups");
    localStorage.removeItem("expanded-groups");
    localStorage.removeItem("current-chat");
  }, []);

  const deleteAllChatsInGroup = useCallback((groupId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete all chats in this group? This action cannot be undone."
      )
    ) {
      setGroups((prevGroups) =>
        prevGroups.map((group) =>
          group.id === groupId ? { ...group, chats: [] } : group
        )
      );
      setCurrentChat(null);
      setMessages({});
    }
  }, []);

  const clearChat = useCallback(() => {
    if (currentChat) {
      // Clear messages for current chat
      setMessages((prev) => {
        const updated = { ...prev };
        delete updated[currentChat.id];
        return updated;
      });

      // Clear any chained responses
      setChainedResponses((prev) => {
        const updated = { ...prev };
        delete updated[currentChat.id];
        return updated;
      });

      // Reset states related to current chat
      setCurrentCount(0);
      setRequestedCount(null);
      setIsChaining(false);
      setCurrentChainCursor(0);
      setCodeContent("");
      setEditedCode("");
      setIsEditing(false);

      // Clear from localStorage
      localStorage.removeItem(`chat-${currentChat.id}`);
      localStorage.removeItem(`responses-${currentChat.id}`);
    }
  }, [currentChat]);

  // Add these state declarations before the saveNewName function
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  // Now the saveNewName function can use these state variables
  const saveNewName = useCallback(() => {
    if (renamingGroupId) {
      setGroups((prevGroups) =>
        prevGroups.map((group) =>
          group.id === renamingGroupId ? { ...group, name: newName } : group
        )
      );
      setRenamingGroupId(null);
    } else if (renamingChatId) {
      setGroups((prevGroups) =>
        prevGroups.map((group) =>
          group.chats.some((chat) => chat.id === renamingChatId)
            ? {
                ...group,
                chats: group.chats.map((chat) =>
                  chat.id === renamingChatId ? { ...chat, name: newName } : chat
                ),
              }
            : group
        )
      );
      setRenamingChatId(null);
    }
    setNewName("");
  }, [newName, renamingGroupId, renamingChatId]);

  const { logout } = useAuth();

  // Update the logout button handler
  const handleLogout = () => {
    logout();
  };

  const [requestedCount, setRequestedCount] = useState<number | null>(null);
  const [currentCount, setCurrentCount] = useState(0);

  const createNewGroup = useCallback(() => {
    const newGroup: GroupType = {
      id: crypto.randomUUID(),
      name: `New Folder ${groups.length + 1}`,
      createdAt: new Date(),
      chats: [],
    };
    setGroups((prev) => [...prev, newGroup]);
    setExpandedGroups((prev) => [...prev, newGroup.id]);
    setIsSidebarOpen(true);
  }, [groups.length]);

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  }, []);

  const renameGroup = useCallback(
    (groupId: string) => {
      const group = groups.find((g) => g.id === groupId);
      if (group) {
        setNewName(group.name);
        setRenamingGroupId(groupId);
      }
    },
    [groups]
  );

  const deleteGroup = useCallback(
    (groupId: string) => {
      if (
        window.confirm(
          "Are you sure you want to delete this group? This action cannot be undone."
        )
      ) {
        setGroups((prevGroups) =>
          prevGroups.filter((group) => group.id !== groupId)
        );
        if (
          currentChat &&
          groups
            .find((g) => g.id === groupId)
            ?.chats.some((c) => c.id === currentChat.id)
        ) {
          setCurrentChat(null);
        }
      }
    },
    [groups, currentChat]
  );

  const renameChat = useCallback(
    (groupId: string, chatId: string) => {
      const chat = groups
        .find((g) => g.id === groupId)
        ?.chats.find((c) => c.id === chatId);
      if (chat) {
        setNewName(chat.name);
        setRenamingChatId(chatId);
      }
    },
    [groups]
  );

  const deleteChat = useCallback(
    (groupId: string, chatId: string) => {
      if (
        window.confirm(
          "Are you sure you want to delete this chat? This action cannot be undone."
        )
      ) {
        setGroups((prevGroups) =>
          prevGroups.map((group) =>
            group.id === groupId
              ? {
                  ...group,
                  chats: group.chats.filter((chat) => chat.id !== chatId),
                }
              : group
          )
        );
        if (currentChat?.id === chatId) {
          setCurrentChat(null);
        }
      }
    },
    [currentChat]
  );

  const createNewChat = useCallback(
    (groupId: string) => {
      const newChat = {
        id: crypto.randomUUID(),
        name: `New Chat ${
          groups.find((g) => g.id === groupId)?.chats.length ?? 0 + 1
        }`,
        type: "general",
        createdAt: new Date(),
      };

      setGroups((prevGroups) =>
        prevGroups.map((group) =>
          group.id === groupId
            ? { ...group, chats: [...group.chats, newChat] }
            : group
        )
      );
    },
    [groups]
  );

  // Add this near the top of the DashboardComponent function
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.innerText = styles;
    document.head.appendChild(styleSheet);
    return () => styleSheet.remove();
  }, []);

  return (
    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <div className="flex vh-fix overflow-hidden bg-background text-foreground">
        {/* Sidebar - Update width untuk mobile */}
        <SheetContent
          side="left"
          className="w-[85%] sm:w-[380px] p-0 h-[100dvh] overflow-hidden"
        >
          <div className="flex flex-col h-full bg-secondary">
            <div className="p-4 flex items-center space-x-2">
              <Avatar>
                <AvatarImage
                  src={
                    theme === "dark"
                      ? "/images/logos/techtalk-white.png"
                      : "/images/logos/techtalk-black.png"
                  }
                  alt="Techtalk Logo"
                />
                <AvatarFallback>
                  <img
                    src="/images/logos/techtalk-black.png"
                    alt="Techtalk"
                    className="w-6 h-6"
                  />
                </AvatarFallback>
              </Avatar>
              <span className="font-bold">Techtalk</span>
              <div className="ml-auto flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="hover:bg-secondary/80"
                >
                  {theme === "dark" ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="hover:bg-secondary/80 -ml-2.5"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="h-[2px] bg-gray-400 dark:bg-gray-700" />
            <div className="p-4 space-y-2">
              <div className="flex gap-2">
                <Button
                  className="flex-1 justify-start"
                  onClick={createNewGroup}
                >
                  <FolderPlus className="mr-2 h-4 w-4" /> Membuat Folder Baru
                </Button>
                {groups.length > 0 && (
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={deleteAllGroups}
                    title="Delete all groups"
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <ScrollArea className="flex-1">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="mb-4 bg-secondary/30 rounded-lg overflow-hidden border border-gray-400 dark:border-gray-700 mx-2"
                >
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 relative">
                    <Button
                      variant="ghost"
                      className={`flex-1 justify-start relative group ${
                        newItems[group.id]
                          ? "bg-primary/10 dark:bg-primary/20 border-l-4 border-primary"
                          : ""
                      }`}
                      onClick={() => toggleGroupExpansion(group.id)}
                    >
                      <div className="flex items-center w-full pr-8">
                        <div className="flex items-center gap-2 transition-transform duration-200 flex-shrink-0">
                          {expandedGroups.includes(group.id) ? (
                            <>
                              <FolderOpen className="h-5 w-5 text-primary transition-colors duration-200" />
                              <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                            </>
                          ) : (
                            <>
                              <Folder className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                              <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors duration-200" />
                            </>
                          )}
                        </div>
                        <div className="flex-1 px-1 min-w-0">
                          <span
                            className={`font-medium block break-words ${
                              group.name.length > 15
                                ? "whitespace-normal line-clamp-2 h-[2.4em]"
                                : "whitespace-nowrap"
                            }`}
                            style={{
                              fontSize:
                                group.name.length > 15
                                  ? "12px"
                                  : `clamp(0.875rem, ${
                                      220 / group.name.length
                                    }px, 1.125rem)`,
                              lineHeight: "1.2",
                              wordBreak: "break-word",
                            }}
                          >
                            {renamingGroupId === group.id ? (
                              <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onBlur={saveNewName}
                                onKeyDown={(e) =>
                                  e.key === "Enter" && saveNewName()
                                }
                                className={inputClassName}
                              />
                            ) : (
                              <span>{group.name}</span>
                            )}
                          </span>
                        </div>
                      </div>
                    </Button>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="hover:bg-secondary/80 dark:hover:bg-secondary/50 flex-shrink-0"
                          >
                            <MoreVertical className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onSelect={() => renameGroup(group.id)}
                            className="flex items-center"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            <span>Rename Group</span>
                          </DropdownMenuItem>
                          {group.chats.length > 0 && (
                            <DropdownMenuItem
                              onSelect={() => deleteAllChatsInGroup(group.id)}
                              className="flex items-center text-red-600 focus:text-red-600"
                            >
                              <Trash className="h-4 w-4 mr-2" />
                              <span>Delete All Chats</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onSelect={() => deleteGroup(group.id)}
                            className="flex items-center text-red-600 focus:text-red-600"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            <span>Delete Group</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Optional: Add this after the group header for first-time users */}
                  {groups.length === 1 &&
                    !expandedGroups.includes(group.id) && (
                      <div className="px-4 py-2 text-xs text-muted-foreground bg-secondary/20 animate-pulse">
                        <div className="flex items-center gap-1">
                          <ChevronRight className="h-3 w-3" />
                          <span>
                            Tip: Click on the group to show/hide chats
                          </span>
                        </div>
                      </div>
                    )}

                  {/* Group Content with Animation */}
                  <AnimatePresence>
                    {expandedGroups.includes(group.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Chat List Header */}
                        <div className="px-6 py-2 text-xs font-medium text-muted-foreground bg-secondary/20">
                          Chat List ({group.chats.length})
                        </div>

                        {/* Chat Items */}
                        <div className="px-2 py-1 space-y-1">
                          {group.chats.map((chat) => (
                            <div
                              key={chat.id}
                              className="flex items-center justify-between pr-2 relative"
                            >
                              <Button
                                variant="ghost"
                                className={`flex-1 justify-start relative group hover:bg-secondary/80 ${
                                  currentChat?.id === chat.id
                                    ? "bg-secondary"
                                    : ""
                                } ${
                                  newItems[chat.id]
                                    ? "bg-primary/10 dark:bg-primary/20"
                                    : ""
                                }`}
                                onClick={() =>
                                  setCurrentChat({
                                    ...chatTypes[chat.type],
                                    id: chat.id,
                                    name: chat.name,
                                    createdAt: chat.createdAt,
                                  })
                                }
                              >
                                <div className="flex items-center w-full pr-8">
                                  <div
                                    className={`mr-2 ${
                                      chatTypes[chat.type]?.color
                                    } flex-shrink-0`}
                                  >
                                    {chatTypes[chat.type]?.icon}
                                  </div>
                                  <div className="flex-1 px-1 min-w-0">
                                    <span
                                      className={`block break-words ${
                                        chat.name.length > 15
                                          ? "whitespace-normal line-clamp-2 h-[2.4em]"
                                          : "whitespace-nowrap"
                                      }`}
                                      style={{
                                        fontSize:
                                          chat.name.length > 15
                                            ? "12px"
                                            : `clamp(0.875rem, ${
                                                220 / chat.name.length
                                              }px, 1.125rem)`,
                                        lineHeight: "1.2",
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {renamingChatId === chat.id ? (
                                        <input
                                          type="text"
                                          value={newName}
                                          onChange={(e) =>
                                            setNewName(e.target.value)
                                          }
                                          onBlur={saveNewName}
                                          onKeyDown={(e) =>
                                            e.key === "Enter" && saveNewName()
                                          }
                                          className={inputClassName}
                                        />
                                      ) : (
                                        <span>{chat.name}</span>
                                      )}
                                    </span>
                                  </div>
                                </div>
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="opacity-70 hover:opacity-100 hover:bg-secondary/80 dark:hover:bg-secondary/50 flex-shrink-0 absolute right-2"
                                  >
                                    <MoreVertical className="h-4 w-4 text-foreground dark:text-foreground/80" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      renameChat(group.id, chat.id)
                                    }
                                    className="flex items-center"
                                  >
                                    <Pencil className="h-4 w-4 mr-2" />
                                    <span>Rename</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onSelect={() =>
                                      deleteChat(group.id, chat.id)
                                    }
                                  >
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          ))}

                          {/* New Chat Button */}
                          <div className="px-2 pt-1 pb-2 border-t border-gray-400 dark:border-gray-700">
                            <Button
                              variant="outline"
                              className="w-full justify-start py-4 mt-2 border-dashed hover:border-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
                              onClick={() => createNewChat(group.id)}
                            >
                              <div className="flex items-center gap-2">
                                <FilePlus className="h-5 w-5 text-primary" />
                                <div className="flex flex-col items-start">
                                  <span className="font-medium text-primary">
                                    Obrolan Baru
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Buat obrolan baru dalam Folder ini
                                  </span>
                                </div>
                              </div>
                            </Button>
                          </div>

                          {/* Date */}
                          <div className="px-6 py-2 text-xs text-muted-foreground">
                            {format(group.createdAt, "MMM d, yyyy")}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </ScrollArea>
          </div>
        </SheetContent>

        {/* Main Content - Update padding dan spacing untuk mobile */}
        <div className="flex-1 flex flex-col vh-fix overflow-hidden">
          <header className="flex-none flex items-center justify-between p-2 sm:p-4 border-b">
            <div className="flex items-center">
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-2 sm:mr-4">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <h1 className="text-lg sm:text-xl font-bold truncate tracking-tight">
                {currentChat?.name || "Selamat Datang di Techtalk! 👋"}
              </h1>
            </div>

            {/* Tampilkan Trash button untuk mobile dan desktop */}
            {currentChat && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                title="Clear Chat"
                className="md:flex" // Ubah dari hidden menjadi flex agar tampil di mobile
              >
                <Trash className="h-4 w-4 text-red-600" />
              </Button>
            )}
          </header>

          <main
            ref={mainContentRef}
            className="flex-1 p-2 sm:p-4 overflow-y-auto touch-scroll safe-area-padding overscroll-contain"
          >
            {currentChat ? (
              <div className="max-w-[1200px] mx-auto flex flex-col items-center">
                <div className="space-y-3 sm:space-y-4 w-full max-w-[100%] sm:max-w-3xl">
                  {/* Update loading indicator position untuk mobile */}
                  {isLoading && (
                    <div className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50">
                      <div className="bg-primary/90 text-primary-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg">
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                        <span className="ml-1">
                          AI is typing, please wait...
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Update message styling untuk mobile */}
                  {messages[currentChat.id]?.map((message, index, array) => (
                    <div
                      key={index}
                      ref={index === array.length - 1 ? lastMessageRef : null}
                      className={`flex ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      } mb-0.5`}
                    >
                      <div
                        className={`flex items-start gap-1 ${
                          message.role === "user"
                            ? "flex-row-reverse max-w-[85%]"
                            : "flex-row w-[calc(100%-24px)]"
                        }`}
                      >
                        {message.role !== "user" && (
                          <Avatar className="w-4 h-4 flex-shrink-0 ring-1 ring-background">
                            <AvatarImage src="/images/logos/ai.png" alt="AI" />
                            <AvatarFallback>AI</AvatarFallback>
                          </Avatar>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className={`relative px-3 sm:p-5.5 rounded-full ${
                            message.role === "user" 
                              ? "bg-[#F9F9F9] text-gray-800 hover:bg-[#F5F5F5] dark:bg-[#F9F9F9] dark:text-gray-800 border border-gray-100 transition-colors shadow-sm" 
                              : "bg-card dark:bg-secondary/25 border border-border/40 dark:border-border/30 shadow-sm"
                          }`}>
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="markdown-content"
                              components={{
                                p: ({ node, ...props }) => (
                                  <p {...props} className="mb-2 last:mb-0 text-[19px] sm:text-[15px]" />
                                ),
                                // ... other components
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground opacity-70">
                            {format(new Date(), "HH:mm")}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <WelcomeGuide onCreateGroup={createNewGroup} />
            )}
          </main>

          {/* Update input area untuk mobile */}
          {currentChat && (
            <footer className="flex-none px-2 py-2 sm:p-4 border-t input-area safe-area-padding">
              <div className="flex space-x-2 max-w-3xl mx-auto">
                <Textarea
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value);
                    e.target.style.height = "inherit";
                    e.target.style.height = `${Math.min(
                      e.target.scrollHeight,
                      200
                    )}px`;
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  className="flex-1 min-h-[36px] sm:min-h-[44px] max-h-[200px] resize-none py-1.5 sm:py-2 text-sm transition-all duration-200 rounded-lg"
                  style={{
                    overflow: "hidden",
                  }}
                  rows={1}
                />
                <Button
                  onClick={handleSendMessage}
                  className="h-[36px] sm:h-[44px] px-3 sm:px-4"
                  disabled={isLoading || !inputMessage.trim()}
                >
                  <Send className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
            </footer>
          )}
        </div>

        {/* Code Preview Panel */}
        <AnimatePresence>
          {codeContent && isPreviewOpen && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: previewWidth }}
              exit={{ width: 0 }}
              transition={{ duration: 0.2 }}
              className="hidden md:block h-[100dvh] overflow-hidden border-l border-gray-400 dark:border-gray-700"
            >
              <Resizable
                size={{ width: previewWidth, height: "100%" }}
                onResizeStop={(e, direction, ref, d) => {
                  setPreviewWidth(previewWidth + d.width);
                }}
                minWidth={300}
                maxWidth={800}
                enable={{ left: true }}
              >
                <div className="h-full flex flex-col bg-background">
                  <div className="flex items-center justify-between p-2 border-b">
                    <div className="flex-1">
                      <Tabs defaultValue="code" className="w-full">
                        <TabsList className="w-full">
                          <TabsTrigger value="code" className="flex-1">
                            Code
                          </TabsTrigger>
                          <TabsTrigger value="preview" className="flex-1">
                            Preview
                          </TabsTrigger>
                        </TabsList>
                        <TabsContent
                          value="code"
                          className="h-[calc(100vh-6rem)]"
                        >
                          <Suspense
                            fallback={
                              <div className="h-full flex items-center justify-center">
                                Loading editor...
                              </div>
                            }
                          >
                            <div className="h-full w-full relative">
                              <div className="absolute top-2 left-2 z-10">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 px-2 text-xs flex items-center gap-1"
                                    >
                                      {
                                        supportedLanguages.find(
                                          (lang) => lang.id === currentLanguage
                                        )?.name
                                      }
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    align="start"
                                    className="max-h-[300px] overflow-y-auto"
                                  >
                                    {supportedLanguages.map((lang) => (
                                      <DropdownMenuItem
                                        key={lang.id}
                                        onSelect={() =>
                                          setCurrentLanguage(lang.id)
                                        }
                                        className="text-xs"
                                      >
                                        {lang.name}
                                      </DropdownMenuItem>
                                    ))}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>

                              <MonacoEditor
                                height="100%"
                                language={currentLanguage}
                                theme={
                                  theme === "dark" ? "vs-dark" : "vs-light"
                                }
                                value={isEditing ? editedCode : codeContent}
                                onChange={handleCodeChange}
                                options={{
                                  minimap: { enabled: false },
                                  fontSize: 14,
                                  scrollBeyondLastLine: false,
                                  padding: { top: 40, bottom: 16 },
                                  readOnly: !isEditing,
                                  wordWrap: "on",
                                  lineNumbers: "on",
                                  renderWhitespace: "selection",
                                  formatOnPaste: true,
                                  formatOnType: true,
                                  automaticLayout: true,
                                }}
                              />
                              <div className="absolute top-2 right-2 flex gap-2 bg-background/80 backdrop-blur-sm p-1 rounded-md shadow-sm border border-border">
                                {!isEditing ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setIsEditing(true);
                                      setEditedCode(codeContent);
                                    }}
                                    className="h-7 px-2 text-xs"
                                  >
                                    <Pencil className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                ) : (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setIsEditing(false);
                                        setEditedCode(codeContent);
                                      }}
                                      className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                                    >
                                      <X className="h-3 w-3 mr-1" />
                                      Cancel
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={handleSaveCode}
                                      className="h-7 px-2 text-xs text-primary hover:text-primary"
                                    >
                                      <Check className="h-3 w-3 mr-1" />
                                      Save
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          </Suspense>
                        </TabsContent>
                        <TabsContent
                          value="preview"
                          className="h-[calc(100vh-6rem)] p-4"
                        >
                          <div className="h-full border rounded p-4 overflow-auto">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-bold">Preview:</h3>
                              <span className="text-sm text-muted-foreground">
                                Language:{" "}
                                {
                                  supportedLanguages.find(
                                    (lang) => lang.id === currentLanguage
                                  )?.name
                                }
                              </span>
                            </div>

                            {/* Preview container */}
                            <div className="w-full h-full bg-white rounded-lg shadow">
                              {currentLanguage === "html" ||
                              currentLanguage === "css" ? (
                                // Render HTML/CSS preview
                                <iframe
                                  srcDoc={`
                                    <html>
                                      <head>
                                        <style>
                                          ${
                                            currentLanguage === "css"
                                              ? codeContent
                                              : ""
                                          }
                                        </style>
                                      </head>
                                      <body>
                                        ${
                                          currentLanguage === "html"
                                            ? codeContent
                                            : ""
                                        }
                                      </body>
                                    </html>
                                  `}
                                  className="w-full h-full border-none"
                                  title="Preview"
                                  sandbox="allow-scripts"
                                />
                              ) : currentLanguage === "markdown" ? (
                                // Render Markdown preview
                                <div className="p-4 prose dark:prose-invert max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {codeContent}
                                  </ReactMarkdown>
                                </div>
                              ) : currentLanguage === "svg" ? (
                                // Render SVG preview
                                <div
                                  className="p-4 flex items-center justify-center"
                                  dangerouslySetInnerHTML={{
                                    __html: codeContent,
                                  }}
                                />
                              ) : (
                                // Untuk bahasa lain yang tidak dapat dipratinjau langsung
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  Preview not available for {currentLanguage}{" "}
                                  code
                                </div>
                              )}
                            </div>
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPreviewOpen(false)}
                      className="ml-2"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Resizable>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Toggle Preview Button */}
        {codeContent && !isPreviewOpen && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPreviewOpen(true)}
            className="hidden md:inline-flex fixed bottom-20 right-8 z-10"
          >
            Show Preview
          </Button>
        )}

        {/* Tombol Pratinjau Kode untuk Mobile*/}
        {codeContent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open("/code-preview", "_blank")}
            className="md:hidden fixed bottom-20 right-8 z-10"
          >
            View Code
          </Button>
        )}
      </div>
    </Sheet>
  );
}
