"use client";

import { useGraphStore, getRootNodes } from "@/lib/store";
import { NodeCard } from "./NodeCard";
import { useEffect, useState } from "react";
import { Node } from "@/types/graph";

export default function GraphView() {
  // CRITICAL FIX: We subscribe to 'nodeMap' so the component re-renders
  // instantly when the API finishes and adds new nodes.
  const { activePath, selectNode, getNodeChildren, nodeMap } = useGraphStore();
  const [rows, setRows] = useState<Node[][]>([]);

  useEffect(() => {
    const newRows: Node[][] = [];

    // Row 0: Always the Roots
    newRows.push(getRootNodes());

    // Subsequent Rows: The children of the selected nodes
    activePath.forEach((nodeId) => {
      // Since we added [nodeMap] to the dependencies below, 
      // this runs again as soon as the API updates the store.
      const children = getNodeChildren(nodeId);
      if (children.length > 0) {
        newRows.push(children);
      }
    });

    setRows(newRows);
  }, [activePath, getNodeChildren, nodeMap]); // <--- The Fix: Watch for data changes

  return (
    <div className="graph-container">      
      <div className="graph-rows-wrapper">
        {rows.map((nodes, depth) => (
          <div key={depth} className="graph-row">
            {nodes.map((node) => {
              const isActive = activePath[depth] === node.id;
              const isSiblingActive = activePath[depth] !== undefined;

              return (
                <NodeCard
                  key={node.id}
                  node={node}
                  isActive={isActive}
                  isSiblingActive={isSiblingActive}
                  onClick={() => selectNode(node.id, depth)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}