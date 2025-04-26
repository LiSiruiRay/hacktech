import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useTheme } from 'next-themes';

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

// Define animation keyframes for ripple effect
const rippleKeyframes = `
@keyframes ripple {
  0% {
    transform: scale(0.8);
    opacity: 1;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}
`;

// Define animation keyframes for pulse effect
const pulseKeyframes = `
@keyframes pulse {
  0% {
    opacity: 0.4;
  }
  50% {
    opacity: 0.8;
  }
  100% {
    opacity: 0.4;
  }
}
`;

const EventPredictionGraph = () => {
  const { theme } = useTheme();
  // if dark mode -- boolean tracker to change colors
  const isDarkMode = theme === 'dark';
  
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
    const maxX = Math.max(...events.map(e => e.x + 180)) + 50; // increased size for larger nodes
    const maxY = Math.max(...events.map(e => e.y + 120)) + 50; // ^ ditto
    
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

  // Function to calculate the endpoint of a line with an offset from the target node
  const calculateEndpoint = (x1: number, y1: number, x2: number, y2: number, offset: number = 20) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    // Calculate the point that's 'offset' distance from the end
    const ratio = (length - offset) / length;
    
    return {
      x: x1 + dx * ratio,
      y: y1 + dy * ratio
    };
  };

  // Function to draw connections between events
  const renderConnections = () => {
    return connections.map(connection => {
      const fromEvent = getEventById(connection.from);
      const toEvent = getEventById(connection.to);
      
      if (!fromEvent || !toEvent) return null;
      
      // Calculate the line endpoints (center of each event node)
      const x1 = fromEvent.x + 90; // Adjusted for larger nodes
      const y1 = fromEvent.y + 60; // ^
      const x2 = toEvent.x + 90;   // ^
      const y2 = toEvent.y + 60;   // ^
      
      // Calculate the endpoint with offset to place arrow at the end
      const endpoint = calculateEndpoint(x1, y1, x2, y2, 25);
      
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
      
      // Generate unique IDs for the animation elements
      const pulseId = `pulse-${connection.id}`;
      const rippleId = `ripple-${connection.id}`;
      
      return (
        <g key={connection.id} className={`transition-opacity duration-1000 ${isPrediction ? 'opacity-80' : 'opacity-100'}`}>
          {/* Line between events */}
          <line 
            x1={x1} 
            y1={y1} 
            x2={endpoint.x} 
            y2={endpoint.y} 
            stroke={isPrediction ? "#888" : "#333"} 
            strokeWidth={isPrediction ? "2" : "3"}
            strokeDasharray={isPrediction ? "5,5" : "none"}
            className={isPrediction ? "animate-pulse" : ""}
          />
          
          {/* Arrow at the end of the line */}
          <g transform={`translate(${endpoint.x}, ${endpoint.y}) rotate(${angle})`}>
            <polygon 
              points="0,0 -10,-5 -10,5" 
              fill={isPrediction ? "#888" : "#333"} 
            />
          </g>
          
          {/* Animated pulse effect for connections */}
          {isPrediction && (
            <>
              <circle 
                cx={x1} 
                cy={y1} 
                r="4" 
                fill="#888" 
                opacity="0.6"
                style={{
                  animation: 'pulse 2s infinite ease-in-out',
                }}
              />
              
              <circle 
                cx={endpoint.x} 
                cy={endpoint.y} 
                r="4" 
                fill="#888" 
                opacity="0.6"
                style={{
                  animation: 'pulse 2s infinite ease-in-out',
                  animationDelay: '1s'
                }}
              />
            </>
          )}
          
          {/* Relationship label (only for relationship connections) */}
          {connection.relationship && connection.label && (
            <g className="pointer-events-none">
              {/* Label background with improved contrast */}
              <rect
                x={(x1 + endpoint.x) / 2 - 45}
                y={(y1 + endpoint.y) / 2 - 12}
                width="90"
                height="24"
                fill="white"
                stroke="#555"
                strokeWidth="1"
                rx="4"
                filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.2))"
              />
              {/* Label text with improved contrast */}
              <text
                x={(x1 + endpoint.x) / 2}
                y={(y1 + endpoint.y) / 2 + 5}
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
  
  // Pan functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (svgRef.current) {
      const pt = svgRef.current.createSVGPoint();
      pt.x = e.clientX;
      pt.y = e.clientY;
      const svgP = pt.matrixTransform(svgRef.current.getScreenCTM()?.inverse());
      
      setIsDragging(true);
      setDragStart({ x: svgP.x, y: svgP.y });
    }
  };
  
  const handleMouseMove = (e: React.MouseEvent) => {
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
  };
  
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className={`w-full h-full ${isDarkMode ? 'bg-slate-900' : 'bg-gray-50'} p-4 relative overflow-auto`}>
      {/* Add keyframes for animations */}
      <style>
        {rippleKeyframes}
        {pulseKeyframes}
      </style>
      
      <h1 className={`text-2xl font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Event Prediction Network</h1>
      
      <div className="flex mb-4 gap-4 flex-wrap">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-blue-600 rounded-full mr-2"></div>
          <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>Happened Events</span>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-orange-500 rounded-full mr-2"></div>
          <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>Predicted Events</span>
        </div>
        <div className="flex items-center">
          <div className="w-12 border-t-2 border-solid border-gray-800 mr-2"></div>
          <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>Event Relationship</span>
        </div>
        <div className="flex items-center">
          <div className="w-12 border-t-2 border-dashed border-gray-500 mr-2"></div>
          <span className={isDarkMode ? 'text-slate-200' : 'text-slate-800'}>Prediction Relationship</span>
        </div>
      </div>
      
      <div className={`relative w-full h-full border ${isDarkMode ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'} rounded-lg`}>
        {/* Zoom controls */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          <button 
            onClick={handleZoomIn}
            className={`p-2 rounded-full shadow-md ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-gray-100'}`}
            aria-label="Zoom in"
          >
            <ZoomIn size={20} className={isDarkMode ? 'text-slate-200' : 'text-slate-700'} />
          </button>
          <button 
            onClick={handleZoomOut}
            className={`p-2 rounded-full shadow-md ${isDarkMode ? 'bg-slate-700 hover:bg-slate-600' : 'bg-white hover:bg-gray-100'}`}
            aria-label="Zoom out"
          >
            <ZoomOut size={20} className={isDarkMode ? 'text-slate-200' : 'text-slate-700'} />
          </button>
        </div>
        
        <svg 
          ref={svgRef}
          className="w-full h-full cursor-move"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Define filters for drop shadows */}
          <defs>
            <filter id="shadow-happened" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(37, 99, 235, 0.3)" />
            </filter>
            <filter id="shadow-predicted" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="3" stdDeviation="4" floodColor="rgba(249, 115, 22, 0.3)" />
            </filter>
          </defs>
          
          {/* Render connections first so they appear behind nodes */}
          {connections.map(connection => {
            const fromEvent = getEventById(connection.from);
            const toEvent = getEventById(connection.to);
            
            if (!fromEvent || !toEvent) return null;
            
            // Calculate the line endpoints (center of each event node)
            const x1 = fromEvent.x + 90; // Adjusted for larger nodes
            const y1 = fromEvent.y + 60; // ^
            const x2 = toEvent.x + 90;   // ^
            const y2 = toEvent.y + 60;   // ^
            
            // Calculate the endpoint with offset to place arrow at the end
            const endpoint = calculateEndpoint(x1, y1, x2, y2, 25);
            
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
            
            // Generate unique IDs for the animation elements
            const pulseId = `pulse-${connection.id}`;
            const rippleId = `ripple-${connection.id}`;
            
            return (
              <g key={connection.id} className={`transition-opacity duration-1000 ${isPrediction ? 'opacity-80' : 'opacity-100'}`}>
                {/* Line between events */}
                <line 
                  x1={x1} 
                  y1={y1} 
                  x2={endpoint.x} 
                  y2={endpoint.y} 
                  stroke={isPrediction 
                    ? (isDarkMode ? "#aaa" : "#888") 
                    : (isDarkMode ? "#eee" : "#333")} 
                  strokeWidth={isPrediction ? "2" : "3"}
                  strokeDasharray={isPrediction ? "5,5" : "none"}
                  className={isPrediction ? "animate-pulse" : ""}
                />
                
                {/* Arrow at the end of the line */}
                <g transform={`translate(${endpoint.x}, ${endpoint.y}) rotate(${angle})`}>
                  <polygon 
                    points="0,0 -10,-5 -10,5" 
                    fill={isPrediction 
                      ? (isDarkMode ? "#aaa" : "#888") 
                      : (isDarkMode ? "#eee" : "#333")} 
                  />
                </g>
                
                {/* Animated pulse effect for connections */}
                {isPrediction && (
                  <>
                    <circle 
                      cx={x1} 
                      cy={y1} 
                      r="4" 
                      fill={isDarkMode ? "#aaa" : "#888"} 
                      opacity="0.6"
                      style={{
                        animation: 'pulse 2s infinite ease-in-out',
                      }}
                    />
                    
                    <circle 
                      cx={endpoint.x} 
                      cy={endpoint.y} 
                      r="4" 
                      fill={isDarkMode ? "#aaa" : "#888"} 
                      opacity="0.6"
                      style={{
                        animation: 'pulse 2s infinite ease-in-out',
                        animationDelay: '1s'
                      }}
                    />
                  </>
                )}
                
                {/* Relationship label (only for relationship connections) */}
                {connection.relationship && connection.label && (
                  <g className="pointer-events-none">
                    {/* Label background with improved contrast */}
                    <rect
                      x={(x1 + endpoint.x) / 2 - 45}
                      y={(y1 + endpoint.y) / 2 - 12}
                      width="90"
                      height="24"
                      fill={isDarkMode ? "#1e293b" : "white"}
                      stroke={isDarkMode ? "#475569" : "#555"}
                      strokeWidth="1"
                      rx="4"
                      filter="drop-shadow(0px 1px 2px rgba(0,0,0,0.2))"
                    />
                    {/* Label text with improved contrast */}
                    <text
                      x={(x1 + endpoint.x) / 2}
                      y={(y1 + endpoint.y) / 2 + 5}
                      textAnchor="middle"
                      fill={isDarkMode ? "#e2e8f0" : "#333"}
                      fontSize="12"
                      fontWeight="medium"
                    >
                      {connection.label}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          
          {/* Render event nodes */}
          {events.map(event => {
            const isPredicted = !event.happened;
            const isVisible = !isPredicted || visiblePredictions.includes(event.id);
            
            if (!isVisible) return null;
            
            // Calculate text width to ensure node is large enough
            const titleLength = event.title.length;
            const nodeWidth = Math.max(180, titleLength * 10); // Adjust width based on title length
            
            return (
              <g 
                key={event.id}
                transform={`translate(${event.x}, ${event.y})`}
                className={`transition-all duration-1000 ${isPredicted ? 'animate-fadeIn' : ''}`}
              >
                {/* Main node rectangle with drop shadow */}
                <rect 
                  width={nodeWidth} 
                  height="120" 
                  rx="8"
                  fill={event.happened ? "rgb(37, 99, 235)" : "rgb(249, 115, 22)"}
                  fillOpacity={isPredicted ? "0.85" : "1"}
                  filter={event.happened ? "url(#shadow-happened)" : "url(#shadow-predicted)"}
                  className={isPredicted ? "animate-pulse" : ""}
                  aria-label={`${event.title} - ${event.happened ? "Happened" : "Predicted"} event`}
                />
                
                {/* Ripple effect for predicted events */}
                {isPredicted && visiblePredictions.includes(event.id) && (
                  <circle
                    cx={nodeWidth / 2}
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="rgb(249, 115, 22)"
                    strokeWidth="2"
                    opacity="0.6"
                    style={{
                      animation: 'ripple 3s infinite ease-out',
                    }}
                  />
                )}
                
                {/* Event title with improved contrast */}
                <text 
                  x={nodeWidth / 2} 
                  y="35" 
                  textAnchor="middle" 
                  fill="white" 
                  fontWeight="bold"
                  fontSize="14"
                  style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.3)' }}
                >
                  {event.title}
                </text>
                
                {/* Event description with improved contrast */}
                <text 
                  x={nodeWidth / 2} 
                  y="60" 
                  textAnchor="middle" 
                  fill="white" 
                  fontSize="12"
                  style={{ textShadow: '0px 1px 1px rgba(0,0,0,0.2)' }}
                >
                  {event.description.length > 25 ? event.description.substring(0, 25) + "..." : event.description}
                </text>
                
                {/* Event status with improved contrast */}
                <text 
                  x={nodeWidth / 2} 
                  y="90" 
                  textAnchor="middle" 
                  fill="white" 
                  fontStyle="italic" 
                  fontSize="12"
                  style={{ textShadow: '0px 1px 1px rgba(0,0,0,0.2)' }}
                >
                  {event.happened ? "Happened" : "Predicted"}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      
      <div className="mt-4 flex gap-4">
        <button 
          className={`px-4 py-2 rounded focus:outline-none ${
            isDarkMode 
              ? 'bg-indigo-700 hover:bg-indigo-800 text-white focus:ring-2 focus:ring-indigo-400' 
              : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-2 focus:ring-indigo-500'
          }`}
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
          aria-label="Restart Animation"
        >
          Restart Animation
        </button>
      </div>
      
    </div>
  );
};

export default EventPredictionGraph;
