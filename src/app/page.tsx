"use client";

import { useGraphStore } from "@/lib/store";
import GraphView from "@/components/GraphView";
import { ChatSidebar } from "@/components/ChatSidebar";
import "../styles/chat.css";

export default function Page() {
  const { isChatOpen } = useGraphStore();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#58604B]">

      <ChatSidebar />

      <div
        className={`
          absolute top-0 bottom-0 right-0
          transition-all duration-300 ease-in-out
          ${isChatOpen ? 'left-[500px]' : 'left-0'}
        `}
      >
        <div className="w-full h-full overflow-auto scroll-smooth">
          <GraphView />
        </div>
      </div>
    </div>
  );
}
