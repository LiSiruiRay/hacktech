import React, { useState, useEffect } from "react";
import Controls from "./components/Controls";
import GraphView from "./components/GraphView";
import SidePanel from "./components/SidePanel";
import SearchBar from "./components/SearchBar";
import useNeo4jData from "./hooks/useNeo4jData";

function GraphViewApp() {
  const [displayMode, setDisplayMode] = useState("hover");
  const [selectedNode, setSelectedNode] = useState(null);
  const [nodeLimit, setNodeLimit] = useState(100);
  const [linkDistance, setLinkDistance] = useState(100);
  const [searchableProperties, setSearchableProperties] = useState([]);

  const [searchState, setSearchState] = useState({
    isSearchActive: false,
    query: "",
    property: "",
  });

  function findAvailableSearchProperties(nodes) {
    const propertySet = new Set();

    nodes.forEach((node) => {
      if (node.properties) {
        Object.keys(node.properties).forEach((key) => {
          if (key !== "source_id") {
            propertySet.add(key);
          }
        });
      }
    });

    return Array.from(propertySet);
  }

  // Use a ref to track if this is the initial mount
  const [isInitialMount, setIsInitialMount] = useState(true);

  const { graphData, error, isLoading, fetchGraphData, searchGraphData } =
    useNeo4jData();

  // Effect to handle initial data loading and changes to nodeLimit
  useEffect(() => {
    if (isInitialMount) {
      fetchGraphData(nodeLimit);
      setIsInitialMount(false);
    } else if (searchState.isSearchActive) {
      // If search is active and node limit changes, apply to search
      searchGraphData(searchState.query, searchState.property, nodeLimit);
    } else {
      // Otherwise fetch regular data
      fetchGraphData(nodeLimit);
    }
  }, [nodeLimit, isInitialMount]);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      const findAvailableSearchProperties = (nodes) => {
        const propertySet = new Set();
        nodes.forEach((node) => {
          if (node.properties) {
            Object.keys(node.properties).forEach((key) => {
              if (key !== "source_id") {
                propertySet.add(key);
              }
            });
          }
        });
        return Array.from(propertySet);
      };

      const availableProperties = findAvailableSearchProperties(
        graphData.nodes
      );
      console.log("Available properties in graphData:", availableProperties);
    }
  }, [graphData]);

  const handleNodeClick = (node) => {
    if (displayMode === "side") {
      setSelectedNode(node);
    }
  };

  const handleSearch = (query, property) => {
    if (query.trim()) {
      searchGraphData(query, property, nodeLimit);
      setSearchState({
        isSearchActive: true,
        query,
        property,
      });
    } else {
      setSearchState({
        isSearchActive: false,
        query: "",
        property: "",
      });
      fetchGraphData(nodeLimit);
    }
  };

  // This function will apply the current limits to either search or regular graph
  const applyCurrentSettings = () => {
    if (searchState.isSearchActive) {
      searchGraphData(searchState.query, searchState.property, nodeLimit);
    } else {
      fetchGraphData(nodeLimit);
    }
  };

  // Handle returning to full graph
  const handleBackToFullGraph = () => {
    setSearchState({
      isSearchActive: false,
      query: "",
      property: "",
    });
    fetchGraphData(nodeLimit);
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "150vh",
        background: "#1a1a1a",
        display: "flex",
        position: "relative",
      }}
    >
      <div
        style={{
          width: displayMode === "side" ? "calc(100% - 400px)" : "100%",
          position: "relative",
        }}
      >
        <h1 style={{ position: "absolute", margin: "10px", color: "white" }}>
          Neo4j Graph Visualization
        </h1>

        <SearchBar
          onSearch={handleSearch}
          searchableProperties={searchableProperties}
        />

        <Controls
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          nodeLimit={nodeLimit}
          setNodeLimit={setNodeLimit}
          linkDistance={linkDistance}
          setLinkDistance={setLinkDistance}
          graphData={graphData}
          fetchGraphData={applyCurrentSettings}
          isSearchActive={searchState.isSearchActive}
        />

        {isLoading ? (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
            }}
          >
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
            }}
          >
            <p style={{ color: "red" }}>{error}</p>
            <button
              onClick={handleBackToFullGraph}
              style={{
                padding: "8px 16px",
                backgroundColor: "#4CAF50",
                color: "white",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer",
                marginTop: "15px",
              }}
            >
              Back to Full Graph
            </button>
          </div>
        ) : graphData.nodes.length === 0 ? (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "white",
            }}
          >
            <p>No data found</p>
          </div>
        ) : (
          <GraphView
            graphData={graphData}
            displayMode={displayMode}
            selectedNode={selectedNode}
            linkDistance={linkDistance}
            onNodeClick={handleNodeClick}
            onNodeHover={(node) => {
              if (displayMode === "side" && node) {
                setSelectedNode(node);
              }
            }}
          />
        )}
      </div>

      {displayMode === "side" && <SidePanel selectedNode={selectedNode} />}
    </div>
  );
}

export default GraphViewApp;
