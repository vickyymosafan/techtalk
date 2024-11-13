'use client'

import React, { useState, useCallback, lazy, Suspense, useRef, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger,
  SheetClose
} from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from 'lucide-react'
import { useTheme } from 'next-themes'
import { format } from 'date-fns'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { Resizable } from 're-resizable'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamGroqResponse } from '@/lib/groq'
import type { Message, StreamHandler, Chat, Group as GroupType } from '@/types/chat'
import { useAuth } from '@/contexts/auth-context'

const MonacoEditor = lazy(() => import('@monaco-editor/react'))

interface ChatTypeInfo {
  id: string;
  type: 'general' | 'code' | 'database' | 'ai' | 'system';
  icon: React.ReactNode;
  color: string;
  name?: string;
  createdAt?: Date;
}

const chatTypes: { [key: string]: ChatTypeInfo } = {
  general: {
    id: 'general',
    type: 'general',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'text-blue-500'
  },
  code: {
    id: 'code',
    type: 'code',
    icon: <Code2 className="h-4 w-4" />,
    color: 'text-green-500'
  },
  database: {
    id: 'database',
    type: 'database',
    icon: <Database className="h-4 w-4" />,
    color: 'text-purple-500'
  },
  ai: {
    id: 'ai',
    type: 'ai',
    icon: <BrainCircuit className="h-4 w-4" />,
    color: 'text-red-500'
  },
  system: {
    id: 'system',
    type: 'system',
    icon: <Cpu className="h-4 w-4" />,
    color: 'text-orange-500'
  }
}

interface SupportedLanguage {
  id: string;
  name: string;
}

const supportedLanguages: SupportedLanguage[] = [
  { id: 'plaintext', name: 'Plain Text' },
  { id: 'javascript', name: 'JavaScript' },
  { id: 'typescript', name: 'TypeScript' },
  { id: 'html', name: 'HTML' },
  { id: 'css', name: 'CSS' },
  { id: 'php', name: 'PHP' },
  { id: 'python', name: 'Python' },
  { id: 'java', name: 'Java' },
  { id: 'csharp', name: 'C#' },
  { id: 'cpp', name: 'C++' },
  { id: 'ruby', name: 'Ruby' },
  { id: 'go', name: 'Go' },
  { id: 'rust', name: 'Rust' },
  { id: 'sql', name: 'SQL' },
  { id: 'markdown', name: 'Markdown' },
  { id: 'json', name: 'JSON' },
  { id: 'yaml', name: 'YAML' },
  { id: 'shell', name: 'Shell' },
]

const getLanguageFromCode = (code: string): string => {
  if (code.includes('<?php')) return 'php'
  if (code.includes('<html') || code.includes('<!DOCTYPE')) return 'html'
  if (code.includes('import React')) return 'typescript'
  if (code.includes('def ') || code.includes('print(')) return 'python'
  if (code.includes('function') || code.includes('=>')) return 'javascript'
  if (code.includes('.css') || code.includes('{')) return 'css'
  return 'plaintext'
}

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
    const response = await fetch('/api/execute-python', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const data = await response.json();
    return data.output;
  } catch (error) {
    return `Error: ${(error as Error).message}`;
  }
};

// Tambahkan interface untuk ChainedResponse
interface ChainedResponse {
  content: string;
  hasMore: boolean;
  nextCursor?: number;
}

// Tambahkan utility function untuk mendeteksi jumlah yang diminta
const extractRequestedCount = (message: string): number | null => {
  // Cari pola angka yang diikuti dengan item/data/baris/entries dll
  const patterns = [
    /(\d+)\s*(items?|data|rows?|entries|examples?|samples?)/i,
    /generate\s*(\d+)/i,
    /create\s*(\d+)/i,
    /list\s*(\d+)/i,
    /show\s*(\d+)/i,
  ]
  
  for (const pattern of patterns) {
    const match = message.match(pattern)
    if (match && match[1]) {
      return parseInt(match[1])
    }
  }
  return null
}

// Tambahkan komponen WelcomeGuide
const WelcomeGuide = ({ onCreateGroup }: { onCreateGroup: () => void }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full max-w-md mx-auto text-center px-4">
      <h2 className="text-2xl font-bold mb-6">Welcome to Techtalk! 👋</h2>
      
      <div className="space-y-6 w-full">
        <div className="bg-secondary/30 rounded-lg p-4 text-left">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <span className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
            Create a New Group
          </h3>
          <p className="text-sm text-muted-foreground">
            Start by creating a group to organize your conversations. Think of it like a folder for related chats.
          </p>
          <Button onClick={onCreateGroup} className="mt-3 w-full">
            <FolderPlus className="mr-2 h-4 w-4" /> Create New Group
          </Button>
        </div>

        <div className="bg-secondary/30 rounded-lg p-4 text-left opacity-70">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <span className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
            Start a New Chat
          </h3>
          <p className="text-sm text-muted-foreground">
            Once you have a group, you can create a new chat within it. Click the "New Chat" button in your group.
          </p>
        </div>

        <div className="bg-secondary/30 rounded-lg p-4 text-left opacity-70">
          <h3 className="font-semibold flex items-center gap-2 mb-2">
            <span className="bg-primary/20 rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
            Start Chatting
          </h3>
          <p className="text-sm text-muted-foreground">
            Begin your conversation! Type your message and press Enter or click the Send button to start chatting with our AI assistant.
          </p>
        </div>
      </div>
    </div>
  )
}

export function DashboardComponent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [groups, setGroups] = useState<GroupType[]>([])
  const [expandedGroups, setExpandedGroups] = useState<string[]>([])
  const [currentChat, setCurrentChat] = useState<ChatTypeInfo | null>(null)
  const [messages, setMessages] = useState<{ [chatId: string]: Message[] }>({})
  const [inputMessage, setInputMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [codeContent, setCodeContent] = useState('')
  const { setTheme, theme } = useTheme()
  const [isPreviewOpen, setIsPreviewOpen] = useLocalStorage('preview-open', true)
  const [previewWidth, setPreviewWidth] = useLocalStorage('preview-width', 400)
  const [newItems, setNewItems] = useState<{ [key: string]: boolean }>({})
  const [isEditing, setIsEditing] = useState(false)
  const [editedCode, setEditedCode] = useState('')
  const [currentLanguage, setCurrentLanguage] = useState('javascript')

  // Tambahkan state untuk hasil eksekusi
  const [executionResult, setExecutionResult] = useState<string>('');

  // Tambahkan state untuk mobile menu
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  // Add new ref for message container
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messageContainerRef = React.useRef<HTMLDivElement>(null)

  // Improved scroll to bottom function
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: smooth ? 'smooth' : 'auto',
        block: 'end'
      })
    }
  }, [])

  // Always scroll to bottom when messages change
  useEffect(() => {
    if (currentChat && messages[currentChat.id]?.length > 0) {
      // Use immediate scroll for user messages, smooth for AI responses
      const isLastMessageFromAI = messages[currentChat.id].slice(-1)[0]?.role === 'assistant'
      scrollToBottom(isLastMessageFromAI)
    }
  }, [messages, currentChat, scrollToBottom])

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen)

  const createNewGroup = useCallback(() => {
    const newGroup: GroupType = {
      id: `group-${Date.now()}`,
      name: `New Group ${groups.length + 1}`,
      chats: [],
      createdAt: new Date()
    }
    setGroups(prevGroups => [...prevGroups, newGroup])
    setExpandedGroups(prevExpanded => [...prevExpanded, newGroup.id])
    setNewItems(prev => ({ ...prev, [newGroup.id]: true }))
    setIsSidebarOpen(true)

    // Tambahkan panduan untuk grup pertama
    if (groups.length === 0) {
      setMessages(prev => ({
        ...prev,
        [newGroup.id]: [{
          role: 'assistant',
          content: `# Welcome to your first group! 🎉\n\nNow that you've created a group, you can:\n\n1. Click the "New Chat" button below to start a conversation\n2. Use the menu (⋮) to rename or manage your group\n3. Create more groups to organize different topics`
        }]
      }))
    }

    setTimeout(() => {
      setNewItems(prev => {
        const updated = { ...prev }
        delete updated[newGroup.id]
        return updated
      })
    }, 5000)
  }, [groups])

  const createNewChat = useCallback((groupId: string) => {
    const types = Object.keys(chatTypes);
    const randomType = types[Math.floor(Math.random() * types.length)];
    
    const newChat: Chat = {
      id: `chat-${Date.now()}`,
      name: `New Chat ${groups.find(g => g.id === groupId)?.chats.length ?? 0 + 1}`,
      createdAt: new Date(),
      type: randomType as 'general' | 'code' | 'database' | 'ai' | 'system'
    }
    setGroups(prevGroups => 
      prevGroups.map(group => 
        group.id === groupId 
          ? { ...group, chats: [...group.chats, newChat] }
          : group
      )
    )
    setCurrentChat({
      ...chatTypes[newChat.type],
      id: newChat.id,
      name: newChat.name,
      createdAt: newChat.createdAt
    })
    setMessages(prev => ({ ...prev, [newChat.id]: [] }))
    setNewItems(prev => ({ ...prev, [newChat.id]: true }))
    setTimeout(() => {
      setNewItems(prev => {
        const updated = { ...prev }
        delete updated[newChat.id]
        return updated
      })
    }, 5000)
  }, [groups])

  const toggleGroupExpansion = useCallback((groupId: string) => {
    setExpandedGroups(prevExpanded => 
      prevExpanded.includes(groupId)
        ? prevExpanded.filter(id => id !== groupId)
        : [...prevExpanded, groupId]
    )
  }, [])

  // Add state to track which group or chat is being renamed
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [newName, setNewName] = useState<string>('');

  // Update the input field styles for renaming
  const inputClassName = "input-class border border-primary focus:outline-none focus:ring-2 focus:ring-primary";

  // Update renameGroup function to handle inline renaming
  const renameGroup = useCallback((groupId: string) => {
    setRenamingGroupId(groupId);
    const group = groups.find(group => group.id === groupId);
    setNewName(group?.name || '');
  }, [groups]);

  const deleteGroup = useCallback((groupId: string) => {
    setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId))
    setExpandedGroups(prevExpanded => prevExpanded.filter(id => id !== groupId))
    if (currentChat && groups.find(g => g.id === groupId)?.chats.some(c => c.id === currentChat.id)) {
      setCurrentChat(null)
    }
  }, [groups, currentChat])

  // Update renameChat function to handle inline renaming
  const renameChat = useCallback((groupId: string, chatId: string) => {
    setRenamingChatId(chatId);
    const group = groups.find(group => group.id === groupId);
    const chat = group?.chats.find(chat => chat.id === chatId);
    setNewName(chat?.name || '');
  }, [groups]);

  const deleteChat = useCallback((groupId: string, chatId: string) => {
    setGroups(prevGroups =>
      prevGroups.map(group =>
        group.id === groupId
          ? { ...group, chats: group.chats.filter(chat => chat.id !== chatId) }
          : group
      )
    )
    if (currentChat && currentChat.id === chatId) {
      setCurrentChat(null)
    }
  }, [currentChat])

  // Tambahkan state untuk prompt chaining
  const [chainedResponses, setChainedResponses] = useState<{ [chatId: string]: ChainedResponse[] }>({})
  const [isChaining, setIsChaining] = useState(false)
  const [currentChainCursor, setCurrentChainCursor] = useState<number>(0)

  // Tambahkan state untuk melacak jumlah item yang diminta
  const [requestedCount, setRequestedCount] = useState<number | null>(null)
  const [currentCount, setCurrentCount] = useState<number>(0)

  // Update handleSendMessage untuk mendukung prompt chaining
  const handleSendMessage = useCallback(() => {
    if (inputMessage.trim() && currentChat) {
      // Deteksi jumlah item yang diminta
      const count = extractRequestedCount(inputMessage)
      setRequestedCount(count)
      setCurrentCount(0)

      const updatedMessages: Message[] = [
        ...(messages[currentChat.id] || []),
        { role: 'user' as const, content: inputMessage }
      ]
      
      setMessages(prev => ({
        ...prev,
        [currentChat.id]: updatedMessages
      }))
      setInputMessage('')
      setIsLoading(true)
      
      // Reset textarea height
      const textarea = document.querySelector('textarea')
      if (textarea) {
        textarea.style.height = '2.5rem'
      }
      
      scrollToBottom(false)
      
      // Start AI response with empty content
      setMessages(prev => ({
        ...prev,
        [currentChat.id]: [
          ...updatedMessages,
          { role: 'assistant', content: '' }
        ]
      }))

      if (count) {
        // Jika user meminta jumlah spesifik, gunakan prompt chaining
        const startChainedResponse = async () => {
          setIsChaining(true)
          setCurrentChainCursor(0)
          
          const chainResponse = async (cursor: number = 0) => {
            const remainingCount = count - currentCount
            const batchSize = 200
            const currentBatchSize = Math.min(batchSize, remainingCount)
            
            const chainPrompt = cursor === 0 
              ? `${inputMessage}. Berikan tepat ${count} item.`
              : `Lanjutkan jawaban sebelumnya dari cursor ${cursor}. Sisa item yang diperlukan: ${remainingCount}. Konteks sebelumnya: ${messages[currentChat.id]?.slice(-1)[0]?.content}`

            await streamGroqResponse(
              [
                ...updatedMessages,
                { 
                  role: 'system', 
                  content: `
                    Berikan jawaban parsial dari cursor ${cursor}.
                    Total item yang diminta: ${count}
                    Batch size: ${currentBatchSize}
                    Current count: ${currentCount}
                    Remaining: ${remainingCount}
                    Format setiap item dengan nomor urut dimulai dari ${currentCount + 1}.
                    Tambahkan [[CONTINUE]] di akhir jika masih ada item yang tersisa.
                  `
                }
              ],
              {
                onToken: (token) => {
                  setMessages(prev => ({
                    ...prev,
                    [currentChat.id]: [
                      ...updatedMessages,
                      {
                        role: 'assistant',
                        content: (prev[currentChat.id]?.slice(-1)[0]?.content || '') + token
                      }
                    ]
                  }))
                  scrollToBottom(true)
                },
                onComplete: () => {
                  const response = messages[currentChat.id]?.slice(-1)[0]?.content || ''
                  const itemCount = (response.match(/^\d+\./gm) || []).length
                  const newCurrentCount = currentCount + itemCount
                  setCurrentCount(newCurrentCount)
                  
                  const hasMore = newCurrentCount < count
                  
                  if (hasMore) {
                    setChainedResponses(prev => ({
                      ...prev,
                      [currentChat.id]: [
                        ...(prev[currentChat.id] || []),
                        { 
                          content: response, 
                          hasMore: true, 
                          nextCursor: cursor + itemCount,
                          currentCount: newCurrentCount
                        }
                      ]
                    }))
                    setCurrentChainCursor(cursor + itemCount)
                    chainResponse(cursor + itemCount)
                  } else {
                    setIsChaining(false)
                    setIsLoading(false)
                    setChainedResponses(prev => ({
                      ...prev,
                      [currentChat.id]: [
                        ...(prev[currentChat.id] || []),
                        { 
                          content: response, 
                          hasMore: false,
                          currentCount: newCurrentCount
                        }
                      ]
                    }))
                  }
                },
                onError: (error) => {
                  console.error('Groq API Error:', error)
                  setIsLoading(false)
                  setIsChaining(false)
                  setMessages(prev => ({
                    ...prev,
                    [currentChat.id]: [
                      ...updatedMessages,
                      {
                        role: 'assistant',
                        content: '❌ Sorry, there was an error generating the response. Please try again.'
                      }
                    ]
                  }))
                  scrollToBottom(true)
                }
              }
            )
          }

          await chainResponse()
        }

        startChainedResponse()
      } else {
        // Jika user tidak meminta jumlah spesifik, berikan respons normal tanpa chaining
        streamGroqResponse(
          updatedMessages,
          {
            onToken: (token) => {
              setMessages(prev => ({
                ...prev,
                [currentChat.id]: [
                  ...updatedMessages,
                  {
                    role: 'assistant',
                    content: (prev[currentChat.id]?.slice(-1)[0]?.content || '') + token
                  }
                ]
              }))
              scrollToBottom(true)
            },
            onComplete: () => {
              setIsLoading(false)
            },
            onError: (error) => {
              console.error('Groq API Error:', error)
              setIsLoading(false)
              setMessages(prev => ({
                ...prev,
                [currentChat.id]: [
                  ...updatedMessages,
                  {
                    role: 'assistant',
                    content: '❌ Sorry, there was an error generating the response. Please try again.'
                  }
                ]
              }))
              scrollToBottom(true)
            }
          }
        )
      }
    }
  }, [inputMessage, currentChat, messages, scrollToBottom, currentCount])

  // Update progress indicator
  const renderChainIndicator = () => {
    if (isChaining && requestedCount) {
      const progress = (currentCount / requestedCount) * 100
      return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="flex-1">
            <div className="text-xs mb-1">
              Generating {currentCount} of {requestedCount} items ({progress.toFixed(1)}%)
            </div>
            <div className="w-full bg-secondary h-1 rounded-full">
              <div 
                className="bg-primary h-1 rounded-full transition-all duration-300" 
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      )
    }
    return null
  }

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  const handleCodeChange = useCallback((value: string | undefined) => {
    setEditedCode(value || '')
  }, [])

  const handleSaveCode = useCallback(() => {
    setCodeContent(editedCode)
    setIsEditing(false)
  }, [editedCode])

  const deleteAllGroups = useCallback(() => {
    // Directly delete all groups without confirmation
    setGroups([])
    setExpandedGroups([])
    setCurrentChat(null)
    setMessages({})
  }, [])

  const deleteAllChatsInGroup = useCallback((groupId: string) => {
    if (window.confirm('Are you sure you want to delete all chats in this group? This action cannot be undone.')) {
      setGroups(prevGroups =>
        prevGroups.map(group =>
          group.id === groupId
            ? { ...group, chats: [] }
            : group
        )
      )
      setCurrentChat(null)
      setMessages({})
    }
  }, [])

  const clearChat = useCallback(() => {
    if (currentChat) {
      setMessages(prev => ({
        ...prev,
        [currentChat.id]: []
      }))
    }
  }, [currentChat])

  // Function to save the new name
  const saveNewName = useCallback(() => {
    if (renamingGroupId) {
      setGroups(prevGroups =>
        prevGroups.map(group =>
          group.id === renamingGroupId
            ? { ...group, name: newName }
            : group
        )
      );
      setRenamingGroupId(null);
    } else if (renamingChatId) {
      setGroups(prevGroups =>
        prevGroups.map(group =>
          group.chats.some(chat => chat.id === renamingChatId)
            ? {
                ...group,
                chats: group.chats.map(chat =>
                  chat.id === renamingChatId
                    ? { ...chat, name: newName }
                    : chat
                )
              }
            : group
        )
      );
      setRenamingChatId(null);
    }
    setNewName('');
  }, [newName, renamingGroupId, renamingChatId]);

  const { logout } = useAuth()

  // Update the logout button handler
  const handleLogout = () => {
    logout()
  }

  return (
    <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
      <div className="flex vh-fix overflow-hidden bg-background text-foreground prevent-overscroll">
        {/* Sidebar - Updated height and overflow */}
        <SheetContent side="left" className="w-full max-w-[280px] sm:w-64 p-0 h-[100dvh] overflow-hidden">
          <div className="flex flex-col h-full bg-secondary">
            <div className="p-4 flex items-center space-x-2">
              <Avatar>
                <AvatarImage 
                  src={theme === 'dark' ? '/images/logos/techtalk-white.png' : '/images/logos/techtalk-black.png'} 
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
                  {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
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
                <Button className="flex-1 justify-start" onClick={createNewGroup}>
                  <FolderPlus className="mr-2 h-4 w-4" /> New Group
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
                <div key={group.id} className="mb-4 bg-secondary/30 rounded-lg overflow-hidden border border-gray-400 dark:border-gray-700 mx-2">
                  {/* Group Header */}
                  <div className="flex items-center justify-between px-4 py-2 bg-secondary/50 relative">
                    <Button
                      variant="ghost"
                      className={`flex-1 justify-start relative group ${
                        newItems[group.id] 
                          ? 'bg-primary/10 dark:bg-primary/20 border-l-4 border-primary' 
                          : ''
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
                          <span className={`font-medium block break-words ${
                            group.name.length > 15 ? 'whitespace-normal line-clamp-2 h-[2.4em]' : 'whitespace-nowrap'
                          }`} style={{
                            fontSize: group.name.length > 15 ? '12px' : `clamp(0.875rem, ${220 / group.name.length}px, 1.125rem)`,
                            lineHeight: '1.2',
                            wordBreak: 'break-word'
                          }}>
                            {renamingGroupId === group.id ? (
                              <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onBlur={saveNewName}
                                onKeyDown={(e) => e.key === 'Enter' && saveNewName()}
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
                          <DropdownMenuItem onSelect={() => renameGroup(group.id)} className="flex items-center">
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
                  {groups.length === 1 && !expandedGroups.includes(group.id) && (
                    <div className="px-4 py-2 text-xs text-muted-foreground bg-secondary/20 animate-pulse">
                      <div className="flex items-center gap-1">
                        <ChevronRight className="h-3 w-3" />
                        <span>Tip: Click on the group to show/hide chats</span>
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
                            <div key={chat.id} className="flex items-center justify-between pr-2 relative">
                              <Button
                                variant="ghost"
                                className={`flex-1 justify-start relative group hover:bg-secondary/80 ${
                                  currentChat?.id === chat.id ? 'bg-secondary' : ''
                                } ${
                                  newItems[chat.id] ? 'bg-primary/10 dark:bg-primary/20' : ''
                                }`}
                                onClick={() => setCurrentChat({
                                  ...chatTypes[chat.type],
                                  id: chat.id,
                                  name: chat.name,
                                  createdAt: chat.createdAt
                                })}
                              >
                                <div className="flex items-center w-full pr-8">
                                  <div className={`mr-2 ${chatTypes[chat.type]?.color} flex-shrink-0`}>
                                    {chatTypes[chat.type]?.icon}
                                  </div>
                                  <div className="flex-1 px-1 min-w-0">
                                    <span className={`block break-words ${
                                      chat.name.length > 15 ? 'whitespace-normal line-clamp-2 h-[2.4em]' : 'whitespace-nowrap'
                                    }`} style={{
                                      fontSize: chat.name.length > 15 ? '12px' : `clamp(0.875rem, ${220 / chat.name.length}px, 1.125rem)`,
                                      lineHeight: '1.2',
                                      wordBreak: 'break-word'
                                    }}>
                                      {renamingChatId === chat.id ? (
                                        <input
                                          type="text"
                                          value={newName}
                                          onChange={(e) => setNewName(e.target.value)}
                                          onBlur={saveNewName}
                                          onKeyDown={(e) => e.key === 'Enter' && saveNewName()}
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
                                  <DropdownMenuItem onSelect={() => renameChat(group.id, chat.id)} className="flex items-center">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    <span>Rename</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onSelect={() => deleteChat(group.id, chat.id)}>
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
                                  <span className="font-medium text-primary">Start New Conversation</span>
                                  <span className="text-xs text-muted-foreground">Create a new chat in this group</span>
                                </div>
                              </div>
                            </Button>
                          </div>

                          {/* Date */}
                          <div className="px-6 py-2 text-xs text-muted-foreground">
                            {format(group.createdAt, 'MMM d, yyyy')}
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

        {/* Main Content - Add ref to container */}
        <div className="flex-1 flex flex-col vh-fix overflow-hidden ios-height" ref={messageContainerRef}>
          <header className="flex-none flex items-center justify-between p-2 sm:p-4 border-b border-gray-400 dark:border-gray-700">
            <div className="flex items-center">
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="mr-2 sm:mr-4">
                  <Menu className="h-4 w-4" />
                </Button>
              </SheetTrigger>
              <h1 className="text-lg sm:text-xl font-bold truncate">
                {currentChat?.name || 'Welcome to Techtalk'}
              </h1>
            </div>
            
            {/* Add Clear Chat Button */}
            {currentChat && (
              <Button 
                variant="ghost" 
                size="icon"
                onClick={clearChat}
                title="Clear Chat"
              >
                <Trash className="h-4 w-4 text-red-600" />
              </Button>
            )}

            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {/* Mobile menu dropdown */}
            {isMobileMenuOpen && (
              <div className="absolute top-14 right-2 z-50 w-48 bg-background border rounded-md shadow-lg md:hidden">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start px-4 py-2"
                  onClick={toggleTheme}
                >
                  {theme === 'dark' ? (
                    <><Sun className="h-4 w-4 mr-2" /> Light Mode</>
                  ) : (
                    <><Moon className="h-4 w-4 mr-2" /> Dark Mode</>
                  )}
                </Button>
                {codeContent && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="w-full justify-start px-4 py-2"
                    onClick={() => window.open('/code-preview', '_blank')}
                  >
                    <Code2 className="h-4 w-4 mr-2" /> View Code
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start px-4 py-2 text-red-600"
                >
                  <LogOut className="h-4 w-4 mr-2" /> Logout
                </Button>
              </div>
            )}
          </header>

          <main className="flex-1 p-2 sm:p-4 overflow-y-auto touch-scroll safe-area-padding">
            {currentChat ? (
              <div className="max-w-[1200px] mx-auto flex flex-col items-center">
                <div className="space-y-4 w-full max-w-3xl">
                  {/* Tambahkan indikator chaining di atas area pesan */}
                  {renderChainIndicator()}
                  
                  {messages[currentChat.id]?.map((message, index) => (
                    <div key={index} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`flex items-start gap-2 sm:gap-3 ${
                        message.role === 'user' 
                          ? 'flex-row-reverse max-w-[85%] sm:max-w-[75%]' 
                          : 'flex-row w-[calc(100%-32px)] sm:w-[calc(100%-48px)]'
                      }`}>
                        <Avatar className={`w-6 h-6 sm:w-8 sm:h-8 flex-shrink-0 ${
                          message.role === 'user' ? 'hidden sm:block' : ''
                        }`}>
                          <AvatarFallback>{message.role === 'user' ? 'U' : 'AI'}</AvatarFallback>
                        </Avatar>
                        <div className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} flex-1`}>
                          <div className={`p-2 sm:p-3 rounded-lg break-words text-sm ${
                            message.role === 'user' 
                              ? 'text-black dark:text-white prose prose-sm sm:prose-base max-w-none sm:max-w-[65ch]' 
                              : 'bg-transparent rounded-tl-none prose prose-sm sm:prose-base dark:prose-invert max-w-none sm:max-w-[65ch]'
                          }`}>
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              className="markdown-content text-[13px] sm:text-base leading-relaxed"
                              components={{
                                table: ({ node, ...props }) => (
                                  <div className="overflow-x-auto my-4">
                                    <table {...props} />
                                  </div>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Invisible scroll anchor */}
                  <div ref={messagesEndRef} style={{ height: 0 }} />
                  
                  {/* Loading Message - Updated width */}
                  {isLoading && (
                    <div className="flex justify-start">
                      <div className="flex items-start gap-3 w-[calc(100%-64px)]">
                        <Avatar className="flex-shrink-0">
                          <AvatarFallback>AI</AvatarFallback>
                        </Avatar>
                        <div className="p-3 rounded-lg bg-secondary rounded-tl-none">
                          Thinking...
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <WelcomeGuide onCreateGroup={createNewGroup} />
            )}
          </main>

          {/* Footer - Updated to match centered layout */}
          {currentChat && (
            <footer className="flex-none px-2 py-2 sm:p-4 border-t input-area safe-area-padding">
              <div className="flex space-x-2 max-w-3xl mx-auto">
                <Textarea 
                  placeholder="Type your message..." 
                  value={inputMessage}
                  onChange={(e) => {
                    setInputMessage(e.target.value)
                    e.target.style.height = 'inherit'
                    e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  className="flex-1 min-h-[40px] sm:min-h-[44px] max-h-[200px] resize-none py-2 text-sm sm:text-base transition-all duration-200 rounded-lg"
                  style={{
                    overflow: 'hidden',
                  }}
                  rows={1}
                />
                <div className="flex gap-1 sm:gap-2">
                  {/* Send button - lebih compact di mobile */}
                  <Button 
                    onClick={handleSendMessage} 
                    className="h-[40px] sm:h-[44px] px-3 sm:px-4"
                    disabled={isLoading || !inputMessage.trim()}
                  >
                    <Send className="h-4 w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
              </div>
            </footer>
          )}
        </div>

        {/* Code Preview Panel - Updated height */}
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
                size={{ width: previewWidth, height: '100%' }}
                onResizeStop={(e, direction, ref, d) => {
                  setPreviewWidth(previewWidth + d.width)
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
                          <TabsTrigger value="code" className="flex-1">Code</TabsTrigger>
                          <TabsTrigger value="preview" className="flex-1">Preview</TabsTrigger>
                        </TabsList>
                        <TabsContent value="code" className="h-[calc(100vh-6rem)]">
                          <Suspense fallback={<div className="h-full flex items-center justify-center">Loading editor...</div>}>
                            <div className="h-full w-full relative">
                              <div className="absolute top-2 left-2 z-10">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      className="h-7 px-2 text-xs flex items-center gap-1"
                                    >
                                      {supportedLanguages.find(lang => lang.id === currentLanguage)?.name}
                                      <ChevronDown className="h-3 w-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                                    {supportedLanguages.map((lang) => (
                                      <DropdownMenuItem
                                        key={lang.id}
                                        onSelect={() => setCurrentLanguage(lang.id)}
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
                                theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                                value={isEditing ? editedCode : codeContent}
                                onChange={handleCodeChange}
                                options={{
                                  minimap: { enabled: false },
                                  fontSize: 14,
                                  scrollBeyondLastLine: false,
                                  padding: { top: 40, bottom: 16 },
                                  readOnly: !isEditing,
                                  wordWrap: 'on',
                                  lineNumbers: 'on',
                                  renderWhitespace: 'selection',
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
                                      setIsEditing(true)
                                      setEditedCode(codeContent)
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
                                        setIsEditing(false)
                                        setEditedCode(codeContent)
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
                        <TabsContent value="preview" className="h-[calc(100vh-6rem)] p-4">
                          <div className="h-full border rounded p-4 overflow-auto">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="text-lg font-bold">Preview:</h3>
                              <span className="text-sm text-muted-foreground">
                                Language: {supportedLanguages.find(lang => lang.id === currentLanguage)?.name}
                              </span>
                            </div>
                            
                            {/* Preview container */}
                            <div className="w-full h-full bg-white rounded-lg shadow">
                              {currentLanguage === 'html' || currentLanguage === 'css' ? (
                                // Render HTML/CSS preview
                                <iframe
                                  srcDoc={`
                                    <html>
                                      <head>
                                        <style>
                                          ${currentLanguage === 'css' ? codeContent : ''}
                                        </style>
                                      </head>
                                      <body>
                                        ${currentLanguage === 'html' ? codeContent : ''}
                                      </body>
                                    </html>
                                  `}
                                  className="w-full h-full border-none"
                                  title="Preview"
                                  sandbox="allow-scripts"
                                />
                              ) : currentLanguage === 'markdown' ? (
                                // Render Markdown preview
                                <div className="p-4 prose dark:prose-invert max-w-none">
                                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {codeContent}
                                  </ReactMarkdown>
                                </div>
                              ) : currentLanguage === 'svg' ? (
                                // Render SVG preview
                                <div 
                                  className="p-4 flex items-center justify-center"
                                  dangerouslySetInnerHTML={{ __html: codeContent }}
                                />
                              ) : (
                                // For other languages that can't be previewed directly
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                  Preview not available for {currentLanguage} code
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

        {/* Toggle Preview Button - Updated positioning with right margin */}
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

        {/* Mobile Code Preview Button - Updated positioning with right margin */}
        {codeContent && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open('/code-preview', '_blank')}
            className="md:hidden fixed bottom-20 right-8 z-10"
          >
            View Code
          </Button>
        )}
      </div>
    </Sheet>
  )
}