import React, { useState, useEffect } from "react";
import ForceGraph2D from "react-force-graph-2d";
import * as d3 from "d3";
import {
  abbreviateText,
  getNodeColor,
  calculateNodeRadius,
} from "../utils/graphUtils";

function GraphView({
  graphData,
  displayMode,
  selectedNode,
  linkDistance,
  onNodeClick,
  onNodeHover,
}) {
  const [forceRef, setForceRef] = useState(null);

  // Hook to update force simulation when linkDistance changes
  useEffect(() => {
    if (forceRef) {
      // Restart simulation with new distance
      forceRef.d3Force("link").distance(linkDistance);

      // Remove the gravity force which is causing issues
      if (forceRef.d3Force("gravity")) {
        forceRef.d3Force("gravity", null);
      }

      forceRef.d3ReheatSimulation();
    }
  }, [linkDistance, forceRef]);

  return (
    <ForceGraph2D
      ref={setForceRef}
      graphData={graphData}
      nodeLabel={
        displayMode === "hover"
          ? (node) => `${node.label}: ${JSON.stringify(node.properties || {})}`
          : null
      }
      linkLabel={(link) => link.type}
      onNodeClick={onNodeClick}
      onNodeHover={onNodeHover}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const label = node.label || "";
        const radius = calculateNodeRadius(node);

        // Calculate border width based on connections
        const connections = node.degree || node.inDegree || 0;
        const borderWidth = 1 + Math.min(4, Math.log(connections + 1) * 0.8);

        // Draw circle with border
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI, false);
        ctx.fillStyle = getNodeColor(node, selectedNode);
        ctx.fill();
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = borderWidth;
        ctx.stroke();

        // Use a consistent font size for all nodes - no scaling
        const fontSize = 5; // Fixed size for all nodes
        ctx.font = `${fontSize}px Arial`;

        // Draw abbreviated label - use name instead of label
        const nameProperty =
          node.properties?.name || node.properties?.title || node.label || "";
        // Pass radius to abbreviateText to adapt text length
        const abbreviatedLabel = abbreviateText(nameProperty, radius);
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(abbreviatedLabel, node.x, node.y);
      }}
      linkWidth={2}
      linkColor={() => "#ffffff"}
      backgroundColor="#1a1a1a"
      cooldownTicks={100}
      nodeRelSize={6}
      minZoom={0.1}
      maxZoom={5}
      linkDistance={linkDistance}
      d3Force={(d3Force) => {
        // Add collision force to prevent node overlap with larger radiusd3Force={(d3Force) => {
        d3Force
          .force(
            "collide",
            d3
              .forceCollide((node) => {
                const baseRadius = 10;
                const connections = node.degree || node.inDegree || 0;
                return baseRadius + Math.log(connections + 1) * 5 + 20;
              })
              .strength(1.0) // Even stronger collision
              .iterations(4) // More iterations for better spacing
          )
          .force(
            "charge",
            d3
              .forceManyBody()
              .strength(-10) // MUCH smaller repulsion (was -120)
              .distanceMax(50) // VERY small influence range
          )
          .force("center", d3.forceCenter())
          // Increase link strength to keep connected nodes together
          .force(
            "link",
            d3
              .forceLink()
              .id((d) => d.id)
              .strength(0.8)
          );
      }}
      enableZoomPanInteraction={true}
      enableNodeDrag={true}
      d3VelocityDecay={0.4} // Increased decay to reduce propagation of movement
      warmupTicks={100}
      linkDirectionalArrowLength={8}
      linkDirectionalArrowRelPos={(link) => {
        // Calculate target node radius
        const targetNode = graphData.nodes.find(
          (node) => node.id === link.target
        );
        if (!targetNode) return 0.95;

        // Get the radius
        const baseRadius = 10;
        const radius = targetNode.inDegree
          ? baseRadius + Math.log(targetNode.inDegree + 1) * 3
          : baseRadius;

        // Calculate position based on node size
        const distance = 30;
        const totalLinkLength = distance + radius;
        // Position the arrow at a fixed distance from the node border
        return 1 - (radius + 10) / totalLinkLength;
      }}
      linkDirectionalArrowColor={() => "#ffffff"}
      linkDirectionalArrowSize={10}
      linkDirectionalParticles={0}
      linkDirectionalParticleWidth={2}
      linkDirectionalParticleSpeed={0.005}
    />
  );
}

export default GraphView;
