"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts"
import { List, PieChartIcon, Network, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react"
import EventPredictionGraph from "./events_prediction/event-prediction-graph-updated" // import the graph

// Mock news data
const newsData = [
  {
    id: 1,
    title: "Fed Signals Potential Rate Cut in September",
    source: "Financial Times",
    time: "2 hours ago",
    sentiment: "positive",
    categories: ["Federal Reserve", "Interest Rates", "Economy"],
    impact: 85,
  },
  {
    id: 2,
    title: "Tech Stocks Rally as Earnings Beat Expectations",
    source: "Wall Street Journal",
    time: "4 hours ago",
    sentiment: "positive",
    categories: ["Technology", "Earnings", "Stock Market"],
    impact: 72,
  },
  {
    id: 3,
    title: "Oil Prices Drop Amid Global Demand Concerns",
    source: "Bloomberg",
    time: "6 hours ago",
    sentiment: "negative",
    categories: ["Oil & Gas", "Commodities", "Global Economy"],
    impact: 65,
  },
  {
    id: 4,
    title: "Housing Market Shows Signs of Cooling",
    source: "CNBC",
    time: "8 hours ago",
    sentiment: "neutral",
    categories: ["Real Estate", "Housing", "Economy"],
    impact: 58,
  },
  {
    id: 5,
    title: "Retail Sales Decline for Second Consecutive Month",
    source: "Reuters",
    time: "10 hours ago",
    sentiment: "negative",
    categories: ["Retail", "Consumer Spending", "Economy"],
    impact: 63,
  },
  {
    id: 6,
    title: "Cryptocurrency Market Stabilizes After Volatile Week",
    source: "CoinDesk",
    time: "12 hours ago",
    sentiment: "neutral",
    categories: ["Cryptocurrency", "Bitcoin", "Digital Assets"],
    impact: 55,
  },
]

// Data for pie chart
const sentimentData = [
  { name: "Positive", value: 2, color: "#22c55e" },
  { name: "Neutral", value: 2, color: "#f59e0b" },
  { name: "Negative", value: 2, color: "#ef4444" },
]

// Data for network graph (simplified for this example)
const networkNodes = [
  { id: "Fed", group: 1 },
  { id: "Tech", group: 2 },
  { id: "Oil", group: 3 },
  { id: "Housing", group: 4 },
  { id: "Retail", group: 5 },
  { id: "Crypto", group: 6 },
  { id: "Economy", group: 7 },
  { id: "Stocks", group: 2 },
]

const networkLinks = [
  { source: "Fed", target: "Economy", value: 8 },
  { source: "Tech", target: "Stocks", value: 7 },
  { source: "Oil", target: "Economy", value: 6 },
  { source: "Housing", target: "Economy", value: 5 },
  { source: "Retail", target: "Economy", value: 6 },
  { source: "Crypto", target: "Stocks", value: 4 },
]

export function NewsAnalysis() {
  const [viewType, setViewType] = useState<"list" | "pie" | "graph">("list")

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
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-slate-800 dark:text-slate-100">Financial News Impact</h3>
        <div className="flex space-x-1 border rounded-md overflow-hidden border-slate-200 dark:border-slate-700">
          <button
            onClick={() => setViewType("list")}
            className={`p-2 transition-colors ${viewType === "list" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewType("pie")}
            className={`p-2 transition-colors ${viewType === "pie" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            aria-label="Pie chart view"
          >
            <PieChartIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setViewType("graph")}
            className={`p-2 transition-colors ${viewType === "graph" ? "bg-primary text-primary-foreground" : "hover:bg-accent"}`}
            aria-label="Relational graph view"
          >
            <Network className="h-4 w-4" />
          </button>
        </div>
      </div>

      {viewType === "list" && (
        <div className="space-y-3 h-full overflow-y-auto pr-1">
          {newsData.map((news) => (
            <Card key={news.id} className="hover:bg-accent/50 cursor-pointer transition-colors border-l-4 border-l-primary dark:bg-slate-800/30">
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

      {/* guarantee min height of 400px -- don't allow it to collapse */}
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
              {/* removed recharts tooltip bc the hover looks stupid */}
              {/* it's interactive tho so maybe add it back later with better dark/light mode support and actually useful info instead of what is already shown */}
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {viewType === "graph" && (
        <div className="h-full overflow-hidden rounded-lg">
          <div className="h-full">
            <EventPredictionGraph />
          </div>
        </div>
      )}
    </div>
  )
}
