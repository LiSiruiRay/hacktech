import React from "react";

function SidePanel({ selectedNode }) {
  return (
    <div
      style={{
        width: "400px",
        backgroundColor: "#2c2c2c",
        padding: "20px",
        color: "white",
        borderLeft: "1px solid #444",
        overflowY: "auto",
        height: "100vh", // Fixed height
        position: "fixed", // Changed to fixed
        right: 0, // Align to right
        top: 0, // Align to top
        boxShadow: "-2px 0 10px rgba(0, 0, 0, 0.3)",
        zIndex: 1000, // Ensure panel stays on top
      }}
    >
      <h2 style={{ marginTop: 0 }}>Node Information</h2>
      {selectedNode ? (
        <div>
          <h3 style={{ color: "#4CAF50" }}>Label: {selectedNode.label}</h3>
          <h4 style={{ color: "#888" }}>Properties:</h4>
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              backgroundColor: "#1a1a1a",
              padding: "15px",
              borderRadius: "4px",
              border: "1px solid #444",
              fontSize: "14px",
              margin: "10px 0",
            }}
          >
            {JSON.stringify(selectedNode.properties, null, 2)}
          </pre>
        </div>
      ) : (
        <p style={{ color: "#888" }}>
          Hover over or click a node to view its details
        </p>
      )}
    </div>
  );
}

export default SidePanel;