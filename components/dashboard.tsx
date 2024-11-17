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
  Loader2,
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
  PromptRow,
  DatasetResponse,
} from "@/types/chat";
import { useAuth } from "@/contexts/auth-context";
import { WelcomeGuide } from "./welcome-guide";
import NodeCache from "node-cache";
import { debounce } from "lodash";
import dynamic from "next/dynamic";

const CodePreview = dynamic(() => import("./code-preview"), {
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
  ssr: false, // Disable SSR for code preview
});

const MarkdownPreview = dynamic(() => import("./markdown-preview"), {
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
});

const SvgPreview = dynamic(() => import("./svg-preview"), {
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
  ssr: false, // Disable SSR for SVG preview
});

const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  loading: () => (
    <div className="h-full flex items-center justify-center">
      <LoadingSpinner />
    </div>
  ),
  ssr: false, // Disable SSR for Monaco editor
});

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

// Tambahkan CSS untuk menyembunyikan scrollbar pada overflow-x
const styles = ""; // Kosongkan karena styles sudah dipindah ke globals.css

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

// Tambahkan fungsi untuk fetch dataset
const fetchPromptDataset = async (offset: number = 0, length: number = 100) => {
  try {
    const response = await fetch(
      `https://datasets-server.huggingface.co/rows?dataset=fka%2Fawesome-chatgpt-prompts&config=default&split=train&offset=${offset}&length=${length}`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dataset");
    }

    const data: DatasetResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching dataset:", error);
    throw error;
  }
};

// Initialize cache with 1 hour TTL
const aiResponseCache = new NodeCache({ stdTTL: 3600 });

// Add this component definition near the top of the file
const LoadingSpinner = () => (
  <figure className="h-6 w-6 animate-spin text-primary/60">
    <Loader2 />
  </figure>
);

// Add these interfaces above the fetchDataset function
interface DatasetMessage {
  role: string;
  content: string;
}

interface DatasetRow {
  row: {
    messages: DatasetMessage[];
  };
}

interface Dataset {
  rows: DatasetRow[];
}

const fetchDataset = async () => {
  try {
    const response = await fetch(
      "https://datasets-server.huggingface.co/rows?dataset=afrizalha%2FTumpeng-1-Indonesian&config=default&split=train&offset=0&length=100"
    );
    const data: Dataset = await response.json();
    return data.rows.map((row: DatasetRow) => ({
      messages: row.row.messages.map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
    }));
  } catch (error) {
    console.error("Error fetching dataset:", error);
    return [];
  }
};

// Update the interfaces to handle both datasets
interface UnifiedDataset {
  type: "prompt" | "conversation";
  category?: string;
  content: {
    prompt?: string;
    act?: string;
    messages?: {
      role: "user" | "assistant";
      content: string;
    }[];
  };
}

// Add this function to fetch and combine datasets
const fetchUnifiedDataset = async () => {
  try {
    // Fetch both datasets concurrently
    const [promptsResponse, conversationsResponse] = await Promise.all([
      fetch(
        "https://datasets-server.huggingface.co/rows?dataset=fka%2Fawesome-chatgpt-prompts&config=default&split=train&offset=0&length=100"
      ),
      fetch(
        "https://datasets-server.huggingface.co/rows?dataset=afrizalha%2FTumpeng-1-Indonesian&config=default&split=train&offset=0&length=100"
      ),
    ]);

    const promptsData = await promptsResponse.json();
    const conversationsData = await conversationsResponse.json();

    // Transform and combine the datasets
    const unifiedData: UnifiedDataset[] = [
      // Transform prompts
      ...promptsData.rows.map((item: PromptRow) => ({
        type: "prompt" as const,
        category: "chatgpt",
        content: {
          prompt: item.row.prompt,
          act: item.row.act,
        },
      })),
      // Transform conversations
      ...conversationsData.rows.map((item: DatasetRow) => ({
        type: "conversation" as const,
        category: "tumpeng",
        content: {
          messages: item.row.messages.map((msg) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
        },
      })),
    ];

    return unifiedData;
  } catch (error) {
    console.error("Error fetching unified dataset:", error);
    return [];
  }
};

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
        // Use smooth scroll behavior
        lastMessage.scrollIntoView({
          behavior: force ? "auto" : "smooth",
          block: "end",
        });
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

  // Add these new states in DashboardComponent
  const [modelLoaded, setModelLoaded] = useState(false);
  const modelLoadTimeoutRef = useRef<NodeJS.Timeout>();

  // Add new state for hardware acceleration
  const [hasGPU, setHasGPU] = useState(false);

  // Add function to check for GPU availability
  const checkGPUAvailability = useCallback(async () => {
    try {
      // Check if WebGL is available as a proxy for GPU support
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      setHasGPU(!!gl);
    } catch (error) {
      console.error("Error checking GPU availability:", error);
      setHasGPU(false);
    }
  }, []);

  // Update loadModel function
  const loadModel = useCallback(async () => {
    if (!modelLoaded) {
      try {
        setIsLoading(true);

        // Check GPU availability before loading
        await checkGPUAvailability();

        // Configure model to use GPU if available
        const modelConfig = {
          useGPU: hasGPU,
          // Add other acceleration options based on environment
          useTensorflowJS: true,
          useWebGL: hasGPU,
          useWASM: !hasGPU, // Fallback to WASM if no GPU
        };

        // Load model with hardware acceleration config
        // Replace with actual model loading logic
        await new Promise((resolve) => setTimeout(resolve, 1000));

        setModelLoaded(true);
      } catch (error) {
        console.error("Error loading model:", error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [modelLoaded, hasGPU, checkGPUAvailability]);

  // Add effect to check GPU on mount
  useEffect(() => {
    checkGPUAvailability();
  }, [checkGPUAvailability]);

  // Update handleSendMessage to detect code blocks
  const handleSendMessage = useCallback(async () => {
    if (!modelLoaded) {
      await loadModel();
    }

    // Reset unload timer
    if (modelLoadTimeoutRef.current) {
      clearTimeout(modelLoadTimeoutRef.current);
    }
    modelLoadTimeoutRef.current = setTimeout(() => {
      unloadModel();
    }, 300000);

    if (inputMessage.trim() && currentChat) {
      const count = extractRequestedCount(inputMessage);
      setRequestedCount(count);
      setCurrentCount(0);

      // Generate cache key from input message
      const cacheKey = `ai_response_${Buffer.from(inputMessage).toString(
        "base64"
      )}`;

      // Check cache first
      const cachedResponse = aiResponseCache.get(cacheKey);
      if (cachedResponse) {
        // Use cached response
        setMessages((prev) => ({
          ...prev,
          [currentChat.id]: [
            ...(prev[currentChat.id] || []),
            { role: "user", content: inputMessage },
            { role: "assistant", content: cachedResponse as string },
          ],
        }));
        setInputMessage("");
        scrollToBottom(true);
        return;
      }

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

      // Scroll to user message with smooth animation
      setTimeout(() => {
        if (mainContentRef.current) {
          const scrollHeight = mainContentRef.current.scrollHeight;
          mainContentRef.current.scrollTo({
            top: scrollHeight,
            behavior: "smooth",
          });
        }
      }, 100);

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

      let fullResponse = "";

      streamGroqResponse(
        [
          ...updatedMessages,
          ...(systemPrompt
            ? [{ role: "system" as const, content: systemPrompt }]
            : []),
        ],
        {
          onToken: (token) => {
            fullResponse += token;
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

            requestAnimationFrame(() => {
              if (lastMessageRef.current) {
                const container = mainContentRef.current;
                if (!container) return;

                const isNearBottom =
                  container.scrollHeight -
                    container.scrollTop -
                    container.clientHeight <
                  100;

                if (isNearBottom) {
                  lastMessageRef.current.scrollIntoView({
                    behavior: "smooth",
                    block: "end",
                  });
                }
              }
            });
          },
          onComplete: () => {
            setIsLoading(false);
            // Cache the complete response
            aiResponseCache.set(cacheKey, fullResponse);
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
  }, [inputMessage, currentChat, messages, modelLoaded, loadModel]);

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
      name: `Folder ${groups.length + 1}`,
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
        name: `Obrolan ${
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

  // Tambahkan state untuk menyimpan prompts
  const [prompts, setPrompts] = useState<PromptRow[]>([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Fungsi untuk load prompts
  const loadPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const data = await fetchPromptDataset();
      setPrompts(data.rows);
    } catch (error) {
      console.error("Error loading prompts:", error);
    } finally {
      setIsLoadingPrompts(false);
    }
  };

  // Load prompts saat komponen mount
  useEffect(() => {
    loadPrompts();
  }, []);

  // Tambahkan state untuk mobile input
  const [isMobile, setIsMobile] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const inputTimeoutRef = useRef<NodeJS.Timeout>();

  // Deteksi mobile device
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Add this function inside DashboardComponent
  const adjustTextareaHeight = useCallback(
    (textarea: HTMLTextAreaElement) => {
      if (!textarea) return;

      // Reset height to min to accurately calculate scroll height
      textarea.style.height = "auto";

      // Get the computed styles
      const computedStyle = window.getComputedStyle(textarea);
      const minHeight = isMobile ? 36 : 44;
      const maxHeight = isMobile ? 100 : 120; // Batasi tinggi maksimum

      // Calculate new height
      const newHeight = Math.min(
        Math.max(textarea.scrollHeight, minHeight),
        maxHeight
      );

      textarea.style.height = `${newHeight}px`;
    },
    [isMobile]
  );

  // Update handleInputChange
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setInputMessage(e.target.value);
      adjustTextareaHeight(e.target);
    },
    [adjustTextareaHeight]
  );

  // Add effect to handle initial height
  useEffect(() => {
    if (inputRef.current) {
      adjustTextareaHeight(inputRef.current);
    }
  }, [adjustTextareaHeight, inputMessage]);

  // Add unload function
  const unloadModel = useCallback(() => {
    setModelLoaded(false);
    // Add any cleanup logic here
  }, []);

  // Add this effect to handle model lifecycle
  useEffect(() => {
    // Debounced unload function
    const debouncedUnload = debounce(() => {
      if (modelLoaded) {
        unloadModel();
      }
    }, 300000); // Unload after 5 minutes of inactivity

    // Clear previous timeout
    if (modelLoadTimeoutRef.current) {
      clearTimeout(modelLoadTimeoutRef.current);
    }

    // Set new timeout
    modelLoadTimeoutRef.current = setTimeout(debouncedUnload, 300000);

    return () => {
      debouncedUnload.cancel();
      if (modelLoadTimeoutRef.current) {
        clearTimeout(modelLoadTimeoutRef.current);
      }
    };
  }, [modelLoaded, unloadModel]);

  // 2. Add loading states for each lazy component
  const [isEditorLoading, setIsEditorLoading] = useState(true);
  const [isPreviewLoading, setIsPreviewLoading] = useState(true);

  // 3. Add error boundaries for lazy components
  const handleComponentError = useCallback((error: Error) => {
    console.error("Component failed to load:", error);
    // Handle error state appropriately
  }, []);

  // 4. Render code preview section with improved code splitting
  const renderCodePreview = () => (
    <Suspense
      fallback={
        <figure className="h-full flex items-center justify-center">
          <LoadingSpinner />
        </figure>
      }
    >
      {currentLanguage === "markdown" ? (
        <article className="markdown-content">
          <MarkdownPreview content={codeContent} />
        </article>
      ) : currentLanguage === "svg" ? (
        <figure className="svg-preview">
          <SvgPreview content={codeContent} />
        </figure>
      ) : (
        <article className="code-preview">
          <CodePreview
            language={currentLanguage}
            content={codeContent}
            theme={theme || "light"}
          />
        </article>
      )}
    </Suspense>
  );

  // 5. Render editor with improved error handling
  const renderEditor = () => (
    <Suspense
      fallback={
        <div className="h-full flex items-center justify-center">
          <LoadingSpinner />
        </div>
      }
    >
      <MonacoEditor
        height="100%"
        language={currentLanguage}
        theme={theme === "dark" ? "vs-dark" : "vs-light"}
        value={isEditing ? editedCode : codeContent}
        onChange={handleCodeChange}
        onMount={() => setIsEditorLoading(false)}
        options={
          {
            // ... existing options ...
          }
        }
      />
    </Suspense>
  );

  // Replace separate dataset states with unified state
  const [unifiedDataset, setUnifiedDataset] = useState<UnifiedDataset[]>([]);
  const [isLoadingDataset, setIsLoadingDataset] = useState(false);

  // Update the dataset loading effect
  useEffect(() => {
    const loadUnifiedDataset = async () => {
      setIsLoadingDataset(true);
      try {
        const data = await fetchUnifiedDataset();
        setUnifiedDataset(data);
      } catch (error) {
        console.error("Error loading unified dataset:", error);
      } finally {
        setIsLoadingDataset(false);
      }
    };

    loadUnifiedDataset();
  }, []);

  // Update the dropdown menu content
  const renderDatasetContent = (type: "prompt" | "conversation") => (
    <ScrollArea className="h-[300px]">
      {unifiedDataset
        .filter((item) => item.type === type)
        .map((item, idx) => (
          <div
            key={idx}
            className="p-2 hover:bg-secondary rounded-md cursor-pointer"
            onClick={() => {
              if (type === "prompt" && item.content.prompt) {
                setInputMessage(item.content.prompt);
              } else if (type === "conversation" && item.content.messages) {
                const userMessage = item.content.messages.find(
                  (m) => m.role === "user"
                );
                if (userMessage) setInputMessage(userMessage.content);
              }
            }}
          >
            <div className="font-medium text-xs">
              {type === "prompt" ? item.content.act : "User Query"}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">
              {type === "prompt"
                ? item.content.prompt
                : item.content.messages?.find((m) => m.role === "user")
                    ?.content}
            </div>
          </div>
        ))}
    </ScrollArea>
  );

  // Add this helper function inside DashboardComponent
  const formatTableContent = (content: string) => {
    // Pastikan tabel memiliki struktur yang benar
    return content.replace(
      /<table>([\s\S]*?)<\/table>/g,
      (match, tableContent) => {
        // Bersihkan whitespace yang tidak perlu
        const cleanedContent = tableContent.trim();

        return `
          <div class="table-wrapper">
            <div class="table-wrapper-inner">
              <table>
                ${cleanedContent}
              </table>
            </div>
          </div>
        `;
      }
    );
  };

  // Add this effect to handle scroll indicators
  useEffect(() => {
    const tableWrappers = document.querySelectorAll(".table-wrapper");

    const checkScroll = (wrapper: Element) => {
      const isScrollable = wrapper.scrollWidth > wrapper.clientWidth;
      wrapper.classList.toggle("is-scrollable", isScrollable);
    };

    const handleResize = () => {
      tableWrappers.forEach(checkScroll);
    };

    // Check on mount and window resize
    handleResize();
    window.addEventListener("resize", handleResize);

    // Add scroll event listeners to show/hide indicators
    tableWrappers.forEach((wrapper) => {
      wrapper.addEventListener("scroll", () => {
        const isAtStart = wrapper.scrollLeft <= 0;
        const isAtEnd =
          wrapper.scrollLeft + wrapper.clientWidth >= wrapper.scrollWidth;

        wrapper.classList.toggle("at-start", isAtStart);
        wrapper.classList.toggle("at-end", isAtEnd);
      });

      // Initial check
      checkScroll(wrapper);
    });

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [messages]); // Re-run when messages change

  return (
    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <main className="flex vh-fix overflow-hidden bg-background text-foreground">
        {/* Sidebar */}
        <SheetContent
          side="left"
          className="w-[280px] sm:w-[320px] p-0 h-[100dvh] overflow-hidden border-r border-border/40"
        >
          <nav className="flex flex-col h-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            {/* Header Section */}
            <header className="border-b border-border/40 bg-secondary/20">
              <section className="p-3 flex items-center space-x-2">
                <Avatar className="h-8 w-8 ring-2 ring-primary/10 ring-offset-2 ring-offset-background transition-all duration-300 hover:ring-primary/30">
                  <AvatarImage
                    src={
                      theme === "dark"
                        ? "/images/logos/techtalk-white.png"
                        : "/images/logos/techtalk-black.png"
                    }
                    alt="Techtalk Logo"
                    className="object-contain scale-90"
                  />
                  <AvatarFallback className="bg-primary/5">TT</AvatarFallback>
                </Avatar>
                <span className="font-semibold tracking-tight text-base bg-gradient-to-r from-primary to-primary/50 bg-clip-text text-transparent">
                  Techtalk
                </span>
                <div className="ml-auto flex items-center gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="h-7 w-7 rounded-full hover:bg-secondary/80 transition-colors"
                  >
                    {theme === "dark" ? (
                      <Sun className="h-3.5 w-3.5 text-amber-500" />
                    ) : (
                      <Moon className="h-3.5 w-3.5 text-slate-700" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="h-7 w-7 rounded-full hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </section>
            </header>

            {/* Action Section */}
            <section className="p-3 space-y-2 bg-gradient-to-b from-secondary/20 to-transparent">
              <div className="flex gap-1.5">
                <Button
                  className="flex-1 justify-start h-10 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 hover:border-primary/30 transition-transform duration-300 hover:scale-[1.02]"
                  onClick={createNewGroup}
                >
                  <FolderPlus className="mr-2 h-5 w-5" />
                  <span className="text-[15px] font-medium">
                    Membuat Folder Baru
                  </span>
                </Button>
                {groups.length > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={deleteAllGroups}
                    title="Delete all groups"
                    className="h-10 w-10 hover:bg-red-500/10 hover:text-red-500 transition-colors"
                  >
                    <Trash className="h-5 w-5" />
                  </Button>
                )}
              </div>
            </section>

            {/* Groups List */}
            <ScrollArea className="flex-1 px-2 pb-4">
              <section className="space-y-2 mt-2">
                {groups.map((group) => (
                  <article
                    key={group.id}
                    className="rounded-lg overflow-hidden border border-border/40 bg-card/30 backdrop-blur-sm transition-all duration-300 hover:border-border/60"
                  >
                    {/* Group Header */}
                    <header className="relative">
                      <Button
                        variant="ghost"
                        className={`w-full h-auto px-2 py-2 hover:bg-secondary/40 text-left ${
                          newItems[group.id]
                            ? "bg-primary/5 dark:bg-primary/10 border-l-[3px] border-primary"
                            : ""
                        } ${
                          expandedGroups.includes(group.id)
                            ? "bg-secondary/30"
                            : "hover:bg-secondary/20"
                        }`}
                        onClick={() => toggleGroupExpansion(group.id)}
                      >
                        <div className="flex items-center w-full gap-2">
                          <div className="flex items-center transition-transform duration-300 flex-shrink-0">
                            {expandedGroups.includes(group.id) ? (
                              <>
                                <FolderOpen className="h-4.5 w-4.5 text-primary transition-colors" />
                                <ChevronDown className="h-4 w-4 text-primary/70 ml-0.5" />
                              </>
                            ) : (
                              <>
                                <Folder className="h-4.5 w-4.5 text-muted-foreground" />
                                <ChevronRight className="h-4 w-4 text-muted-foreground ml-0.5" />
                              </>
                            )}
                          </div>
                          {renamingGroupId === group.id ? (
                            <input
                              type="text"
                              value={newName}
                              onChange={(e) => setNewName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  saveNewName();
                                }
                              }}
                              className="flex-1 px-2 py-1 text-base bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <span className="font-medium text-base text-left truncate">
                              {group.name}
                            </span>
                          )}
                        </div>
                      </Button>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-7 w-7 hover:bg-secondary/60"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-52">
                          <DropdownMenuItem
                            onSelect={() => renameGroup(group.id)}
                            className="text-left text-base"
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            <span>Rename Group</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => deleteGroup(group.id)}
                            className="text-left text-base text-red-600 focus:text-red-600"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            <span>Delete Group</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </header>

                    {/* Chat Items */}
                    <section className="p-2 space-y-1">
                      {group.chats.map((chat) => (
                        <article key={chat.id} className="relative group">
                          <Button
                            variant="ghost"
                            className={`w-full justify-center py-2 px-3 transition-all duration-200 ${
                              currentChat?.id === chat.id
                                ? "bg-secondary/40 dark:bg-secondary/60"
                                : "hover:bg-secondary/20"
                            } ${
                              newItems[chat.id]
                                ? "bg-primary/5 dark:bg-primary/10"
                                : ""
                            }`}
                            onClick={() => {
                              setCurrentChat({
                                ...chatTypes[chat.type],
                                id: chat.id,
                                name: chat.name,
                                createdAt: chat.createdAt,
                              });
                              setIsSidebarOpen(false);
                            }}
                          >
                            <div className="flex items-center w-full justify-center gap-2">
                              <span
                                className={`${
                                  chatTypes[chat.type]?.color
                                } transition-transform duration-300 group-hover:scale-110 flex-shrink-0`}
                              >
                                {chatTypes[chat.type]?.icon}
                              </span>
                              {renamingChatId === chat.id ? (
                                <input
                                  type="text"
                                  value={newName}
                                  onChange={(e) => setNewName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault();
                                      saveNewName();
                                    }
                                  }}
                                  className="flex-1 px-2 py-1 text-base bg-background border rounded focus:outline-none focus:ring-1 focus:ring-primary"
                                  autoFocus
                                  onClick={(e) => e.stopPropagation()}
                                />
                              ) : (
                                <span className="truncate text-base">
                                  {chat.name}
                                </span>
                              )}
                            </div>
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 hover:bg-secondary/60 transition-opacity"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-52">
                              <DropdownMenuItem
                                onSelect={() => renameChat(group.id, chat.id)}
                                className="text-left text-base"
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                <span>Rename Chat</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => deleteChat(group.id, chat.id)}
                                className="text-left text-base text-red-600 focus:text-red-600"
                              >
                                <Trash className="h-4 w-4 mr-2" />
                                <span>Delete Chat</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </article>
                      ))}

                      {/* New Chat Button */}
                      <footer className="pt-2 mt-2 border-t border-border/40">
                        <Button
                          variant="ghost"
                          className="w-full justify-start py-3 hover:bg-primary/5 dark:hover:bg-primary/10 group transition-all duration-300"
                          onClick={() => createNewChat(group.id)}
                        >
                          <div className="flex items-center gap-2">
                            <FilePlus className="h-4.5 w-4.5 text-primary transition-transform duration-300 group-hover:scale-110" />
                            <div className="flex flex-col items-start">
                              <span className="text-base font-medium text-primary">
                                Obrolan Baru
                              </span>
                              <span className="text-sm text-muted-foreground">
                                Buat obrolan di folder ini
                              </span>
                            </div>
                          </div>
                        </Button>
                      </footer>

                      <time className="px-2 py-2 text-sm text-muted-foreground/70 text-left">
                        {format(group.createdAt, "MMM d, yyyy")}
                      </time>
                    </section>
                  </article>
                ))}
              </section>
            </ScrollArea>
          </nav>
        </SheetContent>

        {/* Main Content Area */}
        <section className="flex-1 flex flex-col vh-fix overflow-hidden">
          <header className="flex-none flex items-center justify-between p-2 sm:p-4 border-b">
            <div className="flex items-center gap-2">
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-2 sm:mr-4">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <div className="flex flex-col">
                <h1 className="text-lg sm:text-xl font-bold truncate tracking-tight">
                  {currentChat?.name || ""}
                </h1>
                {/* Add Groq model label */}
                <span className="text-xs text-muted-foreground">
                  Powered by Vicky LLM
                </span>
              </div>
            </div>

            {/* Trash button */}
            {currentChat && (
              <Button
                variant="ghost"
                size="icon"
                onClick={clearChat}
                title="Clear Chat"
                className="md:flex"
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
              <article className="max-w-[1200px] mx-auto flex flex-col items-center">
                <section className="space-y-3 sm:space-y-4 w-full max-w-[100%] sm:max-w-3xl">
                  {/* Loading Indicator */}
                  {isLoading && (
                    <aside className="fixed bottom-20 sm:bottom-24 left-1/2 -translate-x-1/2 z-50">
                      <figure className="bg-primary/90 text-primary-foreground px-3 sm:px-4 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 shadow-lg">
                        <span className="w-2 h-2 bg-white rounded-full animate-[bounce-transform_1s_ease-in-out_-0.3s_infinite]"></span>
                        <span className="w-2 h-2 bg-white rounded-full animate-[bounce-transform_1s_ease-in-out_-0.15s_infinite]"></span>
                        <span className="w-2 h-2 bg-white rounded-full animate-[bounce-transform_1s_ease-in-out_infinite]"></span>
                        <figcaption className="ml-1">
                          AI is typing, please wait...
                        </figcaption>
                      </figure>
                    </aside>
                  )}

                  {/* Messages */}
                  {messages[currentChat.id]?.map((message, index, array) => (
                    <article
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
                          <div
                            className={`relative px-3 sm:p-5.5 rounded-lg ${
                              message.role === "user"
                                ? "text-gray-800 dark:text-white"
                                : "bg-card dark:bg-secondary/25 border border-border/40 dark:border-border/30 shadow-sm"
                            }`}
                          >
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              className="markdown-content"
                              components={{
                                p: ({ node, ...props }) => (
                                  <p
                                    {...props}
                                    className="mb-2 last:mb-0 text-[19px] sm:text-[15px]"
                                  />
                                ),
                                // ... other components
                                table: ({ node, ...props }) => (
                                  <table {...props} className="w-full" />
                                ),
                                thead: ({ node, ...props }) => (
                                  <thead {...props} className="bg-gradient" />
                                ),
                                th: ({ node, ...props }) => (
                                  <th {...props} className="table-header" />
                                ),
                                td: ({ node, ...props }) => (
                                  <td {...props} className="table-cell" />
                                ),
                              }}
                            >
                              {formatTableContent(message.content)}
                            </ReactMarkdown>
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground opacity-70">
                            {format(new Date(), "HH:mm")}
                          </div>
                        </div>
                      </div>
                    </article>
                  ))}
                </section>
              </article>
            ) : (
              <WelcomeGuide onCreateGroup={createNewGroup} />
            )}
          </main>

          {/* Input Area */}
          {currentChat && (
            <footer className="flex-none px-2 py-2 sm:p-4 border-t input-area safe-area-padding">
              <div className="chat-input-container max-h-[150px]">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="chat-input-button icon-button"
                    >
                      <BrainCircuit className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[300px]">
                    <Tabs defaultValue="chatgpt" className="w-full">
                      <TabsList className="w-full">
                        <TabsTrigger value="chatgpt">
                          ChatGPT Prompts
                        </TabsTrigger>
                        <TabsTrigger value="tumpeng">
                          Tumpeng Dataset
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="chatgpt">
                        <div className="p-2">
                          {isLoadingDataset ? (
                            <div className="flex justify-center p-4">
                              <LoadingSpinner />
                            </div>
                          ) : (
                            renderDatasetContent("prompt")
                          )}
                        </div>
                      </TabsContent>

                      <TabsContent value="tumpeng">
                        <div className="p-2">
                          {isLoadingDataset ? (
                            <div className="flex justify-center p-4">
                              <LoadingSpinner />
                            </div>
                          ) : (
                            renderDatasetContent("conversation")
                          )}
                        </div>
                      </TabsContent>
                    </Tabs>
                  </DropdownMenuContent>
                </DropdownMenu>

                <Textarea
                  ref={inputRef}
                  placeholder="Type your message..."
                  value={inputMessage}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      if (inputMessage.trim()) {
                        handleSendMessage();
                      }
                    }
                  }}
                  className="chat-input min-h-[40px] max-h-[120px] overflow-y-auto resize-none"
                  rows={1}
                  style={{
                    height: "auto",
                    overflowY: inputMessage.split("\n").length > 1 ? "auto" : "hidden"
                  }}
                />

                <Button
                  onClick={handleSendMessage}
                  className="chat-input-button send-button flex-shrink-0"
                  disabled={isLoading || !inputMessage.trim()}
                >
                  <Send className="h-4 w-4 sm:mr-2" />
                  <span className="hidden sm:inline">Send</span>
                </Button>
              </div>
            </footer>
          )}
        </section>

        {/* Code Preview Panel */}
        <AnimatePresence>
          {codeContent && isPreviewOpen && (
            <aside
              className="hidden md:block h-[100dvh] overflow-hidden border-l border-border/30 bg-gradient-to-b from-background to-background/95 backdrop-blur-sm"
              style={{ width: previewWidth }}
            >
              <Resizable
                size={{ width: previewWidth, height: "100%" }}
                onResize={(e, direction, ref, d) => {
                  const newWidth = previewWidth + d.width;
                  const clampedWidth = Math.min(Math.max(newWidth, 320), 800);
                  setPreviewWidth(clampedWidth);
                }}
                minWidth={320}
                maxWidth={800}
                enable={{ left: true }}
                handleClasses={{
                  left: "w-1 hover:w-1.5 -ml-0.5 h-full cursor-col-resize transition-all duration-200 bg-primary/30 hover:bg-primary/50 rounded-full absolute left-0 top-0",
                }}
              >
                <section className="h-full flex flex-col bg-gradient-to-b from-card/50 to-background/50 relative">
                  <header className="flex-none flex items-center justify-between p-3 border-b border-border/30 bg-gradient-to-r from-background/80 to-card/30 backdrop-blur">
                    <div className="flex-1 pr-10">
                      <Tabs defaultValue="code" className="w-full">
                        <TabsList className="w-full bg-background/40 backdrop-blur p-1 rounded-lg border border-border/30">
                          <TabsTrigger
                            value="code"
                            className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-md transition-all duration-200"
                            style={{ width: `${previewWidth / 2 - 24}px` }}
                          >
                            <div className="flex items-center justify-center space-x-2 w-full">
                              <Code2 className="h-4 w-4" />
                              <span className="truncate">Code</span>
                            </div>
                          </TabsTrigger>
                          <TabsTrigger
                            value="preview"
                            className="flex-1 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-none rounded-md transition-all duration-200"
                            style={{ width: `${previewWidth / 2 - 24}px` }}
                          >
                            <div className="flex items-center justify-center space-x-2 w-full">
                              <Terminal className="h-4 w-4" />
                              <span className="truncate">Preview</span>
                            </div>
                          </TabsTrigger>
                        </TabsList>

                        {/* Code Tab Content */}
                        <TabsContent
                          value="code"
                          className="h-[calc(100vh-6rem)] mt-4"
                          style={{ width: `${previewWidth - 24}px` }}
                        >
                          {renderEditor()}
                        </TabsContent>

                        {/* Preview Tab Content */}
                        <TabsContent
                          value="preview"
                          className="absolute inset-0 mt-4"
                          style={{
                            width: `${previewWidth - 24}px`,
                            height: "calc(100vh - 8rem)",
                            overflow: "hidden",
                          }}
                        >
                          <div className="h-full w-full relative overflow-hidden">
                            {renderCodePreview()}
                          </div>
                        </TabsContent>
                      </Tabs>
                    </div>

                    {/* Close button dengan animasi hover - Update positioning */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setIsPreviewOpen(false)}
                      className="h-8 w-8 rounded-full hover:bg-primary/10 hover:text-primary transition-all duration-200 absolute right-3 top-3 z-10"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </header>
                </section>
              </Resizable>
            </aside>
          )}
        </AnimatePresence>

        {/* Preview Toggle Buttons */}
        <nav className="fixed bottom-20 right-8 z-10 flex flex-col gap-2">
          {codeContent && !isPreviewOpen && (
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="hidden md:inline-flex btn btn-outline btn-sm"
            >
              Show Preview
            </button>
          )}

          {codeContent && (
            <button
              onClick={() => window.open("/code-preview", "_blank")}
              className="md:hidden btn btn-outline btn-sm"
            >
              View Code
            </button>
          )}
        </nav>
      </main>
    </Sheet>
  );
}
