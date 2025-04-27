import React, { useState } from "react";

function SearchBar({ onSearch, searchableProperties }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchProperty, setSearchProperty] = useState("any");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery, searchProperty);
    }
  };

  return (
    <div
      style={{
        position: "absolute",
        top: "10px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        gap: "5px",
        width: "400px",
        maxWidth: "calc(100% - 250px)", // Avoid overlap with left panel
        marginLeft: "20px", // Shift right to avoid overlap
      }}
    >
      <form
        onSubmit={handleSearch}
        style={{ display: "flex", flexDirection: "column", gap: "5px" }}
      >
        <div style={{ display: "flex", gap: "5px" }}>
          <input
            type="text"
            placeholder="Search nodes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: "4px",
              flex: 1,
              fontSize: "16px",
              backgroundColor: "rgba(255,255,255,0.9)",
            }}
          />
          <select
            value={searchProperty}
            onChange={(e) => setSearchProperty(e.target.value)}
            style={{
              padding: "8px 12px",
              border: "none",
              borderRadius: "4px",
              backgroundColor: "rgba(255,255,255,0.9)",
              cursor: "pointer",
            }}
          >
            <option value="entity_type">Entity Type</option>
            <option value="displayName">Display Name</option>
            <option value="description">Description</option>
            <option value="id">ID</option>
            <option value="any">Any Property</option>{" "}
            {/* optional: still allow "any" */}
          </select>

          <button
            type="submit"
            style={{
              padding: "8px 16px",
              backgroundColor: "#4CAF50",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
            }}
          >
            Search
          </button>
        </div>
      </form>
    </div>
  );
}

export default SearchBar;
