export interface Node {
  id: string;
  title: string;
  hook: string;
  childrenIds?: string[];
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