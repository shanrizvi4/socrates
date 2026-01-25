"use client";

import { useGraphStore, getRootNodes } from "@/lib/store";
import { NodeCard } from "@/components/NodeCard";
import { ChatSidebar } from "@/components/ChatSidebar"; 
import { useEffect, useState, useRef } from "react";
import { Node } from "@/types/graph";
import "../styles/chat.css"; 

export default function GraphView() {
  const { activePath, selectNode, getNodeChildren, nodeMap, isChatOpen, fetchingIds } = useGraphStore();
  const [rows, setRows] = useState<Node[][]>([]);
  
  // 1. Create a ref specifically for the bottom of the content
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newRows: Node[][] = [];
    newRows.push(getRootNodes());

    activePath.forEach((nodeId) => {
      const children = getNodeChildren(nodeId);
      if (children.length > 0) {
        newRows.push(children);
      }
    });

    setRows(newRows);
  }, [activePath, getNodeChildren, nodeMap]);

  // 2. AUTO-SCROLL: Target the anchor directly
  useEffect(() => {
    if (bottomRef.current) {
      // Small timeout to allow layout paint to finish
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "end",  // Aligns bottom of element with bottom of view
          inline: "nearest" 
        });
      }, 100);
    }
  }, [rows.length]); // Triggers only when a new row is added

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
            <div className="graph-rows-wrapper">
                {rows.map((nodes, depth) => (
                <div key={depth} className="graph-row">
                    {nodes.map((node) => {
                    const isActive = activePath[depth] === node.id;
                    const isSiblingActive = activePath[depth] !== undefined;
                    const isNodeLoading = fetchingIds.has(node.id);

                    return (
                        <NodeCard
                          key={node.id}
                          node={node}
                          isActive={isActive}
                          isSiblingActive={isSiblingActive}
                          isLoading={isNodeLoading} 
                          onClick={() => selectNode(node.id, depth)}
                        />
                    );
                    })}
                </div>
                ))}
                
                {/* 3. The Scroll Anchor: This div pushes the view down */}
                <div 
                  ref={bottomRef} 
                  style={{ height: '100px', width: '100%', flexShrink: 0 }} 
                  aria-hidden="true" 
                />
            </div>
        </div>
      </div>
    </div>
  );
}