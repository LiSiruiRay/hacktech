"use client"

import { useState, useEffect } from "react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, Legend } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"


// either displays personal porfolio data or market data based on the type prop
interface MarketOverviewProps {
  type: "personal" | "market"
}
// add Typescript interfaces for the data structures from the JSON
// a data point in the chart. /personal and /market return like this.
interface DataPoint{
  name: string;
  value: number;
}
// describes one stock, used for top performers section
interface StockData{
  id: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}
export function MarketOverview({ type }: MarketOverviewProps) {
  // stores data points for the graph -- personal or market
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  // stores list of stocks, for top performers section
  const [stockData, setStockData] = useState<StockData[]>([]);
  // whether the api fetching is in progress
  const [loading, setLoading] = useState(true);
  // if we get an error we shld know what it is and show it 
  const [error, setError] = useState<string | null>(null);

  // run once page renders, to get the data
  useEffect(() => {
    async function fetchData() {
      try{
        // dynamically decide which endpoint to hit based on prop
        const endpoint = type === "personal" ? "personal" : "market";
        // fetch both datasets at once for efficiency
        const [chartResponse, stockResponse] = await Promise.all([
          fetch(`http://localhost:3001/${endpoint}`),
          fetch(`http://localhost:3001/stock`)
        ]);
        if (!chartResponse.ok || !stockResponse.ok) {
          throw new Error("Failed to fetch data");
        }
        const chartData = await chartResponse.json();
        const stockData = await stockResponse.json();
        setChartData(chartData);
        setStockData(stockData);
      }
      catch (err) {
        setError("Error loading market or stock data");
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [type]); // [type]: re-fetch if user switches between "personal" and "market"
  if (loading) {
    return <div className="p-4 text-center">Loading data...</div>;
  }
  
  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  const title = type === "personal" ? "Portfolio Performance" : "Market Performance"
  
  // chart data
  const latestData = chartData[chartData.length - 1];
  const previousData = chartData[chartData.length - 2];
  const value = latestData ? `$${latestData.value.toLocaleString()}` : "-";
  const percentChange = previousData
  ? ((latestData.value - previousData.value) / previousData.value) * 100
  : 0;
  const change = `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(1)}%`;
  const isPositive = percentChange >= 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border/50 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">More info</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Performance over the last 7 months</p>
                        </TooltipContent>
                      </UITooltip>
                    </TooltipProvider>
                  </div>
                  <h3 className="text-2xl font-bold">{value}</h3>
                </div>
                <Badge variant={isPositive ? "default" : "destructive"} className="flex items-center">
                  {isPositive ? (
                    <ArrowUpRight className="h-3.5 w-3.5 mr-1" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5 mr-1" />
                  )}
                  {change}
                </Badge>
              </div>
            </div>
            <div className="h-[250px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                {/*add some padding at the left so it doesn't look cramped at 5figs*/}
                <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid 
                    strokeDasharray="3 3" 
                    vertical={false} 
                    stroke="var(--border)" 
                    opacity={0.5} 
                  />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="value" stroke="#22c55e" fillOpacity={1} fill="url(#colorValue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Top Performers</h3>
            <Button variant="outline" size="sm">
              View All
            </Button>
          </div>
          <div className="space-y-2">
            {stockData.map((stock) => (
              <div key={stock.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{stock.symbol}</div>
                  <div className="text-sm text-muted-foreground">{stock.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${stock.price}</div>
                  <div className={stock.change > 0 ? "text-green-500" : "text-red-500"}>
                    {stock.change > 0 ? "+" : ""}
                    {stock.change} ({stock.change > 0 ? "+" : ""}
                    {stock.changePercent}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
