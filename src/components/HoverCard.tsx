import { Node } from "@/types/graph";
import { motion } from "framer-motion"; 
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export type Position = 'top' | 'bottom' | 'left' | 'right';

interface HoverCardProps {
  node: Node;
  position: Position;
  anchorRect: DOMRect | null; 
}

export function HoverCard({ node, position, anchorRect }: HoverCardProps) {
  const description = node.popup_data?.description || node.hook;
  const questions = node.popup_data?.questions || [];
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !anchorRect) return null;

  // 1. Layout Logic (Top/Left calculation)
  const getLayoutStyles = () => {
    const gap = 15; 
    const margin = 20; // Minimum distance from screen edge
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    
    // Estimated dimensions (Matches CSS + Safety buffer)
    const EST_HEIGHT = 550; 
    const EST_WIDTH = 450;

    const styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999, 
      pointerEvents: 'auto',
    };

    // --- VERTICAL CLAMP (For Side Popups) ---
    const getSideTop = () => {
      let top = anchorRect.top;
      // If bottom goes off screen, shift up
      if (top + EST_HEIGHT > viewportHeight - margin) {
        top = viewportHeight - EST_HEIGHT - margin;
      }
      // If top goes off screen, shift down
      if (top < margin) {
        top = margin;
      }
      return top;
    };

    // --- HORIZONTAL CLAMP (The Fix) ---
    const getClampedLeft = (baseLeft: number, mode: 'center' | 'left' | 'right') => {
      let left = baseLeft;

      if (mode === 'center') {
        // Mode: Top/Bottom (Centered)
        const leftEdge = left - (EST_WIDTH / 2);
        const rightEdge = left + (EST_WIDTH / 2);

        if (leftEdge < margin) {
             left += (margin - leftEdge); // Shift Right
        } else if (rightEdge > viewportWidth - margin) {
             left -= (rightEdge - (viewportWidth - margin)); // Shift Left
        }
      } 
      else if (mode === 'left') {
        // Mode: Left (Popup is drawn to the LEFT of this point)
        // Visual Range: [left - Width, left]
        const leftEdge = left - EST_WIDTH;
        if (leftEdge < margin) {
           // If it overflows left, force it to start at the margin
           left = margin + EST_WIDTH; 
        }
      } 
      else if (mode === 'right') {
        // Mode: Right (Popup is drawn to the RIGHT of this point)
        // Visual Range: [left, left + Width]
        const rightEdge = left + EST_WIDTH;
        if (rightEdge > viewportWidth - margin) {
           // If it overflows right, force it to end at the margin
           left = viewportWidth - margin - EST_WIDTH; 
        }
      }
      
      return left;
    };

    switch (position) {
      case 'top':
        styles.top = anchorRect.top - gap;
        // Pass center point, tell function it's centered
        styles.left = getClampedLeft(anchorRect.left + (anchorRect.width / 2), 'center');
        break;
      case 'bottom':
        styles.top = anchorRect.bottom + gap;
        styles.left = getClampedLeft(anchorRect.left + (anchorRect.width / 2), 'center');
        break;
      case 'left':
        styles.top = getSideTop();
        // Pass the anchor point, tell function it extends Left
        styles.left = getClampedLeft(anchorRect.left - gap, 'left');
        break;
      case 'right':
        styles.top = getSideTop();
        // Pass the anchor point, tell function it extends Right
        styles.left = getClampedLeft(anchorRect.right + gap, 'right');
        break;
    }
    return styles;
  };

  const getMotionValues = () => {
    switch (position) {
      case 'top':    return { x: "-50%", y: "-100%" };
      case 'bottom': return { x: "-50%", y: 0 };
      case 'left':   return { x: "-100%", y: 0 };
      case 'right':  return { x: 0,       y: 0 };
    }
  };

  const sidebarVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      transition: { type: "spring", stiffness: 300, damping: 25 } 
    },
    exit: { 
      opacity: 0, 
      scale: 0.95, 
      transition: { duration: 0.2 } 
    }
  };

  const content = (
    <motion.div 
      className="hover-card" 
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        ...getLayoutStyles(),
        ...getMotionValues(),
        transformOrigin: position === 'left' || position === 'right' ? "center top" : "center center"
      }}
    >
      {/* <h4 className="hover-card__title">{node.title}</h4> */}
      <p className="hover-card__desc">{description}</p>

      {questions.length > 0 && (
        <div className="hover-card__questions-wrapper">
          <span className="hover-card__questions-label">Explore Topic:</span>
          <ul className="hover-card__questions-list">
            {questions.map((q, i) => (
              <li key={i} className="hover-card__question-item">
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );

  return createPortal(content, document.body);
}