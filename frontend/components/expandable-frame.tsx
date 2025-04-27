"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronUp, ChevronDown, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExpandableFrameProps {
  title: string;
  description?: string;
  srcUrl: string;
  defaultHeight?: number;
  expandedHeight?: number;
}

export function ExpandableFrame({
  title,
  description,
  srcUrl,
  defaultHeight = 300,
  expandedHeight = 600,
}: ExpandableFrameProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentHeight, setCurrentHeight] = useState(defaultHeight);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleExpand = () => {
    const newExpanded = !isExpanded;
    setIsExpanded(newExpanded);
    setCurrentHeight(newExpanded ? expandedHeight : defaultHeight);
  };

  // Function to communicate with iframe content
  useEffect(() => {
    const sendResizeMessage = () => {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.postMessage(
          {
            type: "resize",
            height: currentHeight,
            expanded: isExpanded,
          },
          "*"
        );
      }
    };

    // Send message after a short delay to ensure iframe is loaded
    const timeoutId = setTimeout(sendResizeMessage, 500);

    return () => clearTimeout(timeoutId);
  }, [currentHeight, isExpanded]);

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="text-lg font-semibold">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <a
            href={srcUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80"
          >
            <ExternalLink className="h-4 w-4" />
            <span className="sr-only">Open in new window</span>
          </a>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpand}
            className="flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-4 w-4" /> Collapse
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" /> Expand
              </>
            )}
          </Button>
        </div>
      </div>
      <div
        className="w-full transition-all duration-300 relative"
        style={{ height: `${currentHeight}px` }}
      >
        <iframe
          ref={iframeRef}
          src={srcUrl}
          className="absolute inset-0 w-full h-full border-0"
          title={title}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          loading="lazy"
          onLoad={() => {
            // Send resize message when iframe loads
            if (iframeRef.current && iframeRef.current.contentWindow) {
              iframeRef.current.contentWindow.postMessage(
                {
                  type: "resize",
                  height: currentHeight,
                  expanded: isExpanded,
                },
                "*"
              );
            }
          }}
        />
      </div>
    </div>
  );
}
