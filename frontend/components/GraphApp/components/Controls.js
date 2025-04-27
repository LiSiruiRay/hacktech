import React from "react";

function Controls({
  displayMode,
  setDisplayMode,
  nodeLimit,
  setNodeLimit,
  linkDistance,
  setLinkDistance,
  graphData,
  fetchGraphData,
  isSearchActive,
}) {
  return (
    <div
      style={{ position: "absolute", left: "10px", top: "60px", zIndex: 900 }}
    >
      {/* Display mode buttons */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          marginBottom: "15px",
        }}
      >
        <button
          onClick={() => setDisplayMode("hover")}
          style={{
            padding: "8px 16px",
            backgroundColor: displayMode === "hover" ? "#4CAF50" : "#2c2c2c",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Hover Mode
        </button>
        <button
          onClick={() => setDisplayMode("side")}
          style={{
            padding: "8px 16px",
            backgroundColor: displayMode === "side" ? "#4CAF50" : "#2c2c2c",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          Side Panel Mode
        </button>
      </div>

      {/* Add Node Limit Slider */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "4px",
          color: "white",
          width: "200px",
          marginBottom: "10px",
        }}
      >
        <label htmlFor="nodeLimit">
          Node Limit: {nodeLimit}{" "}
          {graphData.nodes.length > 0
            ? `(${graphData.nodes.length} nodes loaded)`
            : ""}
          {isSearchActive ? " - Search Mode" : ""}
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            id="nodeLimit"
            type="range"
            min="10"
            max="1967"
            step="10"
            value={nodeLimit}
            onChange={(e) => setNodeLimit(parseInt(e.target.value))}
            style={{ width: "150px" }}
          />
          <button
            onClick={() => fetchGraphData(nodeLimit)}
            style={{
              padding: "4px 8px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
            }}
          >
            Apply
          </button>
        </div>
      </div>

      {/* Add Link Distance Slider */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "5px",
          backgroundColor: "rgba(0,0,0,0.7)",
          padding: "10px",
          borderRadius: "4px",
          color: "white",
          width: "200px",
        }}
      >
        <label htmlFor="linkDistance">Node Spacing: {linkDistance}</label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            id="linkDistance"
            type="range"
            min="50"
            max="300"
            step="10"
            value={linkDistance}
            onChange={(e) => setLinkDistance(parseInt(e.target.value))}
            style={{ width: "150px" }}
          />
        </div>
      </div>
    </div>
  );
}

export default Controls;
