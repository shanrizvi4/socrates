import { Node } from "@/types/graph";
import { useState, useRef } from "react";
import { HoverCard, Position } from "./HoverCard";
import { AnimatePresence } from "framer-motion"; 

interface NodeCardProps {
  node: Node;
  isActive: boolean;
  isSiblingActive: boolean;
  onClick: () => void;
}

export function NodeCard({ node, isActive, isSiblingActive, onClick }: NodeCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<Position>('top');
  
  // NEW: Store the exact screen coordinates of the card
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (cardRef.current) {
      // 1. Get the screen position
      const rect = cardRef.current.getBoundingClientRect();
      setAnchorRect(rect); // Save it for the Portal

      // 2. Decide placement (Top/Bottom/etc)
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const POPUP_HEIGHT = 420; 
      const POPUP_WIDTH = 400; 

      const spaceTop = rect.top;
      const spaceBottom = viewportHeight - rect.bottom;
      const spaceRight = viewportWidth - rect.right;
      const spaceLeft = rect.left;

      if (spaceTop > POPUP_HEIGHT) setPosition('top');
      else if (spaceBottom > POPUP_HEIGHT) setPosition('bottom');
      else if (spaceRight > POPUP_WIDTH) setPosition('right');
      else if (spaceLeft > POPUP_WIDTH) setPosition('left');
      else setPosition('bottom');
    }
    
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 100);
  };

  let stateClass = "neutral";
  if (isActive) stateClass = "active";
  else if (isSiblingActive) stateClass = "sibling-active";

  return (
    <div 
      ref={cardRef}
      className={`node-card ${stateClass}`} 
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="card-content">
        <h3>{node.title}</h3>
        <p>{node.hook}</p>
      </div>

      <AnimatePresence>
        {isHovered && anchorRect && (
          <HoverCard 
            key="hover-popup" 
            node={node} 
            position={position}
            anchorRect={anchorRect} // Pass coordinates
          />
        )}
      </AnimatePresence>
    </div>
  );
}