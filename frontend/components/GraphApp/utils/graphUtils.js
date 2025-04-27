// Helper functions for graph visualization

// Update the abbreviateText function to adapt based on node size
export const abbreviateText = (text, radius) => {
  if (!text) return "";
  // Calculate max length based on node radius
  // This allows larger nodes to show more text
  const maxLength = Math.max(6, Math.floor(radius * 0.8));

  return text.length > maxLength
    ? text.substring(0, maxLength - 3) + "..."
    : text;
};

// Get color based on node label
export const getNodeColor = (node, selectedNode) => {
  // console.log("getNodeColor:::", node);
  const nodeLabel = node.properties.description;
  switch (nodeLabel) {
    case "person":
      return "#FF6B6B"; // coral red
    case "category":
      return "#4ECDC4"; // turquoise
    case "geo":
      return "#45B7D1"; // blue
    case "event":
      return "#96CEB4"; // sage green
    case "UNKNOWN":
      return "#FFBE0B"; // yellow
    case "index":
      return "#9B5DE5"; // purple
    case "organization":
      return "#FF6B6B"; // coral red
    default:
      return selectedNode?.id === node.id ? "#ff4444" : "#4CAF50"; // default or selected color
  }
};

// Calculate node radius based on inDegree
// export const calculateNodeRadius = (node) => {
//   const baseRadius = 10;
//   const minRadius = baseRadius;
//   const maxRadius = baseRadius * 3;
//   return node.inDegree
//     ? minRadius + Math.log(node.inDegree + 1) * 3
//     : minRadius;
// };

// Modify or add this function in your graphUtils.js
export const calculateNodeRadius = (node) => {
  const baseRadius = 10;

  // Use the total degree (all connections) for node sizing
  // If degree is available, use it; otherwise, fall back to inDegree for compatibility
  const connections = node.degree || node.inDegree || 0;

  // Logarithmic scaling to prevent extremely large nodes while still showing differences
  return baseRadius + Math.log(connections + 1) * 8;
};
