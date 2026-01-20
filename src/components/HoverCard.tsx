import { Node } from "@/types/graph";
import { motion, Variants, AnimatePresence } from "framer-motion";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export type Position = 'top' | 'bottom' | 'left' | 'right';

interface HoverCardProps {
  node: Node;
  position: Position;
  anchorRect: DOMRect | null; // NEW: We need the exact coordinates of the parent
}

export function HoverCard({ node, position, anchorRect }: HoverCardProps) {
  const description = node.popup_data?.description || node.hook;
  const questions = node.popup_data?.questions || [];
  
  // Ensure we are on the client (Next.js SSR safety)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !anchorRect) return null;

  // Calculate Fixed Coordinates based on the parent's position on screen
  const getStyle = () => {
    const gap = 15; // Space between card and popup
    const styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999, // Nothing stops this now
      pointerEvents: 'auto',
    };

    switch (position) {
      case 'top':
        styles.top = anchorRect.top - gap;
        styles.left = anchorRect.left + (anchorRect.width / 2);
        styles.transform = 'translate(-50%, -100%)';
        break;
      case 'bottom':
        styles.top = anchorRect.bottom + gap;
        styles.left = anchorRect.left + (anchorRect.width / 2);
        styles.transform = 'translate(-50%, 0)';
        break;
      case 'left':
        styles.top = anchorRect.top + (anchorRect.height / 2);
        styles.left = anchorRect.left - gap;
        styles.transform = 'translate(-100%, -50%)';
        break;
      case 'right':
        styles.top = anchorRect.top + (anchorRect.height / 2);
        styles.left = anchorRect.right + gap;
        styles.transform = 'translate(0, -50%)';
        break;
    }
    return styles;
  };

  const sidebarVariants: Variants = {
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
      className="hover-card" // Removed modifier classes (--top, etc) since we use inline styles now
      variants={sidebarVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      style={{
        ...getStyle(),
        transformOrigin: "center center" 
      }}
    >
      <div className="hover-card__header-line" />
      <h4 className="hover-card__title">{node.title}</h4>
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

  // TELEPORT: Render this component into the <body> tag
  return createPortal(content, document.body);
}