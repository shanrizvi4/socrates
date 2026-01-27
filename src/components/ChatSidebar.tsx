import { useGraphStore } from "@/lib/store";
import { useEffect, useRef, useState } from "react";
import { useShallow } from 'zustand/react/shallow';
import { SuggestedQuestions } from "./chat/SuggestedQuestions";
import { ChatExpanded } from "./chat/ChatExpanded";
import { MarkdownContent } from "./chat/MarkdownContent";
import "../styles/chat.css";

export function ChatSidebar() {
  const {
    isChatOpen,
    chatSessions,
    activeChatId,
    isChatLoading,
    toggleChat,
    toggleChatExpanded,
    sendMessage
  } = useGraphStore(
    useShallow((state) => ({
      isChatOpen: state.isChatOpen,
      chatSessions: state.chatSessions,
      activeChatId: state.activeChatId,
      isChatLoading: state.isChatLoading,
      toggleChat: state.toggleChat,
      toggleChatExpanded: state.toggleChatExpanded,
      sendMessage: state.sendMessage
    }))
  );

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const activeSession = activeChatId ? chatSessions[activeChatId] : null;

  // Only auto-scroll if there's a visible user message (not initial explore)
  const hasVisibleUserMessage = activeSession?.messages.some(m => m.role === 'user' && !m.hidden);

  useEffect(() => {
    if (scrollRef.current && hasVisibleUserMessage) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages, isChatLoading, hasVisibleUserMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    sendMessage(input);
    setInput("");
  };

  const displayTitle = activeSession?.nodeTitle || "Field Notes";

  // Find last model message with suggested questions
  const lastModelMessage = activeSession?.messages
    .filter(m => m.role === 'model')
    .pop();
  const suggestedQuestions = lastModelMessage?.suggestedQuestions || [];

  return (
    <>
      <div className={`chat-sidebar ${isChatOpen ? 'open' : 'closed'}`}>

        {/* HEADER: Two-Row Layout */}
        <div className="chat-header">

          {/* ROW 1: Utility Bar */}
          <div className="header-controls">
            {/* LEFT: Expand */}
            <button
              onClick={toggleChatExpanded}
              className="control-btn"
              title="Expand to full view"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 3 21 3 21 9"></polyline>
                <polyline points="9 21 3 21 3 15"></polyline>
                <line x1="21" y1="3" x2="14" y2="10"></line>
                <line x1="3" y1="21" x2="10" y2="14"></line>
              </svg>
              <span>Expand</span>
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
          {activeSession ? (
            <>
              {activeSession.messages
                .filter(msg => !msg.hidden)
                .map((msg, i) => (
                  <div key={i} className={`chat-message ${msg.role}`}>
                    {msg.role === 'model' ? (
                      <MarkdownContent content={msg.content} />
                    ) : (
                      msg.content
                    )}
                  </div>
                ))}

              {isChatLoading && (
                <div className="typing-indicator">
                  <div className="typing-dot" style={{ animationDelay: '0ms' }} />
                  <div className="typing-dot" style={{ animationDelay: '150ms' }} />
                  <div className="typing-dot" style={{ animationDelay: '300ms' }} />
                </div>
              )}

              {!isChatLoading && suggestedQuestions.length > 0 && (
                <SuggestedQuestions questions={suggestedQuestions} />
              )}
            </>
          ) : (
            <div className="chat-empty-state">
              <p>Click "Explore" on any topic to start a conversation.</p>
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
              placeholder={`Ask about ${activeSession?.nodeTitle || 'a topic'}...`}
              className="chat-input"
              disabled={!activeSession}
            />
            <button
              type="submit"
              disabled={isChatLoading || !input.trim() || !activeSession}
              className="chat-send-btn"
              aria-label="Send Message"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      {/* Expanded View (Portal) */}
      <ChatExpanded />
    </>
  );
}
