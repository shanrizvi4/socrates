import { useGraphStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { useShallow } from 'zustand/react/shallow'; 
import "../styles/chat.css";

export function ChatSidebar() {
  const { isChatOpen, chatHistory, isChatLoading, activeNodeTitle, triggerChat, toggleChat, resetChat } = useGraphStore(
    useShallow((state) => ({
      isChatOpen: state.isChatOpen,
      chatHistory: state.chatHistory,
      isChatLoading: state.isChatLoading,
      activeNodeTitle: state.activeNodeTitle, 
      triggerChat: state.triggerChat,
      toggleChat: state.toggleChat,
      resetChat: state.resetChat,
    }))
  );

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chatHistory, isChatLoading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    
    const currentTitle = activeNodeTitle || "Manual Query";
    triggerChat(currentTitle, "User Follow-up", input); 
    setInput("");
  };

  const displayTitle = activeNodeTitle || "Field Notes";

  return (
    <div className={`chat-sidebar ${isChatOpen ? 'open' : 'closed'}`}>
      
      {/* HEADER: Two-Row Layout */}
      <div className="chat-header">
        
        {/* ROW 1: Utility Bar */}
        <div className="header-controls">
            {/* LEFT: New Note */}
            <button 
              onClick={resetChat} 
              className="control-btn"
              title="Start a new session"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span>New Chat</span>
            </button>

            {/* RIGHT: Close */}
            <button 
              onClick={toggleChat} 
              className="control-btn"
              title="Close panel"
            >
                <span>Close</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
            </button>
        </div>

        {/* ROW 2: Title */}
        <h2 className="chat-title">{displayTitle}</h2>
      </div>

      {/* MESSAGES */}
      <div className="chat-messages" ref={scrollRef}>
        {chatHistory.map((msg, i) => (
          <div key={i} className={`chat-message ${msg.role}`}>
            {msg.content}
          </div>
        ))}
        
        {isChatLoading && (
          <div className="typing-indicator">
             <div className="typing-dot" style={{ animationDelay: '0ms' }} />
             <div className="typing-dot" style={{ animationDelay: '150ms' }} />
             <div className="typing-dot" style={{ animationDelay: '300ms' }} />
          </div>
        )}
      </div>

      {/* INPUT */}
      <form onSubmit={handleSubmit} className="chat-input-area">
        <div className="input-wrapper">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Ask about ${activeNodeTitle || 'this topic'}...`}
            className="chat-input"
          />
          <button 
            type="submit"
            disabled={isChatLoading || !input.trim()}
            className="chat-send-btn"
            aria-label="Send Message"
          >
             <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
             </svg>
          </button>
        </div>
      </form>
    </div>
  );
}