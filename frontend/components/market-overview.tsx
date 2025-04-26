"use client"

import { useState, useEffect } from "react"
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Define types
type DataSource = "personal" | "market";
type TimePeriod = "day" | "week" | "month";

// Updated props interface
interface MarketOverviewProps {
  dataSource: DataSource;
  onDataSourceChange: (value: string) => void;
}

// Data point interface for chart data
interface DataPoint {
  name: string;
  value: number;
}

// Stock data interface
interface StockData {
  id: number;
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
}

export function MarketOverview({ dataSource, onDataSourceChange }: MarketOverviewProps) {
  // Local state for time period
  const [timePeriod, setTimePeriod] = useState<TimePeriod>("day");
  // State for chart data and stock data
  const [chartData, setChartData] = useState<DataPoint[]>([]);
  const [stockData, setStockData] = useState<StockData[]>([]);
  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to handle time period change
  const handleTimePeriodChange = (value: string) => {
    setTimePeriod(value as TimePeriod);
  };

  // Effect to fetch data based on dataSource and timePeriod
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // create endpoint with proper capitalization based on the API
        // data source -- market or personal, time period -- day week month
        const chartEndpoint = `${dataSource}${timePeriod.charAt(0).toUpperCase() + timePeriod.slice(1)}`;
        const stockEndpoint = "stock";

        console.log(`Fetching from: ${chartEndpoint}, ${stockEndpoint}`);

        // Fetch data
        const [chartResponse, stockResponse] = await Promise.all([
          fetch(`http://localhost:3001/${chartEndpoint}`),
          fetch(`http://localhost:3001/${stockEndpoint}`)
        ]);

        if (!chartResponse.ok || !stockResponse.ok) {
          throw new Error(`Failed to fetch data from ${chartEndpoint} or ${stockEndpoint}`);
        }
        
        const chartData = await chartResponse.json();
        const stockData = await stockResponse.json();
        
        setChartData(chartData);
        setStockData(stockData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Error loading market or stock data");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [dataSource, timePeriod]);

  if (loading) {
    return <div className="p-4 text-center">Loading data...</div>;
  }

  if (error) {
    return <div className="p-4 text-center text-red-500">{error}</div>;
  }

  // Determine title based on data source
  const title = dataSource === "personal" ? "Portfolio Performance" : "Market Performance";
  
  // Generate timeframe text based on time period
  const timeframeText = timePeriod === "day" ? "today" : 
                       timePeriod === "week" ? "this week" : 
                       "this month";

  // Calculate metrics for display
  const latestData = chartData[chartData.length - 1];
  const firstData = chartData[0]; // Use the first data point instead of the second-to-last
  const value = latestData ? `$${latestData.value.toLocaleString()}` : "-";
  const percentChange = firstData
    ? ((latestData.value - firstData.value) / firstData.value) * 100
    : 0;
  const change = `${percentChange >= 0 ? "+" : ""}${percentChange.toFixed(1)}%`;
  const isPositive = percentChange >= 0;

  return (
    <div className="space-y-6">
      {/* Toggles section */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <Tabs value={dataSource} onValueChange={onDataSourceChange} className="w-auto">
          <TabsList className="grid grid-cols-2 w-64">
            <TabsTrigger value="personal">My Portfolio</TabsTrigger>
            <TabsTrigger value="market">Market Overview</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <Tabs value={timePeriod} onValueChange={handleTimePeriodChange} className="w-auto">
          <TabsList className="grid grid-cols-3 w-48">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Content section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border border-border/50 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 pb-0">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-muted-foreground">
                      {`${title} (${timeframeText})`}
                    </p>
                    <TooltipProvider>
                      <UITooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 rounded-full">
                            <Info className="h-3 w-3" />
                            <span className="sr-only">More info</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Performance over the selected time period</p>
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
  );
}