import taxonomy from '@/data/taxonomy.json';
import { Node, NodeMap } from '@/types/graph';
import { create } from 'zustand';

interface StoreState {
  nodeMap: NodeMap;
  activePath: string[];
  isLoading: boolean;
  selectNode: (nodeId: string, depth: number) => void;
  getNodeChildren: (nodeId: string) => Node[];
  generateChildren: (parentNode: Node) => Promise<void>;
}

const initializeNodes = (): NodeMap => {
  const map: NodeMap = {};
  taxonomy.roots.forEach((root) => {
    map[root.id] = { ...root, childrenIds: root.children.map(c => c.id) } as unknown as Node;
    root.children.forEach((child) => {
      map[child.id] = { ...child, childrenIds: [] };
    });
  });
  return map;
};

export const useGraphStore = create<StoreState>((set, get) => ({
  nodeMap: initializeNodes(),
  activePath: [],
  isLoading: false,

  selectNode: async (nodeId, depth) => {
    console.log(`🖱️ CLICKED: ${nodeId} at depth ${depth}`);
    
    // 1. Update visual selection
    set((state) => {
      const newPath = state.activePath.slice(0, depth);
      newPath.push(nodeId);
      return { activePath: newPath };
    });

    // 2. Check if we need to generate children
    const state = get();
    const node = state.nodeMap[nodeId];
    
    console.log("🔍 Checking node:", node.title);
    console.log("   Children IDs:", node.childrenIds);
    console.log("   Is Loading?", state.isLoading);
    
    // If node exists, has NO children, and is NOT loading... generate them!
    if (node && (!node.childrenIds || node.childrenIds.length === 0)) {
       console.log("⚡ Triggering Generation for:", node.title);
       await state.generateChildren(node);
    } else {
       console.log("✅ Children already exist. No API call needed.");
    }
  },

  generateChildren: async (parentNode) => {
    set({ isLoading: true });
    console.log("🚀 SENDING API REQUEST for:", parentNode.title);

    try {
      const state = get();
      
      const payload = {
        parentNode,
        pathHistory: state.activePath.map(id => state.nodeMap[id]?.title)
      };

      // Call API
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      console.log("📡 API RESPONSE STATUS:", res.status);
      
      const data = await res.json();
      console.log("📦 API DATA RECEIVED:", data);

      // Process new nodes
      const newChildrenIds: string[] = [];
      const newNodesMap: NodeMap = {};

      if (!data.children) throw new Error("API returned no 'children' array");

      data.children.forEach((child: any, index: number) => {
        const safeTitle = child.title.toLowerCase().replace(/[^a-z0-9]/g, '_');
        const newId = `${parentNode.id}_${safeTitle}_${index}`;
        
        newChildrenIds.push(newId);
        newNodesMap[newId] = {
          id: newId,
          title: child.title,
          hook: child.hook,
          is_static: false,
          childrenIds: [], 
          llm_config: child.llm_config,
          popup_data: child.popup_data
        };
      });

      set((state) => ({
        nodeMap: {
          ...state.nodeMap,
          ...newNodesMap,
          [parentNode.id]: {
            ...state.nodeMap[parentNode.id],
            childrenIds: newChildrenIds
          }
        },
        isLoading: false
      }));
      console.log("✨ STATE UPDATED with new nodes.");

    } catch (error) {
      console.error("❌ GENERATION FAILED:", error);
      set({ isLoading: false });
    }
  },

  getNodeChildren: (nodeId) => {
    const state = get();
    const node = state.nodeMap[nodeId];
    if (!node || !node.childrenIds) return [];
    return node.childrenIds.map(id => state.nodeMap[id]).filter(Boolean);
  }
}));

export const getRootNodes = () => {
   return taxonomy.roots.map(r => ({ 
     id: r.id, 
     title: r.title, 
     hook: r.hook, 
     is_static: true 
   }));
};