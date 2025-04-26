import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ZoomIn, ZoomOut, Move } from 'lucide-react';

// Define TypeScript interfaces
interface Event {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  happened: boolean;
}

interface Connection {
  from: string;
  to: string;
  id: string;
  label?: string;
  relationship: boolean; // true = relationship between happened events, false = prediction
}

// Define ViewBox interface for SVG viewBox
interface ViewBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

const EventPredictionGraph = () => {
  // Sample data for demonstration
  const [events, setEvents] = useState<Event[]>([
    { id: '1', title: 'Market Crash', description: 'Stock market crashed by 5%', x: 100, y: 100, happened: true },
    { id: '2', title: 'Interest Rate Hike', description: 'Central bank raised interest rates', x: 400, y: 150, happened: true },
    { id: '3', title: 'Company Bankruptcy', description: 'Major tech company files for bankruptcy', x: 200, y: 300, happened: true },
    { id: '4', title: 'Currency Devaluation', description: 'Currency loses 10% of its value', x: 500, y: 400, happened: false },
    { id: '5', title: 'Mass Layoffs', description: 'Unemployment rises across sectors', x: 300, y: 500, happened: false },
    { id: '6', title: 'Housing Market Decline', description: 'Property values drop by 15%', x: 700, y: 300, happened: false },
  ]);

  const [connections, setConnections] = useState<Connection[]>([
    // Relationships between happened events (solid lines with labels)
    { from: '1', to: '2', id: 'r1', label: 'Triggered', relationship: true },
    { from: '2', to: '3', id: 'r2', label: 'Caused', relationship: true },
    { from: '1', to: '3', id: 'r3', label: 'Accelerated', relationship: true },
    
    // Predictions (dotted lines)
    { from: '1', to: '4', id: 'p1', relationship: false },
    { from: '2', to: '5', id: 'p2', relationship: false },
    { from: '3', to: '6', id: 'p3', relationship: false },
    { from: '1', to: '5', id: 'p4', relationship: false },
  ]);

  // For animation of predicted events
  const [visiblePredictions, setVisiblePredictions] = useState<string[]>([]);
  
  // For zoom and pan functionality
  const [viewBox, setViewBox] = useState<ViewBox>({ x: 0, y: 0, width: 1000, height: 800 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Calculate the bounds of all events to determine initial viewBox
  useEffect(() => {
    if (events.length === 0) return;
    
    // Find min and max coordinates to determine the graph bounds
    const minX = Math.min(...events.map(e => e.x)) - 50;
    const minY = Math.min(...events.map(e => e.y)) - 50;
    const maxX = Math.max(...events.map(e => e.x + 150)) + 50;
    const maxY = Math.max(...events.map(e => e.y + 100)) + 50;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    // Set initial viewBox to show all events
    setViewBox({ x: minX, y: minY, width, height });
  }, [events]);

  // Animate the predicted events to appear one by one
  useEffect(() => {
    const predictedEvents = events.filter(event => !event.happened).map(event => event.id);
    
    let timeoutIds: NodeJS.Timeout[] = [];
    
    predictedEvents.forEach((eventId, index) => {
      const timeoutId = setTimeout(() => {
        setVisiblePredictions(prev => [...prev, eventId]);
      }, (index + 1) * 2000); // Each prediction appears after 2 seconds
      
      timeoutIds.push(timeoutId);
    });
    
    // Cleanup timeouts on unmount
    return () => {
      timeoutIds.forEach(id => clearTimeout(id));
    };
  }, [events]);

  // Helper function to find event by ID
  const getEventById = (id: string) => events.find(event => event.id === id);

  // Function to draw connections between events
  const renderConnections = () => {
    return connections.map(connection => {
      const fromEvent = getEventById(connection.from);
      const toEvent = getEventById(connection.to);
      
      if (!fromEvent || !toEvent) return null;
      
      // Calculate the line endpoints (center of each event node)
      const x1 = fromEvent.x + 75;
      const y1 = fromEvent.y + 50;
      const x2 = toEvent.x + 75;
      const y2 = toEvent.y + 50;
      
      // Calculate midpoint for the arrow and label
      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      
      // Calculate angle for the arrow rotation
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
      
      // Determine if this connection is to a predicted event
      const isPrediction = !connection.relationship;
      const isVisible = !isPrediction || 
                        (isPrediction && 
                         toEvent && 
                         !toEvent.happened && 
                         visiblePredictions.includes(toEvent.id));
      
      if (!isVisible) return null;
      
      return (
        <g key={connection.id} className={`transition-opacity duration-1000 ${isPrediction ? 'opacity-70' : 'opacity-100'}`}>
          {/* Line between events */}
          <line 
            x1={x1} 
            y1={y1} 
            x2={x2} 
            y2={y2} 
            stroke={isPrediction ? "#888" : "#333"} 
            strokeWidth={isPrediction ? "2" : "3"}
            strokeDasharray={isPrediction ? "5,5" : "none"}
            className={isPrediction ? "animate-pulse" : ""}
          />
          
          {/* Arrow in the middle */}
          <g transform={`translate(${midX}, ${midY}) rotate(${angle})`}>
            <ArrowRight size={16} color={isPrediction ? "#888" : "#333"} />
          </g>
          
          {/* Relationship label (only for relationship connections) */}
          {connection.relationship && connection.label && (
            <g className="pointer-events-none">
              {/* Label background */}
              <rect
                x={midX - 40}
                y={midY - 12}
                width="80"
                height="24"
                fill="white"
                stroke="#333"
                strokeWidth="1"
                rx="4"
              />
              {/* Label text */}
              <text
                x={midX}
                y={midY + 5}
                textAnchor="middle"
                fill="#333"
                fontSize="12"
                fontWeight="medium"
              >
                {connection.label}
              </text>
            </g>
          )}
        </g>
      );
    });
  };

  // Zoom functions
  const handleZoomIn = () => {
    setViewBox(prev => ({
      ...prev,
      width: prev.width * 0.8,
      height: prev.height * 0.8,
      // Adjust x and y to zoom toward center
      x: prev.x + prev.width * 0.1,
      y: prev.y + prev.height * 0.1
    }));
  };
  
  const handleZoomOut = () => {
    setViewBox(prev => ({
      ...prev,
      width: prev.width * 1.25,
      height: prev.height * 1.25,
      // Adjust x and y to zoom from center
      x: prev.x - prev.width * 0.125,
      y: prev.y - prev.height * 0.125
    }));
  };
  
  const handleZoomReset = () => {
    // Reset to show all events
    const minX = Math.min(...events.map(e => e.x)) - 50;
    const minY = Math.min(...events.map(e => e.y)) - 50;
    const maxX = Math.max(...events.map(e => e.x + 150)) + 50;
    const maxY = Math.max(...events.map(e => e.y + 100)) + 50;
    
    const width = maxX - minX;
    const height = maxY - minY;
    
    setViewBox({ x: minX, y: minY, width, height });
  };
  
  // Pan functions
  const handleMouseDown = (e: React.MouseEvent<SVGSVGElement>) => {
    if (svgRef.current) {
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
      
      setIsDragging(true);
      setDragStart({ x: svgP.x, y: svgP.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    if (!isDragging || !svgRef.current) return;
    
    const pt = svgRef.current.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
    
    const dx = svgP.x - dragStart.x;
    const dy = svgP.y - dragStart.y;
    
    setViewBox(prev => ({
      ...prev,
      x: prev.x - dx,
      y: prev.y - dy
    }));
    
    setDragStart({ x: svgP.x, y: svgP.y });
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };
  
  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full h-full bg-gray-50 p-4 relative overflow-hidden">
      <h1 className="text-2xl font-bold mb-4">Event Prediction Network</h1>
      
      <div className="flex mb-4 gap-4 flex-wrap">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
          <span>Happened Events</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
          <span>Predicted Events</span>
        </div>
        <div className="flex items-center">
          <div className="w-12 border-t-2 border-solid border-gray-800 mr-2"></div>
          <span>Event Relationship</span>
        </div>
        <div className="flex items-center">
          <div className="w-12 border-t-2 border-dashed border-gray-500 mr-2"></div>
          <span>Prediction Relationship</span>
        </div>
      </div>
      
      {/* Zoom controls */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
        <button 
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button 
          className="p-2 bg-white rounded-full shadow-md hover:bg-gray-100"
          onClick={handleZoomReset}
          title="Reset View"
        >
          <Move size={20} />
        </button>
      </div>
      
      <div className="relative w-full h-full border border-gray-200 rounded-lg bg-white">
        <svg 
          ref={svgRef}
          className={`w-full h-full ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        >
          {/* Render connections first so they appear behind nodes */}
          {renderConnections()}
          
          {/* Render event nodes */}
          {events.map(event => {
            const isPredicted = !event.happened;
            const isVisible = !isPredicted || visiblePredictions.includes(event.id);
            
            if (!isVisible) return null;
            
            return (
              <g 
                key={event.id}
                transform={`translate(${event.x}, ${event.y})`}
                className={`transition-all duration-1000 ${isPredicted ? 'animate-fadeIn' : ''}`}
              >
                <rect 
                  width="150" 
                  height="100" 
                  rx="8"
                  fill={event.happened ? "rgb(37, 99, 235)" : "rgb(249, 115, 22)"}
                  fillOpacity={isPredicted ? "0.7" : "1"}
                  className={`shadow-lg ${isPredicted ? "animate-pulse" : ""}`}
                />
                <text x="75" y="30" textAnchor="middle" fill="white" fontWeight="bold">
                  {event.title}
                </text>
                <text x="75" y="50" textAnchor="middle" fill="white" fontSize="12">
                  {event.description.length > 25 ? event.description.substring(0, 25) + "..." : event.description}
                </text>
                <text x="75" y="80" textAnchor="middle" fill="white" fontStyle="italic" fontSize="12">
                  {event.happened ? "Happened" : "Predicted"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="mt-4 flex gap-4">
        <button 
          className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
          onClick={() => {
            // Reset animation
            setVisiblePredictions([]);
            setTimeout(() => {
              const predictedEvents = events.filter(event => !event.happened).map(event => event.id);
              predictedEvents.forEach((eventId, index) => {
                setTimeout(() => {
                  setVisiblePredictions(prev => [...prev, eventId]);
                }, (index + 1) * 2000);
              });
            }, 500);
          }}
        >
          Restart Animation
        </button>
      </div>
    </div>
  );
};

export default EventPredictionGraph;
