export type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export interface StreamHandler {
  onToken: (token: string) => void;
  onComplete: () => void;
  onError: (error: any) => void;
}

export interface ChatType {
  type: 'general' | 'code' | 'database' | 'ai' | 'system';
  icon: React.ReactNode;
  color: string;
}

export interface Chat {
  id: string;
  name: string;
  createdAt: Date;
  type: string;
}

export interface Group {
  id: string;
  name: string;
  chats: Chat[];
  createdAt: Date;
} 