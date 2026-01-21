import taxonomy from '@/data/taxonomy.json';
import { Node, NodeMap } from '@/types/graph';
import { create } from 'zustand';

interface StoreState {
  nodeMap: NodeMap;
  activePath: string[];
  isLoading: boolean;
  fetchingIds: Set<string>; 
  selectNode: (nodeId: string, depth: number) => void;
  getNodeChildren: (nodeId: string) => Node[];
  generateChildren: (parentNode: Node, silent?: boolean) => Promise<void>;
}

// Simple initialization: Just load the roots.
const initializeNodes = (): NodeMap => {
  const map: NodeMap = {};
  taxonomy.roots.forEach((root) => {
    const rootChildrenIds: string[] = [];
    
    // Process Static Children (if any exist in JSON)
    if (root.children) {
      root.children.forEach((child: any) => {
        const childId = child.id;
        // Map static children simply
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
  nodeMap: initializeNodes(),
  activePath: [],
  isLoading: false,
  fetchingIds: new Set(),

  selectNode: async (nodeId, depth) => {
    console.log(`🖱️ CLICKED: ${nodeId} at depth ${depth}`);
    
    // 1. Update Path UI
    set((state) => {
      const newPath = state.activePath.slice(0, depth);
      newPath.push(nodeId);
      return { activePath: newPath };
    });

    const state = get();
    const node = state.nodeMap[nodeId];

    // 2. Check Cache
    if (node && node.childrenIds && node.childrenIds.length > 0) {
       console.log("✅ CHILDREN EXIST. Skipping generation.");
       return; 
    }

    // 3. Generate if missing
    if (node) {
       console.log("⚡ GENERATING CHILDREN FOR:", node.title);
       await state.generateChildren(node, false);
    }
  },

  generateChildren: async (parentNode, silent = false) => {
    const state = get();

    // Prevent duplicate requests
    if (state.fetchingIds.has(parentNode.id)) return;

    if (!silent) set({ isLoading: true });
    
    set((state) => {
      const newSet = new Set(state.fetchingIds);
      newSet.add(parentNode.id);
      return { fetchingIds: newSet };
    });

    try {
      if (!silent) console.log(`🚀 API REQUEST START: ${parentNode.title}`);

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

      // Simple Mapping: Just create the children. No grandchildren logic.
      data.children.forEach((child: any, i: number) => {
        const childId = `${parentNode.id}_${i}`;
        
        const newNode = {
          id: childId,
          title: child.title,
          hook: child.hook,
          is_static: false,
          childrenIds: [], // Start empty
          llm_config: child.llm_config,
          popup_data: child.popup_data // Guaranteed to be full now
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