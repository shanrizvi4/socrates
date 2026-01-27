import { Node } from "@/types/graph";
import { useState, useRef } from "react";
import { HoverCard, Position } from "./HoverCard";
import { AnimatePresence } from "framer-motion";
import { useGraphStore } from "@/lib/store";
import { MessageCircle } from "lucide-react"; 

interface NodeCardProps {
  node: Node;
  isActive: boolean;
  isSiblingActive: boolean;
  isLoading?: boolean; 
  onClick: () => void;
}

export function NodeCard({ node, isActive, isSiblingActive, isLoading, onClick }: NodeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<Position>('top');
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { triggerChat } = useGraphStore();

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setAnchorRect(rect); 
      
      const viewportWidth = window.innerWidth;
      // Matches the width of the card + some safety buffer
      const POPUP_WIDTH = 450; 

      const cardCenterX = rect.left + (rect.width / 2);
      const isRightSide = cardCenterX > (viewportWidth / 2);

      // --- SIMPLIFIED LOGIC (Restored) ---
      // 1. Prefer Side (Left/Right) if it fits width-wise.
      // 2. We trust HoverCard.tsx to handle vertical clamping.
      let bestPos: Position = 'bottom'; 

      if (isRightSide) {
        // Card on Right -> Try Left
        if (rect.left > POPUP_WIDTH) bestPos = 'left';
        else bestPos = 'bottom'; 
      } else {
        // Card on Left -> Try Right
        if ((viewportWidth - rect.right) > POPUP_WIDTH) bestPos = 'right';
        else bestPos = 'bottom';
      }

      setPosition(bestPos);
    }
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  // Base classes
  const classes = ["node-card"];
  if (isActive) classes.push("active");
  else if (isSiblingActive) classes.push("sibling-active");
  if (isLoading) classes.push("loading");

  return (
    <div 
      ref={cardRef}
      className={classes.join(" ")} 
      onClick={onClick} 
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`card-content ${isHovered ? 'hovered' : ''}`}>
        <h3>{node.title}</h3>
        <p>{node.hook}</p>
      </div>

      <button
        className={`card-explore-btn ${isHovered ? 'visible' : ''}`}
        onClick={(e) => {
          e.stopPropagation();
          triggerChat(node.id, node.title, "explore", null, true);
        }}
      >
        <MessageCircle size={14} />
        <span>Explore</span>
      </button>

      <AnimatePresence>
        {isHovered && anchorRect && !isLoading && (
          <HoverCard 
            key="hover-popup" 
            node={node} 
            position={position}
            anchorRect={anchorRect} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}