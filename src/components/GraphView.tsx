"use client";

import { useGraphStore, getRootNodes } from "@/lib/store";
import { NodeCard } from "./NodeCard";
import { useEffect, useState, useRef } from "react";
import { Node } from "@/types/graph";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Compass, Loader2 } from "lucide-react";

interface RowData {
  parentId: string | null;
  nodes: Node[];
}

const MAX_DOTS = 5;

function getVisibleDots(current: number, total: number) {
  // current is 0-indexed page index
  if (total <= MAX_DOTS) {
    return Array.from({ length: total }, (_, i) => ({
      index: i,
      size: i === current ? 'active' as const : 'normal' as const
    }));
  }

  // Sliding window centered on active dot
  let start = current - Math.floor(MAX_DOTS / 2);
  start = Math.max(0, Math.min(start, total - MAX_DOTS));

  return Array.from({ length: MAX_DOTS }, (_, i) => {
    const index = start + i;
    let size: 'active' | 'normal' | 'small' = 'normal';
    if (index === current) size = 'active';
    else if (i === 0 && start > 0) size = 'small';
    else if (i === MAX_DOTS - 1 && start + MAX_DOTS < total) size = 'small';
    return { index, size };
  });
}

export default function GraphView() {
  const {
    activePath,
    selectNode,
    getVisibleChildren,
    nodeMap,
    nodePageIndex,
    setNodePage,
    getNodePageInfo,
    generateMoreChildren,
    fetchingIds,
    isLoading
  } = useGraphStore();

  const [rows, setRows] = useState<RowData[]>([]);
  const lastRowRef = useRef<HTMLDivElement>(null);
  const prevRowCountRef = useRef(0);

  useEffect(() => {
    const newRows: RowData[] = [];

    // Row 0: Always the Roots (no pagination for roots)
    newRows.push({ parentId: null, nodes: getRootNodes() });

    // Subsequent Rows: The visible children of the selected nodes
    activePath.forEach((nodeId) => {
      const children = getVisibleChildren(nodeId);
      if (children.length > 0) {
        newRows.push({ parentId: nodeId, nodes: children });
      }
    });

    setRows(newRows);
  }, [activePath, getVisibleChildren, nodeMap, nodePageIndex]);

  // Auto-scroll: when a new row appears below the viewport, scroll it into view
  useEffect(() => {
    if (rows.length > prevRowCountRef.current && rows.length > 1) {
      requestAnimationFrame(() => {
        const el = lastRowRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        if (rect.bottom > window.innerHeight) {
          el.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }
      });
    }
    prevRowCountRef.current = rows.length;
  }, [rows.length]);

  const handlePagePrev = (nodeId: string) => {
    const { current } = getNodePageInfo(nodeId);
    if (current > 1) {
      setNodePage(nodeId, current - 2);
    }
  };

  const handlePageNext = (nodeId: string) => {
    const { current, total } = getNodePageInfo(nodeId);
    if (current < total) {
      setNodePage(nodeId, current);
    }
  };

  const handleDotClick = (nodeId: string, pageIndex: number) => {
    setNodePage(nodeId, pageIndex);
  };

  const handleGenerateMore = (nodeId: string) => {
    generateMoreChildren(nodeId);
  };

  return (
    <div className={`graph-container${rows.length > 1 ? ' has-depth' : ''}`}>
      <div className="graph-rows-wrapper">
        {rows.map(({ parentId, nodes }, depth) => {
          const pageInfo = parentId ? getNodePageInfo(parentId) : null;
          const isFetching = parentId ? fetchingIds.has(parentId) : false;
          const isRoot = parentId === null;
          const isDeepestRow = depth === rows.length - 1;
          const parentTitle = parentId ? nodeMap[parentId]?.title : null;

          return (
            <div key={depth} className="graph-row-container" ref={depth === rows.length - 1 ? lastRowRef : undefined}>
              {/* Cards */}
              <div className="graph-row">
                <AnimatePresence mode="popLayout">
                  {nodes.map((node, i) => {
                    const isActive = activePath[depth] === node.id;
                    const isSiblingActive = activePath[depth] !== undefined;

                    return (
                      <motion.div
                        key={node.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        transition={{
                          duration: 0.3,
                          delay: i * 0.05,
                          ease: [0.2, 0.8, 0.2, 1]
                        }}
                      >
                        <NodeCard
                          node={node}
                          isActive={isActive}
                          isSiblingActive={isSiblingActive}
                          isLoading={fetchingIds.has(node.id)}
                          onClick={() => selectNode(node.id, depth)}
                        />
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Arrows + dots — centered below cards, only when multiple pages */}
              {pageInfo?.hasMultiplePages && (
                <motion.div
                  className="row-nav-arrows"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3, delay: 0.2 }}
                >
                  <button
                    className="nav-arrow-btn"
                    onClick={() => handlePagePrev(parentId!)}
                    disabled={pageInfo.current <= 1}
                    title="Previous page"
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div className="nav-dots">
                    {getVisibleDots(pageInfo.current - 1, pageInfo.total).map(({ index, size }) => (
                      <button
                        key={index}
                        className={`nav-dot ${size}`}
                        onClick={() => handleDotClick(parentId!, index)}
                        title={`Page ${index + 1}`}
                      />
                    ))}
                  </div>

                  <button
                    className="nav-arrow-btn"
                    onClick={() => handlePageNext(parentId!)}
                    disabled={pageInfo.current >= pageInfo.total}
                    title="Next page"
                  >
                    <ChevronRight size={16} />
                  </button>
                </motion.div>
              )}

              {/* Zone 2: Explore more — only on the deepest non-root row */}
              {!isRoot && isDeepestRow && (
                <div className="row-explore-more">
                  <AnimatePresence mode="wait">
                    {isFetching ? (
                      <motion.div
                        key="loading"
                        className="explore-more-loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Loader2 size={16} className="spin" />
                        <span>Generating...</span>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="button"
                        className="explore-more-btn"
                        onClick={() => handleGenerateMore(parentId!)}
                        disabled={isLoading}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Compass size={14} />
                        <span>More under <strong>{parentTitle}</strong></span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          );
        })}
      </div>


    </div>
  );
}
