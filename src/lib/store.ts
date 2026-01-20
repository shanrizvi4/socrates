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

const initializeNodes = (): NodeMap => {
  const map: NodeMap = {};
  taxonomy.roots.forEach((root) => {
    const rootChildrenIds: string[] = [];
    root.children.forEach((child: any) => {
      const childId = child.id;
      const childChildrenIds: string[] = [];
      if (child.preview_children) {
        child.preview_children.forEach((grandChild: any, i: number) => {
          const grandChildId = `${childId}_preview_${i}`;
          map[grandChildId] = {
            id: grandChildId,
            title: grandChild.title,
            hook: grandChild.hook,
            is_static: false,
            childrenIds: [], 
          };
          childChildrenIds.push(grandChildId);
        });
      }
      map[childId] = { ...child, childrenIds: childChildrenIds };
      rootChildrenIds.push(childId);
    });
    map[root.id] = { ...root, childrenIds: rootChildrenIds } as unknown as Node;
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
    
    set((state) => {
      const newPath = state.activePath.slice(0, depth);
      newPath.push(nodeId);
      return { activePath: newPath };
    });

    const state = get();
    const node = state.nodeMap[nodeId];
    
    // CASE A: Children exist (Instant Load)
    // This happens when clicking Root nodes or nodes we visited before.
    if (node && node.childrenIds && node.childrenIds.length > 0) {
       console.log("✅ INSTANT LOAD. Checking for pre-fetch opportunities...");
       
       // --- 🌊 RESTORED: LOOK-AHEAD PREFETCH ---
       // Even though we have the children (Layer 2), we need to check 
       // if THOSE children have their own children (Layer 3).
       // If not, we start fetching them silently right now.
       const childrenToPrefetch = node.childrenIds.slice(0, 3); // Limit to 3 to save bandwidth

       childrenToPrefetch.forEach(childId => {
         const childNode = state.nodeMap[childId];
         // Logic: If child exists, but has NO children of its own, fetch them!
         if (childNode && (!childNode.childrenIds || childNode.childrenIds.length === 0)) {
           console.log(`👀 LOOK-AHEAD: Prefetching for ${childNode.title}`);
           state.generateChildren(childNode, true); 
         }
       });
       return; 
    }

    // CASE B: Blocking Load (We have nothing, must wait)
    if (node) {
       console.log("⚡ BLOCKING LOAD: Generating for:", node.title);
       await state.generateChildren(node, false);
    }
  },

  generateChildren: async (parentNode, silent = false) => {
    const state = get();

    if (state.fetchingIds.has(parentNode.id)) {
      if (!silent) console.log(`⏳ ALREADY FETCHING: ${parentNode.title}`);
      if (!silent) set({ isLoading: true }); 
      return;
    }

    if ((state.nodeMap[parentNode.id]?.childrenIds?.length ?? 0) > 0) {
      return;
    }

    if (!silent) set({ isLoading: true });
    
    set((state) => {
      const newSet = new Set(state.fetchingIds);
      newSet.add(parentNode.id);
      return { fetchingIds: newSet };
    });

    try {
      if (!silent) console.log(`🚀 API REQUEST START: ${parentNode.title} (Silent: ${silent})`);

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
      const newChildNodes: Node[] = []; 

      data.children.forEach((child: any, i: number) => {
        const childId = `${parentNode.id}_${i}`;
        const childChildrenIds: string[] = [];

        if (child.preview_children) {
          child.preview_children.forEach((grandChild: any, j: number) => {
            const grandChildId = `${childId}_preview_${j}`;
            newNodesMap[grandChildId] = {
              id: grandChildId,
              title: grandChild.title,
              hook: grandChild.hook,
              is_static: false,
              childrenIds: [],
            };
            childChildrenIds.push(grandChildId);
          });
        }

        const newNode = {
          id: childId,
          title: child.title,
          hook: child.hook,
          is_static: false,
          childrenIds: childChildrenIds,
          llm_config: child.llm_config,
          popup_data: child.popup_data
        };

        newNodesMap[childId] = newNode;
        parentChildrenIds.push(childId);
        newChildNodes.push(newNode);
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
      console.log(`✨ GENERATED: ${parentNode.title}`);

      // --- 🌊 CASCADE PREFETCH (Deep Dive) ---
      // If we just generated Layer X, immediately fetch Layer X+1
      if (!silent) {
        console.log(`🌊 CASCADE: Prefetching next layer for first 3 children...`);
        newChildNodes.slice(0, 3).forEach((childNode) => {
          setTimeout(() => {
             get().generateChildren(childNode, true); 
          }, 100);
        });
      }

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
     is_static: true 
   }));
};