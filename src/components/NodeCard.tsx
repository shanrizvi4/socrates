import { Node } from "@/types/graph";
import { useState, useRef, useLayoutEffect } from "react";
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
  const titleRef = useRef<HTMLHeadingElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { triggerChat } = useGraphStore();

  // Auto-shrink title font so text fits with breathing room on each side
  useLayoutEffect(() => {
    const el = titleRef.current;
    if (!el) return;
    el.style.fontSize = '';
    let size = 1.15;

    // Capture the card's content width while h3 is width:100%
    const target = el.clientWidth - 10; // 8px breathing room per side

    // Temporarily release width so scrollWidth reflects actual text width
    el.style.width = 'auto';
    while (el.scrollWidth > target && size > 0.75) {
      size -= 0.05;
      el.style.fontSize = `${size}rem`;
    }
    el.style.width = ''; // restore width:100% from CSS
  }, [node.title]);

  const handleMouseEnter = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (cardRef.current) {
      const rect = cardRef.current.getBoundingClientRect();
      setAnchorRect(rect); 
      
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      
      // Dimensions
      const POPUP_WIDTH = 450; 
      const POPUP_HEIGHT = 550; // Safety height for the card

      const cardCenterX = rect.left + (rect.width / 2);
      const isRightSide = cardCenterX > (viewportWidth / 2);

      // 1. Horizontal Preference (Left/Right)
      let bestPos: Position = 'bottom'; 

      if (isRightSide) {
        // Try Left
        if (rect.left > POPUP_WIDTH) bestPos = 'left';
        else bestPos = 'bottom'; 
      } else {
        // Try Right
        if ((viewportWidth - rect.right) > POPUP_WIDTH) bestPos = 'right';
        else bestPos = 'bottom';
      }

      // 2. Vertical Safety Check (The Missing Fix)
      // If we decided on 'bottom', we MUST check if it actually fits.
      if (bestPos === 'bottom') {
         const spaceBelow = viewportHeight - rect.bottom;
         if (spaceBelow < POPUP_HEIGHT) {
            // Not enough room below? Flip to TOP.
            bestPos = 'top';
         }
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
        <h3 ref={titleRef}>{node.title}</h3>
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