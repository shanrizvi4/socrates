export interface Node {
  id: string;
  title: string;
  hook: string;
  childrenIds?: string[];
  childrenPages?: string[][]; // Each page contains 5 child IDs
  is_static?: boolean; // True for root nodes from JSON

  // Configuration for the LLM generation
  llm_config?: {
    definition?: string;
    exclude?: string;
  };

  // The Rich Data for the HoverCard & Chat
  popup_data?: {
    description: string;
    questions: string[];
  };
}

export type NodeMap = Record<string, Node>;

export interface TaxonomyRoot {
  id: string;
  title: string;
  hook: string;
  children?: Node[];
  popup_data?: {
    description: string;
    questions: string[];
  };
}

export interface TaxonomyData {
  roots: TaxonomyRoot[];
}

// Chat Types
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  suggestedQuestions?: string[];
}

export interface ChatSession {
  id: string;
  nodeId: string;
  nodeTitle: string;
  messages: ChatMessage[];
  createdAt: number;
}