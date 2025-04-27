// for news analysis
export interface NewsData {
    id: number;
    title: string;
    source: string;
    time: string;
    sentiment: string;
    categories: string[];
    impact: number;
  }
  
  // Sentiment breakdown for pie chart
  export interface SentimentData {
    name: string;
    value: number;
    color: string;
    fullTitle?: string;
  }
  
  // Network graph nodes
  export interface NetworkNode {
    id: string;
    group: number;
  }
  
  // Network graph links
  export interface NetworkLink {
    source: string;
    target: string;
    value: number;
  }
  
  // Props for the EventPredictionGraph component
  export interface EventPredictionGraphProps {
    networkNodes: NetworkNode[];
    networkLinks: NetworkLink[];
  }