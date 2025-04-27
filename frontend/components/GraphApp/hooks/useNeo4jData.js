import { useState, useEffect } from "react";
import neo4j from "neo4j-driver";

function useNeo4jData() {
  const [graphData, setGraphData] = useState({ nodes: [], links: [] });
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Function to process Neo4j results into graph data with node limit
  const processResults = (result, limit) => {
    const nodesMap = new Map();
    const links = [];
    const incomingConnections = new Map(); // Track incoming connections
    const outgoingConnections = new Map(); // Track outgoing connections

    // First pass - collect all nodes and connections
    result.records.forEach((record) => {
      const startNode = record.get("n");
      const endNode = record.get("m");
      const relationship = record.get("r");

      // Skip if any of these are null or undefined (can happen with certain search results)
      if (!startNode || !endNode || !relationship) return;

      // Count incoming connections for each node
      const targetId = endNode.identity.toNumber();
      incomingConnections.set(
        targetId,
        (incomingConnections.get(targetId) || 0) + 1
      );

      // Count outgoing connections for each node
      const sourceId = startNode.identity.toNumber();
      outgoingConnections.set(
        sourceId,
        (outgoingConnections.get(sourceId) || 0) + 1
      );

      // Add nodes to map with their identity as key
      if (!nodesMap.has(startNode.identity.toNumber())) {
        nodesMap.set(startNode.identity.toNumber(), {
          id: String(startNode.identity.toNumber()),
          label: startNode.labels[0],
          properties: startNode.properties,
          inDegree: 0, // Initialize inDegree
          outDegree: 0, // Initialize outDegree
          degree: 0, // Initialize total degree
        });
      }

      if (!nodesMap.has(endNode.identity.toNumber())) {
        nodesMap.set(endNode.identity.toNumber(), {
          id: String(endNode.identity.toNumber()),
          label: endNode.labels[0],
          properties: endNode.properties,
          inDegree: 0, // Initialize inDegree
          outDegree: 0, // Initialize outDegree
          degree: 0, // Initialize total degree
        });
      }

      // Add relationship
      links.push({
        source: String(startNode.identity.toNumber()),
        target: String(endNode.identity.toNumber()),
        type: relationship.type,
      });
    });

    // Update nodes with their degrees
    incomingConnections.forEach((count, nodeId) => {
      const node = nodesMap.get(nodeId);
      if (node) {
        node.inDegree = count;
      }
    });

    outgoingConnections.forEach((count, nodeId) => {
      const node = nodesMap.get(nodeId);
      if (node) {
        node.outDegree = count;
      }
    });

    // Calculate total degree for each node
    nodesMap.forEach((node) => {
      node.degree = (node.inDegree || 0) + (node.outDegree || 0);
    });

    // Apply node limit by taking only the most connected nodes
    let allNodes = Array.from(nodesMap.values());
    const totalNodes = allNodes.length;

    // Sort nodes by degree (most connected first)
    allNodes.sort((a, b) => (b.degree || 0) - (a.degree || 0));

    // Limit nodes to the specified limit
    const safeLimit = Number(limit) || 100;
    allNodes = allNodes.slice(0, safeLimit);

    // Create a set of retained node IDs for filtering links
    const retainedNodeIds = new Set(allNodes.map((node) => node.id));

    // Filter links to only include those between retained nodes
    const filteredLinks = links.filter(
      (link) =>
        retainedNodeIds.has(String(link.source)) &&
        retainedNodeIds.has(String(link.target))
    );

    console.log(
      `Applied client-side limit: ${allNodes.length} of ${totalNodes} nodes shown`
    );

    return {
      nodes: allNodes,
      links: filteredLinks,
    };
  };

  // Function to fetch graph data with a limit
  const fetchGraphData = (limit = 100) => {
    setIsLoading(true);
    // Create a driver instance
    console.log("Neo4j URI:", process.env.REACT_APP_NEO4J_URI);
    const driver = neo4j.driver(
      process.env.REACT_APP_NEO4J_URI,
      neo4j.auth.basic(
        process.env.REACT_APP_NEO4J_USER,
        process.env.REACT_APP_NEO4J_PASSWORD
      )
    );
    // const driver = neo4j.driver(
    //   process.env.REACT_APP_NEO4J_URI,
    //   neo4j.auth.basic(
    //     process.env.REACT_APP_NEO4J_USER,
    //     process.env.REACT_APP_NEO4J_PASSWORD
    //   ),
    //   { encrypted: "ENCRYPTION_ON", trust: "TRUST_ALL_CERTIFICATES" }
    // );

    // Open a session
    const session = driver.session();

    // Run a query to get nodes and relationships with the specified limit
    session
      .run(`MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 2000`)
      .then((result) => {
        setGraphData(processResults(result, limit));
        setError(null); // Clear any previous errors
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => {
        // Clean up
        session.close();
        driver.close();
        setIsLoading(false);
      });
  };

  // Function to search with Neo4j
  const searchGraphData = (searchQuery, searchProperty, limit = 100) => {
    setIsLoading(true);
    // Create a driver instance
    const driver = neo4j.driver(
      process.env.REACT_APP_NEO4J_URI,
      neo4j.auth.basic(
        process.env.REACT_APP_NEO4J_USER,
        process.env.REACT_APP_NEO4J_PASSWORD
      )
    );

    // Open a session
    const session = driver.session();

    // Construct query based on search property
    let query;
    if (searchProperty === "label") {
      // Search by label - apply LIMIT to the entire query result
      query = `
        MATCH (n)
        WHERE toLower(any(label IN labels(n) WHERE label CONTAINS toLower($searchQuery)))
        MATCH (n)-[r]->(m)
        RETURN n, r, m
        UNION
        MATCH (n)-[r]->(m)
        WHERE toLower(any(label IN labels(m) WHERE label CONTAINS toLower($searchQuery)))
        RETURN n, r, m
      `;
    } else if (searchProperty === "any") {
      // Search through all properties
      query = `
        MATCH (n)
        WHERE any(key IN keys(n) WHERE toLower(toString(n[key])) CONTAINS toLower($searchQuery))
        MATCH (n)-[r]->(m)
        RETURN n, r, m
        UNION
        MATCH (n)-[r]->(m)
        WHERE any(key IN keys(m) WHERE toLower(toString(m[key])) CONTAINS toLower($searchQuery))
        RETURN n, r, m
      `;
    } else {
      // Search through specific property (name or title)
      query = `
        MATCH (n)
        WHERE toLower(toString(n.${searchProperty})) CONTAINS toLower($searchQuery)
        MATCH (n)-[r]->(m)
        RETURN n, r, m
        UNION
        MATCH (n)-[r]->(m)
        WHERE toLower(toString(m.${searchProperty})) CONTAINS toLower($searchQuery)
        RETURN n, r, m
      `;
    }

    // Let's get a large set from Neo4j and apply limit on client side
    query += ` LIMIT 2000`;

    // Run the search query
    session
      .run(query, { searchQuery })
      .then((result) => {
        const processedData = processResults(result, limit);
        setGraphData(processedData);

        if (processedData.nodes.length === 0) {
          setError(`No results found for "${searchQuery}"`);
        } else {
          setError(null);
        }
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
      })
      .finally(() => {
        // Clean up
        session.close();
        driver.close();
        setIsLoading(false);
      });
  };

  return { graphData, error, isLoading, fetchGraphData, searchGraphData };
}

export default useNeo4jData;
