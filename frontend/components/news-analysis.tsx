"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { List, PieChartIcon, Network, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react"
import EventPredictionGraph from "./events_prediction/event-prediction-graph-updated" 
import { NewsData, SentimentData, NetworkNode, NetworkLink } from "@/types";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Define time period type
type TimePeriod = "day" | "week" | "month"
// Define view type
type ViewType = "list" | "pie" | "graph"
// Define data source type
type DataSource = "personal" | "market"

// Define props interface with optional parameters
interface NewsAnalysisProps {
  defaultDataSource?: DataSource;
  onDataSourceChange?: (value: string) => void;
}

export function NewsAnalysis({ 
  defaultDataSource = "personal",
  onDataSourceChange
}: NewsAnalysisProps) {
  // State management
  const [viewType, setViewType] = useState<ViewType>("list")
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day")
  const [dataSource, setDataSource] = useState<DataSource>(defaultDataSource)
  const [newsData, setNewsData] = useState<NewsData[]>([])
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([])
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([])
  const [networkLinks, setNetworkLinks] = useState<NetworkLink[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  // Effect to fetch data based on dataSource and timePeriod
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)
        
        // Construct the endpoints based on dataSource and timePeriod
        // Keep lowercase for news endpoints which match your db.json structure
        const newsEndpoint = `${dataSource}${timePeriod}`
        const sentimentEndpoint = `${dataSource}Sentiment`
        const nodesEndpoint = `${dataSource}Networknodes`
        const linksEndpoint = `${dataSource}Networklinks`

        console.log(`Fetching from: ${newsEndpoint}, ${sentimentEndpoint}, ${nodesEndpoint}, ${linksEndpoint}`);

        // Fetch data
        const [newsResponse, sentimentResponse, nodesResponse, linksResponse] = await Promise.all([
          fetch(`http://localhost:3001/${newsEndpoint}`),
          fetch(`http://localhost:3001/${sentimentEndpoint}`),
          fetch(`http://localhost:3001/${nodesEndpoint}`),
          fetch(`http://localhost:3001/${linksEndpoint}`)
        ]);
  
        if (!newsResponse.ok) {
          throw new Error(`Failed to fetch news data from ${newsEndpoint}`);
        }
        if (!sentimentResponse.ok) {
          throw new Error(`Failed to fetch sentiment data from ${sentimentEndpoint}`);
        }
        if (!nodesResponse.ok) {
          throw new Error(`Failed to fetch network nodes from ${nodesEndpoint}`);
        }
        if (!linksResponse.ok) {
          throw new Error(`Failed to fetch network links from ${linksEndpoint}`);
        }
  
        const news = await newsResponse.json();
        const sentiment = await sentimentResponse.json();
        const nodes = await nodesResponse.json();
        const links = await linksResponse.json();
  
        setNewsData(news);
        setSentimentData(sentiment);
        setNetworkNodes(nodes);
        setNetworkLinks(links);
        setError(null);
  
      } catch (err) {
        console.error(err);
        setError(`Error loading financial data: ${err instanceof Error ? err.message : String(err)}`);
      } finally {
        setLoading(false);
      }
    }
  
    fetchData();
  }, [dataSource, timePeriod]); // Re-fetch when dataSource or timePeriod changes
  
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
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "negative":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />
    }
  }

  // Helper function for sentiment colors
  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "bg-green-100 text-green-800 hover:bg-green-200"
      case "negative":
        return "bg-red-100 text-red-800 hover:bg-red-200"
      default:
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
    }
  }

  // Generate title and timeframe text
  const title = dataSource === "personal" ? "Portfolio" : "Market";
  const timeframeText = timePeriod === "day" ? "today" : 
                        timePeriod === "week" ? "this week" : 
                        "this month";

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
            onClick={() => setViewType("list")}
            className={`p-2 transition-colors ${
              viewType === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewType("pie")}
            className={`p-2 transition-colors ${
              viewType === "pie" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
            }`}
            aria-label="Pie chart view"
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewType("graph")}
            className={`p-2 transition-colors ${
              viewType === "graph" ? "bg-primary text-primary-foreground" : "hover:bg-accent"
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
          {newsData.map((news) => (
            <Card
              key={news.id}
              className="hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-l-primary dark:bg-slate-800/30"
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 bg-primary/10 dark:bg-primary/20 p-2 rounded-full">
                    {getSentimentIcon(news.sentiment)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-slate-800 dark:text-slate-100">{news.title}</h4>
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                      <span>{news.source}</span>
                      <span className="mx-2">•</span>
                      <Clock className="h-3 w-3 mr-1" />
                      <span>{news.time}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {news.categories.map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {category}
                        </Badge>
                      ))}
                      <Badge className={`text-xs ${getSentimentColor(news.sentiment)}`}>
                        {news.sentiment.charAt(0).toUpperCase() + news.sentiment.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant="secondary" className="font-medium">
                      {news.impact}% Impact
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
  
      {/* Pie chart view */}
      {viewType === "pie" && (
        <div className="h-[400px] flex items-center justify-center">
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
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {sentimentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <RechartsTooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
  
      {/* Graph view */}
      {viewType === "graph" && (
        <div className="h-full overflow-hidden rounded-lg">
          <div className="h-full">
            <EventPredictionGraph
              networkNodes={networkNodes}
              networkLinks={networkLinks}
              dataSource={dataSource}
              timePeriod={timePeriod}
            />
          </div>
        </div>
      )}
    </div>
  );
}