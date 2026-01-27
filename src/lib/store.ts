import taxonomy from '@/data/taxonomy.json';
import { Node, NodeMap, ChatMessage, ChatSession } from '@/types/graph';
import { create } from 'zustand';

interface StoreState {
  // GRAPH STATE
  nodeMap: NodeMap;
  activePath: string[];
  isLoading: boolean;
  fetchingIds: Set<string>;
  nodePageIndex: Record<string, number>; // Current page for each node

  // CHAT STATE
  isChatOpen: boolean;
  isChatLoading: boolean;
  isChatExpanded: boolean;
  chatSessions: Record<string, ChatSession>;
  activeChatId: string | null;
  chatListOrder: string[]; // Most recent first

  // ACTIONS
  selectNode: (nodeId: string, depth: number) => void;
  getNodeChildren: (nodeId: string) => Node[];
  getVisibleChildren: (nodeId: string) => Node[];
  generateChildren: (parentNode: Node, silent?: boolean) => Promise<void>;
  generateMoreChildren: (nodeId: string) => Promise<void>;
  setNodePage: (nodeId: string, pageIndex: number) => void;
  getNodePageInfo: (nodeId: string) => { current: number; total: number; hasChildren: boolean };

  // CHAT ACTIONS
  toggleChat: () => void;
  toggleChatExpanded: () => void;
  triggerChat: (nodeId: string, nodeTitle: string, mode: 'explore' | 'chat', specificQuestion?: string | null, openChat?: boolean) => Promise<void>;
  sendMessage: (message: string) => Promise<void>;
  switchChat: (chatId: string) => void;
  createNewChat: (nodeId: string, nodeTitle: string) => string;
  getActiveSession: () => ChatSession | null;
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
        description: root.hook,
        questions: []
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
  nodePageIndex: {},

  isChatOpen: false,
  isChatLoading: false,
  isChatExpanded: false,
  chatSessions: {},
  activeChatId: null,
  chatListOrder: [],

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
        pathHistory: state.activePath.map(id => state.nodeMap[id]?.title),
        excludeTitles: [] // First generation has no exclusions
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API Request Failed");

      const newNodesMap: NodeMap = {};
      const pageChildrenIds: string[] = [];
      const pageIndex = 0;

      data.children.forEach((child: any, i: number) => {
        const childId = `${parentNode.id}_p${pageIndex}_${i}`;
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
        pageChildrenIds.push(childId);
      });

      set((state) => ({
        nodeMap: {
          ...state.nodeMap,
          ...newNodesMap,
          [parentNode.id]: {
            ...state.nodeMap[parentNode.id],
            childrenIds: pageChildrenIds,
            childrenPages: [pageChildrenIds]
          }
        },
        nodePageIndex: {
          ...state.nodePageIndex,
          [parentNode.id]: 0
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

  generateMoreChildren: async (nodeId) => {
    const state = get();
    const parentNode = state.nodeMap[nodeId];
    if (!parentNode || state.fetchingIds.has(nodeId)) return;

    set({ isLoading: true });

    set((state) => {
      const newSet = new Set(state.fetchingIds);
      newSet.add(nodeId);
      return { fetchingIds: newSet };
    });

    try {
      // Collect all existing child titles to exclude
      const existingChildIds = parentNode.childrenIds || [];
      const excludeTitles = existingChildIds
        .map(id => state.nodeMap[id]?.title)
        .filter(Boolean);

      const payload = {
        parentNode,
        pathHistory: state.activePath.map(id => state.nodeMap[id]?.title),
        excludeTitles
      };

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "API Request Failed");

      const newNodesMap: NodeMap = {};
      const pageChildrenIds: string[] = [];

      // If no pages exist yet, create page 0 from existing children
      let existingPages = parentNode.childrenPages || [];
      if (existingPages.length === 0 && existingChildIds.length > 0) {
        existingPages = [existingChildIds];
      }

      const newPageIndex = existingPages.length;

      data.children.forEach((child: any, i: number) => {
        const childId = `${nodeId}_p${newPageIndex}_${i}`;
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
        pageChildrenIds.push(childId);
      });

      set((state) => {
        const currentNode = state.nodeMap[nodeId];
        let currentPages = currentNode.childrenPages || [];

        // If no pages exist yet, create page 0 from existing children
        if (currentPages.length === 0 && (currentNode.childrenIds?.length ?? 0) > 0) {
          currentPages = [currentNode.childrenIds!];
        }

        const allChildrenIds = [...(currentNode.childrenIds || []), ...pageChildrenIds];

        return {
          nodeMap: {
            ...state.nodeMap,
            ...newNodesMap,
            [nodeId]: {
              ...currentNode,
              childrenIds: allChildrenIds,
              childrenPages: [...currentPages, pageChildrenIds]
            }
          },
          nodePageIndex: {
            ...state.nodePageIndex,
            [nodeId]: currentPages.length // Jump to the new page (0-indexed)
          },
          isLoading: false
        };
      });

    } catch (error) {
      console.error("❌ GENERATION FAILED:", error);
      set({ isLoading: false });
    } finally {
      set((state) => {
        const newSet = new Set(state.fetchingIds);
        newSet.delete(nodeId);
        return { fetchingIds: newSet };
      });
    }
  },

  setNodePage: (nodeId, pageIndex) => {
    set((state) => ({
      nodePageIndex: {
        ...state.nodePageIndex,
        [nodeId]: pageIndex
      }
    }));
  },

  getNodePageInfo: (nodeId) => {
    const state = get();
    const node = state.nodeMap[nodeId];
    if (!node) return { current: 1, total: 0, hasChildren: false };

    const pages = node.childrenPages;
    const hasChildren = (node.childrenIds?.length ?? 0) > 0;

    // If no pages structure yet but has children, treat as 1 page
    if (!pages || pages.length === 0) {
      return { current: 1, total: hasChildren ? 1 : 0, hasChildren };
    }

    const current = state.nodePageIndex[nodeId] ?? 0;
    return { current: current + 1, total: pages.length, hasChildren };
  },

  getNodeChildren: (nodeId) => {
    const state = get();
    const node = state.nodeMap[nodeId];
    if (!node || !node.childrenIds) return [];
    // Return all children (used internally)
    return node.childrenIds.map(id => state.nodeMap[id]).filter(Boolean);
  },

  getVisibleChildren: (nodeId) => {
    const state = get();
    const node = state.nodeMap[nodeId];
    if (!node) return [];

    const pages = node.childrenPages;
    if (!pages || pages.length === 0) {
      // Fallback for nodes without pages (legacy or root children)
      return (node.childrenIds || []).map(id => state.nodeMap[id]).filter(Boolean);
    }

    const currentPage = state.nodePageIndex[nodeId] ?? 0;
    const pageIds = pages[currentPage] || [];
    return pageIds.map(id => state.nodeMap[id]).filter(Boolean);
  },

  // --- CHAT ACTIONS ---
  toggleChat: () => {
    set((state) => ({ isChatOpen: !state.isChatOpen }));
  },

  toggleChatExpanded: () => {
    set((state) => ({ isChatExpanded: !state.isChatExpanded }));
  },

  getActiveSession: () => {
    const state = get();
    if (!state.activeChatId) return null;
    return state.chatSessions[state.activeChatId] || null;
  },

  createNewChat: (nodeId, nodeTitle) => {
    const chatId = `chat_${nodeId}_${Date.now()}`;
    const newSession: ChatSession = {
      id: chatId,
      nodeId,
      nodeTitle,
      messages: [],
      createdAt: Date.now()
    };

    set((state) => ({
      chatSessions: {
        ...state.chatSessions,
        [chatId]: newSession
      },
      chatListOrder: [chatId, ...state.chatListOrder],
      activeChatId: chatId
    }));

    return chatId;
  },

  switchChat: (chatId) => {
    set({ activeChatId: chatId });
  },

  triggerChat: async (nodeId, nodeTitle, mode, specificQuestion = null, openChat = true) => {
    // Create or find existing chat session for this node
    let chatId = get().activeChatId;
    const existingSession = get().chatSessions[chatId || ''];

    // Create new session if none exists or if it's for a different node
    if (!existingSession || existingSession.nodeId !== nodeId) {
      chatId = get().createNewChat(nodeId, nodeTitle);
    }

    if (openChat) {
      set({ isChatOpen: true });
    }

    // Determine the prompt - hide the initial explore message in UI
    const isInitialExplore = mode === 'explore' && !specificQuestion;
    const prompt = specificQuestion || `Tell me about ${nodeTitle}.`;

    // Always add user message to session (required for Gemini history to start with 'user' role)
    set((state) => {
      const session = state.chatSessions[chatId!];
      if (!session) return state;
      return {
        chatSessions: {
          ...state.chatSessions,
          [chatId!]: {
            ...session,
            messages: [...session.messages, {
              role: 'user' as const,
              content: prompt,
              hidden: isInitialExplore // Hide "Tell me about X" in UI
            }]
          }
        }
      };
    });

    set({ isChatLoading: true });

    // Get fresh state for API call
    const freshState = get();
    const currentSession = freshState.chatSessions[chatId!];

    // Add a placeholder model message for streaming
    const modelMessageIndex = currentSession.messages.length;
    set((state) => {
      const session = state.chatSessions[chatId!];
      if (!session) return state;
      return {
        chatSessions: {
          ...state.chatSessions,
          [chatId!]: {
            ...session,
            messages: [
              ...session.messages,
              { role: 'model' as const, content: '' }
            ]
          }
        }
      };
    });

    try {
      // Build ancestry context (last 3 ancestors before the current node)
      const currentNodeIndex = freshState.activePath.indexOf(nodeId);
      const ancestorIds = currentNodeIndex > 0
        ? freshState.activePath.slice(Math.max(0, currentNodeIndex - 3), currentNodeIndex)
        : freshState.activePath.slice(-4, -1);
      const ancestryPath = ancestorIds.map(id => freshState.nodeMap[id]?.title).filter(Boolean);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: prompt,
          nodeTitle,
          ancestryPath,
          mode,
          history: currentSession.messages
        })
      });

      if (!res.ok) throw new Error('API request failed');

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullContent += parsed.text;

                // Update the message content in real-time
                set((state) => {
                  const session = state.chatSessions[chatId!];
                  if (!session) return state;

                  const messages = [...session.messages];
                  messages[modelMessageIndex] = {
                    ...messages[modelMessageIndex],
                    content: fullContent
                  };

                  return {
                    chatSessions: {
                      ...state.chatSessions,
                      [chatId!]: { ...session, messages }
                    }
                  };
                });
              }
            } catch {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
      }

      // Parse out suggested questions from the content
      const questionsMatch = fullContent.match(/<!--QUESTIONS:(\[.*?\])-->/);
      let suggestedQuestions: string[] = [];
      let cleanContent = fullContent;

      if (questionsMatch) {
        try {
          suggestedQuestions = JSON.parse(questionsMatch[1]);
          cleanContent = fullContent.replace(/<!--QUESTIONS:\[.*?\]-->/, '').trim();
        } catch {
          console.warn('Failed to parse suggested questions');
        }
      }

      // Final update with clean content and suggested questions
      set((state) => {
        const session = state.chatSessions[chatId!];
        if (!session) return { isChatLoading: false };

        const messages = [...session.messages];
        messages[modelMessageIndex] = {
          role: 'model' as const,
          content: cleanContent,
          suggestedQuestions
        };

        return {
          chatSessions: {
            ...state.chatSessions,
            [chatId!]: { ...session, messages }
          },
          isChatLoading: false
        };
      });

    } catch (error) {
      console.error("Chat Error:", error);
      set((state) => {
        const session = state.chatSessions[chatId!];
        if (!session) return { isChatLoading: false };

        const messages = [...session.messages];
        messages[modelMessageIndex] = {
          role: 'model' as const,
          content: "I'm having trouble connecting to the library archives right now."
        };

        return {
          chatSessions: {
            ...state.chatSessions,
            [chatId!]: { ...session, messages }
          },
          isChatLoading: false
        };
      });
    }
  },

  sendMessage: async (message) => {
    const state = get();
    const chatId = state.activeChatId;
    const session = chatId ? state.chatSessions[chatId] : null;

    if (!session || !message.trim()) return;

    // Use triggerChat with chat mode
    await get().triggerChat(session.nodeId, session.nodeTitle, 'chat', message, false);
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