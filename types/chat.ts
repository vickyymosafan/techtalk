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

export interface ChainedResponse {
  id: string;
  content: string;
  timestamp: Date;
}

export interface PromptRow {
  row_idx: number;
  row: {
    act: string;
    prompt: string;
  };
}

export interface DatasetResponse {
  rows: PromptRow[];
}

export interface DatasetMessage {
  content: string;
  role: "user" | "assistant";
}

export interface DatasetRow {
  row_idx: number;
  row: {
    messages: DatasetMessage[];
  };
  truncated_cells: any[];
}

export interface Dataset {
  features: Array<{
    feature_idx: number;
    name: string;
    type: Array<{
      content: {
        dtype: string;
        _type: string;
      };
      role: {
        dtype: string;
        _type: string;
      };
    }>;
  }>;
  rows: DatasetRow[];
  num_rows_total: number;
  num_rows_per_page: number;
  partial: boolean;
} 