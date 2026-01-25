import { Node } from "@/types/graph";
import { motion } from "framer-motion"; 
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { useGraphStore } from "@/lib/store";
import "../styles/popups.css";

export type Position = 'top' | 'bottom' | 'left' | 'right';

interface HoverCardProps {
  node: Node;
  position: Position;
  anchorRect: DOMRect | null; 
}

export function HoverCard({ node, position, anchorRect }: HoverCardProps) {
  const { triggerChat } = useGraphStore(); 
  const description = node.popup_data?.description || node.hook;
  const questions = node.popup_data?.questions || [];
  
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !anchorRect) return null;

  // --- LAYOUT LOGIC ---
  const getLayoutStyles = () => {
    const gap = 15; 
    const margin = 20; 
    const viewportHeight = window.innerHeight;
    const EST_HEIGHT = 550; 

    const styles: React.CSSProperties = {
      position: 'fixed',
      zIndex: 99999, 
      pointerEvents: 'auto',
    };

    const getSideTop = () => {
      let top = anchorRect.top;
      if (top + EST_HEIGHT > viewportHeight - margin) {
        top = viewportHeight - EST_HEIGHT - margin;
      }
      if (top < margin) {
        top = margin;
      }
      return top;
    };

    switch (position) {
      case 'top':
        styles.top = anchorRect.top - gap;
        styles.left = anchorRect.left + (anchorRect.width / 2);
        break;
      case 'bottom':
        styles.top = anchorRect.bottom + gap;
        styles.left = anchorRect.left + (anchorRect.width / 2);
        break;
      case 'left':
        styles.top = getSideTop();
        styles.left = anchorRect.left - gap;
        break;
      case 'right':
        styles.top = getSideTop();
        styles.left = anchorRect.right + gap;
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

  return createPortal(
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
      {/* 1. HEADER */}
      <div className="hover-card__header">
        <p className="hover-card__desc">{description}</p>
      </div>

      {/* 2. QUESTIONS (No Title) */}
      <div className="hover-card__questions-list">
        {questions.map((q, i) => (
          <button 
            key={i} 
            className="hover-card__question-btn"
            onClick={(e) => {
              e.stopPropagation();
              triggerChat(node.title, "context", q);
            }}
          >
            <span className="question-text">{q}</span>
            <svg className="question-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        ))}
      </div>

      {/* 3. FOOTER */}
      <div className="hover-card__footer">
        <button 
          className="hover-card__main-action"
          onClick={(e) => {
            e.stopPropagation();
            triggerChat(node.title, "general context");
          }}
        >
          {/* Spark Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
          <span>Explore Topic</span>
        </button>
      </div>

    </motion.div>,
    document.body
  );
}