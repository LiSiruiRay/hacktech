"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { List, PieChartIcon, Network, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react"
import EventPredictionGraph from "./events_prediction/event-prediction-graph-updated" // import the graph
import { NewsData, SentimentData, NetworkNode, NetworkLink } from "@/types";





export function NewsAnalysis() {
  const [viewType, setViewType] = useState<"list" | "pie" | "graph">("list")
  const [newsData, setNewsData] = useState<NewsData[]>([]);
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([]);
  const [networkNodes, setNetworkNodes] = useState<NetworkNode[]>([]);
  const [networkLinks, setNetworkLinks] = useState<NetworkLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [newsResponse, sentimentResponse, nodesResponse, linksResponse] = await Promise.all([
          fetch('http://localhost:3001/news'),
          fetch('http://localhost:3001/sentiment'),
          fetch('http://localhost:3001/networknodes'),
          fetch('http://localhost:3001/networklinks')
        ]);
  
        if (!newsResponse.ok || !sentimentResponse.ok || !nodesResponse.ok || !linksResponse.ok) {
          throw new Error('Failed to fetch one or more datasets');
        }
  
        const news = await newsResponse.json();
        const sentiment = await sentimentResponse.json();
        const nodes = await nodesResponse.json();
        const links = await linksResponse.json();
  
        setNewsData(news);
        setSentimentData(sentiment);
        setNetworkNodes(nodes);
        setNetworkLinks(links);
  
      } catch (err) {
        console.error(err);
        setError('Error loading financial data.');
      } finally {
        setLoading(false);
      }
    }
  
    fetchData();
  }, []);
  if (loading) {
    return <div className="p-4 text-center">Loading financial data...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }
  
  
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

  return (
    <div className="space-y-5">
      {/* Top section: header + view toggles */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">
          Financial News Impact
        </h3>
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
            />
          </div>
        </div>
      )}
    </div>
  );
  
}
