import React, { useState, useEffect } from 'react';
import { ArrowRight } from 'lucide-react';

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

  return (
    <div className="w-full h-screen bg-gray-50 p-4 relative overflow-hidden">
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
      
      <div className="relative w-full h-full border border-gray-200 rounded-lg bg-white">
        <svg className="w-full h-full">
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
