import taxonomy from '@/data/taxonomy.json';
import { Node, NodeMap } from '@/types/graph';
import { create } from 'zustand';

// --- TYPES ---
export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface StoreState {
  // GRAPH STATE
  nodeMap: NodeMap;
  activePath: string[];
  isLoading: boolean;
  fetchingIds: Set<string>; 
  
  // CHAT STATE
  isChatOpen: boolean;
  isChatLoading: boolean;
  chatHistory: ChatMessage[];
  activeNodeTitle: string | null; 

  // ACTIONS
  selectNode: (nodeId: string, depth: number) => void;
  getNodeChildren: (nodeId: string) => Node[];
  generateChildren: (parentNode: Node, silent?: boolean) => Promise<void>;
  
  // CHAT ACTIONS
  toggleChat: () => void;
  triggerChat: (nodeTitle: string, contextTitle: string, specificQuestion?: string) => Promise<void>;
  resetChat: () => void; 
  addMessage: (role: 'user' | 'model', content: string) => void;
}

const initializeNodes = (): NodeMap => {
  const map: NodeMap = {};
  taxonomy.roots.forEach((root) => {
    const rootChildrenIds: string[] = [];
    if (root.children) {
      root.children.forEach((child: any) => {
        const childId = child.id;
        map[childId] = { ...child, childrenIds: [] };
        rootChildrenIds.push(childId);
      });
    }
    const normalizedRoot = {
      ...root,
      childrenIds: rootChildrenIds,
      popup_data: root.popup_data || {
        description: root.description || root.hook,
        questions: root.questions || [] 
      }
    };
    map[root.id] = normalizedRoot as unknown as Node;
  });
  return map;
};

export const useGraphStore = create<StoreState>((set, get) => ({
  // --- INITIAL STATE ---
  nodeMap: initializeNodes(),
  activePath: [],
  isLoading: false,
  fetchingIds: new Set(),
  
  isChatOpen: false,
  isChatLoading: false,
  activeNodeTitle: "Leaf Venation Patterns", 
  
  // FILLER CONTENT (Model First)
  chatHistory: [
    { 
      role: 'model', 
      content: "Leaf venation—the arrangement of veins in a leaf blade—is critical for mechanical support and the transport of water and nutrients. \n\nIn this specimen, we see a reticulate (net-like) pattern characteristic of dicots. The primary midrib branches into secondary and tertiary veins, forming a complex mesh that ensures redundancy; if one path is damaged by insects, resources can bypass the injury. This density is often correlated with the plant's hydraulic capacity and its ability to photosynthesize in high-light environments." 
    },
    { 
      role: 'user', 
      content: "That makes sense. I noticed the veins near the margin are much denser than the ones near the midrib. Is that normal?" 
    },
    { 
      role: 'model', 
      content: "Yes, that is a common adaptation. Increased vein density at the margins helps prevent desiccation (drying out) where the leaf is most vulnerable to wind and evaporation. It reinforces the structural integrity of the leaf edge, preventing tearing." 
    }
  ],

  // --- GRAPH ACTIONS ---
  selectNode: async (nodeId, depth) => {
    console.log(`🖱️ CLICKED: ${nodeId} at depth ${depth}`);
    set((state) => {
      const newPath = state.activePath.slice(0, depth);
      newPath.push(nodeId);
      return { activePath: newPath };
    });

    const state = get();
    const node = state.nodeMap[nodeId];

    if (node && node.childrenIds && node.childrenIds.length > 0) return;
    if (node) await state.generateChildren(node, false);
  },

  generateChildren: async (parentNode, silent = false) => {
    const state = get();
    if (state.fetchingIds.has(parentNode.id)) return;

    if (!silent) set({ isLoading: true });
    
    set((state) => {
      const newSet = new Set(state.fetchingIds);
      newSet.add(parentNode.id);
      return { fetchingIds: newSet };
    });

    try {
      const payload = {
        parentNode,
        pathHistory: state.activePath.map(id => state.nodeMap[id]?.title)
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API Request Failed");

      const newNodesMap: NodeMap = {};
      const parentChildrenIds: string[] = [];

      data.children.forEach((child: any, i: number) => {
        const childId = `${parentNode.id}_${i}`;
        const newNode = {
          id: childId,
          title: child.title,
          hook: child.hook,
          is_static: false,
          childrenIds: [], 
          llm_config: child.llm_config,
          popup_data: child.popup_data 
        };
        newNodesMap[childId] = newNode;
        parentChildrenIds.push(childId);
      });

      set((state) => ({
        nodeMap: {
          ...state.nodeMap,
          ...newNodesMap,
          [parentNode.id]: {
            ...state.nodeMap[parentNode.id],
            childrenIds: parentChildrenIds
          }
        },
        isLoading: false
      }));

    } catch (error) {
      console.error("❌ GENERATION FAILED:", error);
      if (!silent) set({ isLoading: false });
    } finally {
      set((state) => {
        const newSet = new Set(state.fetchingIds);
        newSet.delete(parentNode.id);
        return { fetchingIds: newSet };
      });
    }
  },

  getNodeChildren: (nodeId) => {
    const state = get();
    const node = state.nodeMap[nodeId];
    if (!node || !node.childrenIds) return [];
    return node.childrenIds.map(id => state.nodeMap[id]).filter(Boolean);
  },

  // --- CHAT ACTIONS ---
  toggleChat: () => {
    set((state) => ({ isChatOpen: !state.isChatOpen }));
  },

  resetChat: () => {
    set({
      chatHistory: [{ role: 'model', content: "New page. I am ready to record your observations." }],
      activeNodeTitle: null
    });
  },

  addMessage: (role, content) => {
    set((state) => ({
      chatHistory: [...state.chatHistory, { role, content }]
    }));
  },

  triggerChat: async (nodeTitle, contextTitle, specificQuestion) => {
    const state = get();
    
    set({ 
      isChatOpen: true, 
      isChatLoading: true,
      activeNodeTitle: nodeTitle 
    });

    const prompt = specificQuestion 
      ? specificQuestion 
      : `Tell me about ${nodeTitle} in the context of ${contextTitle}.`;

    state.addMessage('user', prompt);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: prompt,
          history: state.chatHistory 
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      state.addMessage('model', data.response);

    } catch (error) {
      console.error("Chat Error:", error);
      state.addMessage('model', "I'm having trouble connecting to the library archives right now.");
    } finally {
      set({ isChatLoading: false });
    }
  }
}));

export const getRootNodes = () => {
   return taxonomy.roots.map(r => ({ 
     id: r.id, 
     title: r.title, 
     hook: r.hook, 
     is_static: true,
     popup_data: r.popup_data 
   }));
};