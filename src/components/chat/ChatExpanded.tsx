import { useGraphStore } from "@/lib/store";
import { useShallow } from 'zustand/react/shallow';
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChatList } from "./ChatList";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { MarkdownContent } from "./MarkdownContent";
import "../../styles/chat.css";

export function ChatExpanded() {
  const {
    isChatExpanded,
    chatSessions,
    activeChatId,
    isChatLoading,
    toggleChatExpanded,
    sendMessage
  } = useGraphStore(
    useShallow((state) => ({
      isChatExpanded: state.isChatExpanded,
      chatSessions: state.chatSessions,
      activeChatId: state.activeChatId,
      isChatLoading: state.isChatLoading,
      toggleChatExpanded: state.toggleChatExpanded,
      sendMessage: state.sendMessage
    }))
  );

  const [input, setInput] = useState("");
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  const activeSession = activeChatId ? chatSessions[activeChatId] : null;

  // Only auto-scroll if there's more than one message (not initial explore)
  const hasUserMessage = activeSession?.messages.some(m => m.role === 'user');

  useEffect(() => {
    if (scrollRef.current && hasUserMessage) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [activeSession?.messages, isChatLoading, hasUserMessage]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isChatLoading) return;
    sendMessage(input);
    setInput("");
  };

  if (!mounted || !isChatExpanded) return null;

  // Find last model message with suggested questions
  const lastModelMessage = activeSession?.messages
    .filter(m => m.role === 'model')
    .pop();
  const suggestedQuestions = lastModelMessage?.suggestedQuestions || [];

  return createPortal(
    <div className="chat-expanded-overlay">
      {/* Left Panel: Chat List */}
      <div className="chat-list-panel">
        <div className="chat-list-header">
          <h3>Conversations</h3>
        </div>
        <ChatList />
      </div>

      {/* Right Panel: Main Chat */}
      <div className="chat-main-panel">
        {/* Header */}
        <div className="chat-expanded-header">
          <h2 className="chat-expanded-title">
            {activeSession?.nodeTitle || "Select a conversation"}
          </h2>
          <button
            className="control-btn"
            onClick={toggleChatExpanded}
          >
            <span>Back to Graph</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages chat-messages-expanded" ref={scrollRef}>
          {activeSession ? (
            <>
              {activeSession.messages.map((msg, i) => (
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
              <p>Select a conversation from the list to continue exploring.</p>
            </div>
          )}
        </div>

        {/* Input */}
        {activeSession && (
          <form onSubmit={handleSubmit} className="chat-input-area">
            <div className="input-wrapper">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask about ${activeSession.nodeTitle}...`}
                className="chat-input"
              />
              <button
                type="submit"
                disabled={isChatLoading || !input.trim()}
                className="chat-send-btn"
                aria-label="Send Message"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
