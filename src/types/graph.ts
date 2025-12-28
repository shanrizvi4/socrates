export interface PopupData {
  description: string;
  questions: string[];
}

export interface LLMConfig {
  definition: string;
  exclude: string;
}

export interface Node {
  id: string;
  title: string;
  hook: string;
  is_static: boolean;
  
  childrenIds?: string[]; 
  popup_data?: PopupData;
  
  // NEW: This holds the instructions for the AI
  llm_config?: LLMConfig; 
  
  context_vector?: number[];
}

export type NodeMap = Record<string, Node>;

export interface GraphState {
  nodes: NodeMap;
  selectedPath: string[];
}