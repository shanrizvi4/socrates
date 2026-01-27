"use client";

import { useGraphStore } from "@/lib/store";
import GraphView from "@/components/GraphView";
import { ChatSidebar } from "@/components/ChatSidebar";
import { useEffect, useRef } from "react";
import "../styles/chat.css";

export default function Page() {
  const { isChatOpen, activePath } = useGraphStore();

  // Create a ref specifically for the bottom of the content
  const bottomRef = useRef<HTMLDivElement>(null);

  // AUTO-SCROLL: Target the anchor directly when new rows are added
  useEffect(() => {
    if (bottomRef.current) {
      // Small timeout to allow layout paint to finish
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "end",
          inline: "nearest"
        });
      }, 100);
    }
  }, [activePath.length]); // Triggers when activePath changes (new row)

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
          {/* Scroll Anchor: This div pushes the view down */}
          <div
            ref={bottomRef}
            style={{ height: '100px', width: '100%', flexShrink: 0 }}
            aria-hidden="true"
          />
        </div>
      </div>
    </div>
  );
}