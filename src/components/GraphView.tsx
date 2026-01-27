"use client";

import { useGraphStore, getRootNodes } from "@/lib/store";
import { NodeCard } from "./NodeCard";
import { useEffect, useState } from "react";
import { Node } from "@/types/graph";
import { ChevronUp, ChevronDown, Plus } from "lucide-react";

interface RowData {
  parentId: string | null;
  nodes: Node[];
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

  const handlePageUp = (nodeId: string) => {
    const { current } = getNodePageInfo(nodeId);
    if (current > 1) {
      setNodePage(nodeId, current - 2); // current is 1-indexed, setNodePage is 0-indexed
    }
  };

  const handlePageDown = (nodeId: string) => {
    const { current, total } = getNodePageInfo(nodeId);
    if (current < total) {
      setNodePage(nodeId, current); // current is 1-indexed, so current = next 0-indexed
    }
  };

  const handleGenerateMore = (nodeId: string) => {
    generateMoreChildren(nodeId);
  };

  return (
    <div className="graph-container">
      <div className="graph-rows-wrapper">
        {rows.map(({ parentId, nodes }, depth) => {
          const pageInfo = parentId ? getNodePageInfo(parentId) : null;
          const showPagination = parentId && pageInfo && pageInfo.hasChildren;
          const isFetching = parentId ? fetchingIds.has(parentId) : false;

          return (
            <div key={depth} className="graph-row-container">
              <div className="graph-row">
                {nodes.map((node) => {
                  const isActive = activePath[depth] === node.id;
                  const isSiblingActive = activePath[depth] !== undefined;

                  return (
                    <NodeCard
                      key={node.id}
                      node={node}
                      isActive={isActive}
                      isSiblingActive={isSiblingActive}
                      isLoading={fetchingIds.has(node.id)}
                      onClick={() => selectNode(node.id, depth)}
                    />
                  );
                })}
              </div>

              {/* Pagination Controls - only for non-root rows */}
              {parentId && showPagination && (
                <div className="row-pagination">
                  {/* Up Arrow */}
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageUp(parentId)}
                    disabled={pageInfo.current <= 1}
                    title="Previous set"
                  >
                    <ChevronUp size={18} />
                  </button>

                  {/* Page Indicator */}
                  <span className="pagination-indicator">
                    {pageInfo.current}/{pageInfo.total}
                  </span>

                  {/* Down Arrow */}
                  <button
                    className="pagination-btn"
                    onClick={() => handlePageDown(parentId)}
                    disabled={pageInfo.current >= pageInfo.total}
                    title="Next set"
                  >
                    <ChevronDown size={18} />
                  </button>

                  {/* Generate More Button */}
                  <button
                    className="pagination-btn generate-more-btn"
                    onClick={() => handleGenerateMore(parentId)}
                    disabled={isFetching || isLoading}
                    title="Generate more topics"
                  >
                    <Plus size={18} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
