import { useGraphStore } from "@/lib/store";
import { useShallow } from 'zustand/react/shallow';

export function ChatList() {
  const { chatSessions, chatListOrder, activeChatId, switchChat } = useGraphStore(
    useShallow((state) => ({
      chatSessions: state.chatSessions,
      chatListOrder: state.chatListOrder,
      activeChatId: state.activeChatId,
      switchChat: state.switchChat
    }))
  );

  if (chatListOrder.length === 0) {
    return (
      <div className="chat-list-empty">
        <p>No conversations yet.</p>
        <p className="chat-list-hint">Click "Explore" on any topic to start.</p>
      </div>
    );
  }

  return (
    <div className="chat-list">
      {chatListOrder.map((chatId) => {
        const session = chatSessions[chatId];
        if (!session) return null;

        const isActive = chatId === activeChatId;
        const lastMessage = session.messages[session.messages.length - 1];
        const preview = lastMessage
          ? lastMessage.content.substring(0, 60) + (lastMessage.content.length > 60 ? '...' : '')
          : 'New conversation';

        return (
          <button
            key={chatId}
            className={`chat-list-item ${isActive ? 'active' : ''}`}
            onClick={() => switchChat(chatId)}
          >
            <span className="chat-list-title">{session.nodeTitle}</span>
            <span className="chat-list-preview">{preview}</span>
          </button>
        );
      })}
    </div>
  );
}
