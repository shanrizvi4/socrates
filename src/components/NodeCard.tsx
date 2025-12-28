import { Node } from "@/types/graph";

interface NodeCardProps {
  node: Node;
  isActive: boolean;
  isSiblingActive: boolean;
  onClick: () => void;
}

export function NodeCard({ node, isActive, isSiblingActive, onClick }: NodeCardProps) {
  
  // Determine which CSS class to add based on state
  let stateClass = "neutral";
  if (isActive) {
    stateClass = "active";
  } else if (isSiblingActive) {
    stateClass = "sibling-active";
  }

  return (
    <div 
      onClick={onClick} 
      className={`node-card ${stateClass}`}
    >
      <div className="card-content">
        <h3>{node.title}</h3>
        <p>{node.hook}</p>
      </div>
    </div>
  );
}