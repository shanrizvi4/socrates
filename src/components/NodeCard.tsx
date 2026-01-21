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
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setAnchorRect(rect); 

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Dimensions + Safety Buffer
      const POPUP_HEIGHT = 450; 
      const POPUP_WIDTH = 480; 

      const cardCenterX = rect.left + (rect.width / 2);
      const cardCenterY = rect.top + (rect.height / 2);
      const isRightSide = cardCenterX > (viewportWidth / 2);

      // --- SMART POSITIONING LOGIC ---
      
      // 1. Vertical Safety Check:
      // Side popups are centered. Do we have room for half the popup above AND below?
      const fitsVerticallyCentered = 
        (cardCenterY - (POPUP_HEIGHT / 2) > 0) &&           // Room above center
        (cardCenterY + (POPUP_HEIGHT / 2) < viewportHeight); // Room below center

      let bestPos: Position = 'bottom';

      if (isRightSide) {
        // PREFERENCE: LEFT
        const fitsLeft = rect.left > POPUP_WIDTH;
        
        if (fitsLeft && fitsVerticallyCentered) {
          bestPos = 'left';
        } else {
          // Fallback: Compare space Top vs Bottom
          const spaceTop = rect.top;
          const spaceBottom = viewportHeight - rect.bottom;
          // If we have more room on top (e.g. card is at bottom), go TOP.
          bestPos = spaceTop > spaceBottom ? 'top' : 'bottom';
        }
      } else {
        // PREFERENCE: RIGHT
        const fitsRight = (viewportWidth - rect.right) > POPUP_WIDTH;
        
        if (fitsRight && fitsVerticallyCentered) {
          bestPos = 'right';
        } else {
          // Fallback: Compare space Top vs Bottom
          const spaceTop = rect.top;
          const spaceBottom = viewportHeight - rect.bottom;
          bestPos = spaceTop > spaceBottom ? 'top' : 'bottom';
        }
      }
      
      // Final Safety: If we chose 'bottom' but there's no room, force 'top'
      if (bestPos === 'bottom' && (viewportHeight - rect.bottom < POPUP_HEIGHT)) {
         bestPos = 'top';
      }
      // Final Safety: If we chose 'top' but there's no room, force 'bottom'
      if (bestPos === 'top' && (rect.top < POPUP_HEIGHT)) {
         bestPos = 'bottom';
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
            anchorRect={anchorRect} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}