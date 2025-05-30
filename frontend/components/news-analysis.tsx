"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import {
  List,
  PieChartIcon,
  Network,
  Clock,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import EventPredictionGraph from "./events_prediction/event-prediction-graph-updated";
import { NewsData, SentimentData, NetworkNode, NetworkLink } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CustomTooltip from "@/components/customtooltip";
import Sentiment from "sentiment";

const PERSONAL_STOCKS = ["AAPL", "MSFT", "AMZN", "GOOGL", "TSLA", "META"];

// Define time period type
type TimePeriod = "day" | "week" | "month";
// Define view type
type ViewType = "list" | "pie" | "graph";
// Define data source type
type DataSource = "personal" | "market";

// Define updated API types
interface NewsItem {
  title: string;
  news_content: string;
}

interface NewsEvent {
  event_id: number;
  event_content: string;
  topic: string;
  news_list: NewsItem[];
  impact: number;
  risk?: number; // <- new
  opportunity?: number; // <- new
  rationale?: string; // <- new
}

interface Prediction {
  content: string;
  confidence_score: number;
  reason: string;
  cause: {
    weight: number;
    event: {
      event_id: number;
      event_content: string;
    };
  }[];
}

interface RiskOpportunitySignal {
  topic: string;
  risk: number;
  opportunity: number;
  rationale: string;
}

interface ApiResponse {
  events: NewsEvent[];
  predictions: Prediction[];
  advice?: string;
  riskOpportunitySignals?: RiskOpportunitySignal[];
}

// Define props interface with optional parameters
interface NewsAnalysisProps {
  defaultDataSource?: DataSource;
  onDataSourceChange?: (value: string) => void;
}

export function NewsAnalysis({
  defaultDataSource = "personal",
  onDataSourceChange,
}: NewsAnalysisProps) {
  // State management
  const [viewType, setViewType] = useState<ViewType>("list");
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  const [dataSource, setDataSource] = useState<DataSource>(defaultDataSource);
  const [newsData, setNewsData] = useState<NewsData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [networkLinks, setNetworkLinks] = useState<NetworkLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState<string | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  // PRE-FETCHING - TRACK WHAT HAS ALREADY BEEN PREFETCHED
  const [prefetchedCombinations, setPrefetchedCombinations] = useState<
    Set<string>
  >(new Set());

  // API data state
  const [apiEvents, setApiEvents] = useState<NewsEvent[]>([]);
  const [apiPredictions, setPredictions] = useState<Prediction[]>([]);

  // State for expanded UI elements
  const [expandedNewsIds, setExpandedNewsIds] = useState<number[]>([]);
  const [expandedContentIds, setExpandedContentIds] = useState<number[]>([]);
  const [expandedPredictionIds, setExpandedPredictionIds] = useState<number[]>(
    []
  );

  // Toggle expansion functions
  const toggleNewsExpansion = (newsId: number) => {
    if (expandedNewsIds.includes(newsId)) {
      setExpandedNewsIds(expandedNewsIds.filter((id) => id !== newsId));
    } else {
      setExpandedNewsIds([...expandedNewsIds, newsId]);
    }
  };

  const toggleContentExpansion = (eventId: number) => {
    if (expandedContentIds.includes(eventId)) {
      setExpandedContentIds(expandedContentIds.filter((id) => id !== eventId));
    } else {
      setExpandedContentIds([...expandedContentIds, eventId]);
    }
  };

  const togglePredictionExpansion = (predictionIdx: number) => {
    if (expandedPredictionIds.includes(predictionIdx)) {
      setExpandedPredictionIds(
        expandedPredictionIds.filter((id) => id !== predictionIdx)
      );
    } else {
      setExpandedPredictionIds([...expandedPredictionIds, predictionIdx]);
    }
  };

  // Handle data source change
  const handleDataSourceChange = (value: string) => {
    setDataSource(value as DataSource);
    if (onDataSourceChange) {
      onDataSourceChange(value);
    }
  };

  // Handle time period change
  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value as TimePeriod);
  };

  // Fetch data from Flask API
  // Modified fetchApiData without prefetching tracking
  const fetchApiData = async (
    ds: DataSource = dataSource,
    tp: TimePeriod = timePeriod,
    silent: boolean = false
  ) => {
    try {
      if (!silent) {
        setLoading(true);

        // Reset expanded states when fetching new data
        setExpandedNewsIds([]);
        setExpandedContentIds([]);
        setExpandedPredictionIds([]);
      }

      // Construct the API endpoint
      let endpoint =
        `http://localhost:5001/api/${ds}/predict-from-news` +
        `?time_period=${tp}&limit=5`;
      if (ds === "personal") {
        const tickersParam = PERSONAL_STOCKS.join(",");
        endpoint += `&tickers=${encodeURIComponent(tickersParam)}`;
      }

      if (!silent) console.log(`Fetching data from: ${endpoint}`);
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }

      const data: ApiResponse = await response.json();
      setAdvice(data.advice ?? null);

      if (!silent) {
        console.log("API response received");

        // Validate data to ensure we don't display empty content
        if (!data.events || data.events.length === 0) {
          throw new Error("No events received from API");
        }

        // Only update state for visible fetches
        setApiEvents(data.events || []);
        setPredictions(data.predictions || []);

        // Convert API data to format needed for visualization
        convertApiDataToComponents(data);

        setError(null);
      }
    } catch (err) {
      console.error(err);
      if (!silent) {
        // Try to use sample data instead
        try {
          console.log("Attempting to use sample data as fallback");
          const sampleEndpoint = `http://localhost:5001/api/sample-data?data_source=${ds}`;

          const sampleResponse = await fetch(sampleEndpoint);

          if (sampleResponse.ok) {
            const sampleData: ApiResponse = await sampleResponse.json();

            console.log("Successfully loaded sample data as fallback");

            // Use sample data instead
            setApiEvents(sampleData.events || []);
            setPredictions(sampleData.predictions || []);

            // Convert sample data to visualization format
            convertApiDataToComponents(sampleData);

            // Set a friendlier error message
            setError(
              "Using sample data for visualization. Live data is temporarily unavailable."
            );
          } else {
            // If sample data also fails, show original error
            setError(
              `Error loading data from API: ${
                err instanceof Error ? err.message : String(err)
              }`
            );
          }
        } catch (fallbackErr) {
          console.error("Error loading sample data:", fallbackErr);
          setError(
            `Error loading data from API: ${
              err instanceof Error ? err.message : String(err)
            }`
          );
        }
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  // Extract a title from event content
  const extractTitle = useCallback((content: string): string => {
    if (!content || content === "Summary not available.") {
      return "News Cluster";
    }

    // Take first sentence or first 50 characters
    const firstSentence = content
      .split(/[.!?]/)
      .filter((s) => s.trim().length > 0)[0];
    if (firstSentence && firstSentence.length <= 100) {
      return firstSentence.trim();
    }
    // If first sentence is too long, take first 100 chars
    return content.length > 100 ? content.substring(0, 97) + "..." : content;
  }, []);

  // Initialize sentiment analyzer
  const sentimentAnalyzer = new Sentiment();

  // Convert API data to format needed for visualization components
  const convertApiDataToComponents = useCallback(
    (data: ApiResponse) => {
      const newsItems: NewsData[] = data.events.map((event) => {
        // Analyze sentiment using the sentiment library
        const sentimentResult = sentimentAnalyzer.analyze(event.event_content);
        const sentimentScore = sentimentResult.score;
        const sentiment =
          sentimentScore > 0.7
            ? "positive"
            : sentimentScore < -0.7
            ? "negative"
            : "neutral";

        return {
          id: event.event_id,
          title: extractTitle(event.event_content),
          fullContent: event.event_content,
          source:
            event.news_list.length > 0
              ? `News sources: ${event.news_list.length}`
              : "No sources",
          time: new Date().toLocaleTimeString(),
          sentiment: sentiment,
          impact: event.impact,
          categories: ["News", "Finance"],
        };
      });

      setNewsData(newsItems);

      // Generate cluster distribution data for pie chart instead of sentiment
      const pieData: SentimentData[] = data.events
        .map((event) => {
          const colors = [
            "#10b981",
            "#ef4444",
            "#f59e0b",
            "#3b82f6",
            "#8b5cf6",
            "#ec4899",
          ];
          const colorIndex = event.event_id % colors.length;

          return {
            name: event.topic || `Cluster ${event.event_id}`, // Now using the topic from backend
            value: event.impact,
            color: colors[colorIndex],
            fullTitle: extractTitle(event.event_content),
          };
        })
        .filter((item) => item.value > 0);

      setSentimentData(pieData);

      // Generate network data for graph view
      const nodes: NetworkNode[] = data.events.map((event) => ({
        id: `event-${event.event_id}`,
        group: 1, // Events in group 1
      }));

      // Add prediction nodes
      if (data.predictions && data.predictions.length > 0) {
        data.predictions.forEach((prediction, index) => {
          nodes.push({
            id: `prediction-${index}`,
            group: 2, // Predictions in group 2
          });
        });

        // Create links between predictions and their causes
        const links: NetworkLink[] = [];
        data.predictions.forEach((prediction, predIndex) => {
          if (prediction.cause && prediction.cause.length > 0) {
            prediction.cause.forEach((cause) => {
              links.push({
                source: `event-${cause.event.event_id}`,
                target: `prediction-${predIndex}`,
                value: cause.weight,
              });
            });
          }
        });

        setNetworkLinks(links);
      }

      setNetworkNodes(nodes);
    },
    [extractTitle]
  );

  // Fetch data when parameters change
  useEffect(() => {
    fetchApiData();
  }, [dataSource, timePeriod]);

  // Update local state when prop changes
  useEffect(() => {
    setDataSource(defaultDataSource);
  }, [defaultDataSource]);

  if (loading) {
    return <div className="p-4 text-center">Loading financial data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  // Helper function for sentiment icons
  const getSentimentIcon = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "negative":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Helper function for sentiment colors
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "negative":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
    }
  };

  // Generate title and timeframe text
  const title = dataSource === "personal" ? "Portfolio" : "Market";
  const timeframeText =
    timePeriod === "day"
      ? "today"
      : timePeriod === "week"
      ? "this week"
      : "this month";

  return (
    <div className="space-y-5">
      {/* Title */}
      <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">
        {`${title} News Impact (${timeframeText})`}
      </h3>

      {/* Top section: toggles */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div className="flex flex-wrap gap-4">
          {/* Data source toggle */}
          <Tabs
            value={dataSource}
            onValueChange={handleDataSourceChange}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-2 w-52">
              <TabsTrigger value="personal">My Portfolio</TabsTrigger>
              <TabsTrigger value="market">Market</TabsTrigger>
            </TabsList>
          </Tabs>

          {/* Time period toggle */}
          <Tabs
            value={timePeriod}
            onValueChange={handleTimePeriodChange}
            className="w-auto"
          >
            <TabsList className="grid grid-cols-3 w-48">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* View type toggle */}
        <div className="flex space-x-1 border rounded-md overflow-hidden border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              setSelectedTopic(null);
              setViewType("list");
            }}
            className={`p-2 transition-colors ${
              viewType === "list"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setViewType("pie");
              setSelectedTopic(null);
            }}
            className={`p-2 transition-colors ${
              viewType === "pie"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            aria-label="Pie chart view"
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => {
              setViewType("graph");
              setSelectedTopic(null);
            }}
            className={`p-2 transition-colors ${
              viewType === "graph"
                ? "bg-primary text-primary-foreground"
                : "hover:bg-accent"
            }`}
            aria-label="Relational graph view"
          >
            <Network className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main content based on viewType */}
      {viewType === "list" && (
        <div className="space-y-3 h-full overflow-y-auto pr-1">
          {apiEvents.length > 0 ? (
            apiEvents.map((event) => {
              const newsItem = newsData.find((n) => n.id === event.event_id);
              const isContentExpanded = expandedContentIds.includes(
                event.event_id
              );
              const borderColor =
                event.risk && event.risk >= 8
                  ? "border-l-red-500"
                  : "border-l-primary";
              return (
                <Card
                  key={event.event_id}
                  className={`hover:bg-accent/50 cursor-pointer transition-colors border-l-4 ${borderColor} dark:bg-slate-800/30`}
                >
                  <CardContent className="p-4">
                    <div
                      className="flex items-start gap-3"
                      onClick={() => toggleContentExpansion(event.event_id)}
                    >
                      <div className="mt-0.5 bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
                        {getSentimentIcon(newsItem?.sentiment || "neutral")}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-slate-800 dark:text-slate-100">
                            {/* Show title from newsData (extracted title) */}
                            {newsItem?.title ||
                              extractTitle(event.event_content)}
                          </h4>
                          {isContentExpanded ? (
                            <ChevronUp className="h-4 w-4 ml-2 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2 text-slate-500" />
                          )}
                        </div>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <span>
                            {event.news_list.length > 0
                              ? `${event.news_list.length} news sources`
                              : "No sources"}
                          </span>
                          <span className="mx-2">•</span>
                          <Clock className="h-3 w-3 mr-1" />
                          <span>Recent</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-2">
                          <Badge
                            key="news"
                            variant="outline"
                            className="text-xs"
                          >
                            News
                          </Badge>
                          <Badge
                            key="finance"
                            variant="outline"
                            className="text-xs"
                          >
                            Finance
                          </Badge>
                          <Badge
                            className={`text-xs ${getSentimentColor(
                              newsItem?.sentiment || "neutral"
                            )}`}
                          >
                            {newsItem?.sentiment?.charAt(0).toUpperCase() +
                              (newsItem?.sentiment?.slice(1) || "Neutral")}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="font-medium">
                          {event.impact}% Impact
                        </Badge>
                      </div>
                    </div>

                    {/* Expanded content - show full description*/}
                    {isContentExpanded && (
                      <div className="mt-3 pt-3 border-t border-dashed border-slate-200 dark:border-slate-700">
                        <p className="text-sm text-slate-700 dark:text-slate-300">
                          {event.event_content}
                        </p>
                        {event.risk !== undefined &&
                          event.opportunity !== undefined &&
                          event.rationale && (
                            <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                              <h5 className="text-sm font-medium mb-2">
                                Risk/Opportunity Analysis:
                              </h5>
                              <div className="text-sm">
                                🔴 <strong>Risk:</strong> {event.risk} &nbsp; 🟢{" "}
                                <strong>Opportunity:</strong>{" "}
                                {event.opportunity}
                              </div>
                              <p className="mt-2 text-xs italic text-gray-600">
                                {event.rationale}
                              </p>
                            </div>
                          )}

                        {/* Button to show/hide news */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation(); // Prevent content toggle
                            toggleNewsExpansion(event.event_id);
                          }}
                          className="text-xs text-primary hover:text-primary-focus flex items-center mt-2"
                        >
                          {expandedNewsIds.includes(event.event_id) ? (
                            <>
                              Hide news sources{" "}
                              <ChevronUp className="h-3 w-3 ml-1" />
                            </>
                          ) : (
                            <>
                              View news sources{" "}
                              <ChevronDown className="h-3 w-3 ml-1" />
                            </>
                          )}
                        </button>

                        {/* Expanded news content */}
                        {expandedNewsIds.includes(event.event_id) && (
                          <div className="mt-3 pl-4">
                            <h5 className="font-medium text-sm mb-2">
                              Related News
                            </h5>
                            {event.news_list.length > 0 ? (
                              <div className="space-y-3">
                                {event.news_list.map((news, idx) => (
                                  <div
                                    key={idx}
                                    className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md text-sm"
                                  >
                                    <h6 className="font-medium mb-1">
                                      {news.title}
                                    </h6>
                                    <p className="text-muted-foreground">
                                      {news.news_content}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">
                                No news articles available for this event.
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No news events found. Try changing the time period or data source.
            </div>
          )}
        </div>
      )}

      {/* Pie chart view */}
      {viewType === "pie" && (
        <div className="h-[600px] flex flex-col items-center justify-center pie-chart-container">
          <div className="w-[400px] h-[400px] mx-auto flex flex-col items-center justify-center pie-chart-container">
            <h4 className="text-sm font-medium mb-4">
              News Topic Distribution
            </h4>
            <div className="py-5 w-full h-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={sentimentData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={120}
                    innerRadius={60}
                    paddingAngle={5}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}%`}
                    onClick={(entry) => {
                      // entry.payload.name is your cluster/topic
                      setSelectedTopic(entry.payload.name);
                    }}
                  >
                    {sentimentData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="text-xs text-center text-muted-foreground mt-2">
            Showing distribution of news articles across topic clusters
          </div>
          <div className="w-full min-h-[140px] mt-4 flex flex-col items-center justify-start">
            {selectedTopic ? (
              <div className="w-full p-4 bg-white dark:bg-slate-800 rounded-lg shadow border border-slate-200 dark:border-slate-700">
                {(() => {
                  const sig = apiEvents.find(
                    (r) =>
                      r.topic.trim().toLowerCase() ===
                      selectedTopic.trim().toLowerCase()
                  );
                  if (!sig)
                    return (
                      <p className="text-sm text-center">
                        No signal for {selectedTopic}
                      </p>
                    );
                  return (
                    <>
                      <h5 className="text-sm font-medium mb-2">{sig.topic}</h5>
                      <p className="text-sm">
                        🔴 Risk: <strong>{sig.risk}</strong> &nbsp; 🟢
                        Opportunity: <strong>{sig.opportunity}</strong>
                      </p>
                      <p className="mt-2 text-xs italic text-gray-300">
                        {sig.rationale}
                      </p>
                    </>
                  );
                })()}
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                Click a slice above to see detailed signals
              </div>
            )}
          </div>
        </div>
      )}

      {/* Graph view */}
      {viewType === "graph" && (
        <div className="h-[400px] overflow-hidden rounded-lg">
          <div className="h-full">
            <EventPredictionGraph
              networkNodes={networkNodes}
              networkLinks={networkLinks}
            />
          </div>
        </div>
      )}

      {/* Predictions Section */}
      {apiPredictions.length > 0 && (
        <div className="mt-9">
          <div className="mt-8 pt-8">
            <div className="mt-4">
              <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">
                Predicted Outcomes
              </h3>
            </div>
          </div>
          <div className="space-y-3">
            {apiPredictions.map((prediction, index) => {
              // Check if this prediction is expanded
              const isPredictionExpanded =
                expandedPredictionIds.includes(index);

              return (
                <Card
                  key={index}
                  className="border-l-4 border-l-indigo-500 dark:bg-slate-800/30 hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => togglePredictionExpansion(index)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1">
                        <div className="flex justify-between items-start">
                          <h4 className="font-medium text-slate-800 dark:text-slate-100">
                            {prediction.content}
                          </h4>
                          {isPredictionExpanded ? (
                            <ChevronUp className="h-4 w-4 ml-2 text-slate-500" />
                          ) : (
                            <ChevronDown className="h-4 w-4 ml-2 text-slate-500" />
                          )}
                        </div>

                        {/* Only show reason and contributing factors when expanded */}
                        {isPredictionExpanded && (
                          <>
                            <div className="mt-3 text-sm text-slate-700 dark:text-slate-300">
                              {prediction.reason}
                            </div>

                            {prediction.cause.length > 0 && (
                              <div className="mt-4 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-md">
                                <h5 className="text-sm font-medium mb-2">
                                  Contributing Factors:
                                </h5>
                                <div className="space-y-2">
                                  {prediction.cause.map((cause, causeIdx) => (
                                    <div
                                      key={causeIdx}
                                      className="flex items-start"
                                    >
                                      <div className="w-10 flex-shrink-0 text-sm font-medium text-slate-600 dark:text-slate-400">
                                        {cause.weight}%
                                      </div>
                                      <div className="flex-1 text-sm text-slate-700 dark:text-slate-300">
                                        {cause.event.event_content}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="font-medium">
                          {prediction.confidence_score}% Confidence
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
      {advice && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100 mb-4">
            AI-Driven Portfolio Signals
          </h3>
          <Card className="border-l-4 border-l-emerald-500 dark:bg-slate-800/30 hover:bg-accent/50 transition-colors">
            <CardContent className="p-4">
              <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line">
                {advice}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
