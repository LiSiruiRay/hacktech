"use client"

import { useState, useEffect } from "react"
import {
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area
} from "recharts"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import CustomTooltip from "@/components/customtooltip" 

// next.js requires it to start with NEXT_PUBLIC_ for env vars
const API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY

// btw this won't update if the cache is still valid, if u add more
// may need to pull this from an API? - unsure
const PERSONAL_STOCKS = ["IBM", "MSFT", "AMZN", "AAPL", "GOOGL", "META"]

interface MarketOverviewProps {
  dataSource: "personal" | "market"
  onDataSourceChange: (v: string) => void
}

interface DataPoint {
  name: number
  value: number
}

interface StockData {
  id: number
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

interface CachedData {
  chartData: DataPoint[]
  stockData: StockData[]
  timestamp: number
}

// Cache expiration time (in milliseconds)
const CACHE_EXPIRY = 15 * 60 * 1000; // 15 minutes - bc that's our update interval

export function MarketOverview({ dataSource, onDataSourceChange }: MarketOverviewProps) {
  const [timePeriod, setTimePeriod] = useState<"day" | "week" | "month">("day")
  const [chartData, setChartData] = useState<DataPoint[]>([])
  const [stockData, setStockData] = useState<StockData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // for Top Performers - show all or only top 4
  const [showAll, setShowAll] = useState(false);

  const handleTimePeriodChange = (v: string) => {
    setTimePeriod(v as "day" | "week" | "month")
  }

  // Helper function to get cache key
  const getCacheKey = (source: string, period: string) => {
    return `market_data_${source}_${period}`;
  }

  // Helper function to check if cache is valid
  const isCacheValid = (timestamp: number) => {
    return Date.now() - timestamp < CACHE_EXPIRY;
  }

  useEffect(() => {
    async function fetchData() {
      if (!API_KEY) {
        console.error("API key missing!")
        setError("API key missing")
        return
      }

      // Check if we have cached data
      const cacheKey = getCacheKey(dataSource, timePeriod);
      const cachedDataStr = localStorage.getItem(cacheKey);
      
      if (cachedDataStr) {
        try {
          const cachedData = JSON.parse(cachedDataStr) as CachedData;
          
          // If cache is still valid, use it
          if (isCacheValid(cachedData.timestamp)) {
            console.log("[DEBUG] Using cached data for", cacheKey);
            setChartData(cachedData.chartData);
            setStockData(cachedData.stockData);
            setLoading(false);
            setError(null);
            return;
          } else {
            console.log("[DEBUG] Cache expired for", cacheKey);
          }
        } catch (e) {
          console.error("Error parsing cached data:", e);
          // Continue with fetching fresh data
        }
      }

      setLoading(true)
      setChartData([])
      setStockData([])

      try {
        const today = new Date()
        today.setDate(today.getDate() - 2) // move back 2 days

        const daysBack = timePeriod === "day" ? 0 : timePeriod === "week" ? 7 : 30
        const pastDate = new Date(today)
        pastDate.setDate(today.getDate() - daysBack)

        const from = pastDate.toISOString().split("T")[0]
        const to = today.toISOString().split("T")[0]

        if (dataSource === "market") {
          console.log("[DEBUG] Fetching SPY", { from, to, timePeriod })
          // if day, fetch every 30 min, otherwise, fetch a data point per day
          const interval = timePeriod === "day" ? "30/minute" : "1/day"
          const chartUrl = `https://api.polygon.io/v2/aggs/ticker/SPY/range/${interval}/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`
          console.log("[DEBUG] Chart URL:", chartUrl)

          const chartRes = await fetch(chartUrl)
          const chartJson = await chartRes.json()

          if (!chartJson.results || chartJson.results.length === 0) {
            throw new Error("No SPY chart results")
          }

          const points = chartJson.results.map((entry: any) => ({
            name: entry.t,
            value: entry.c,
          }))
          points.sort((a: DataPoint, b: DataPoint) => a.name - b.name) //sort by timestamp

          setChartData(points)

          console.log("[DEBUG] Fetching market top performers")
          const snapshotUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${API_KEY}`
          const snapshotRes = await fetch(snapshotUrl)
          const snapshotJson = await snapshotRes.json()

          if (!snapshotJson.tickers) {
            throw new Error("No tickers in snapshot")
          }

          const gainers = snapshotJson.tickers
            .filter((t: any) => t.todaysChangePerc != null)
            .sort((a: any, b: any) => b.todaysChangePerc - a.todaysChangePerc)
            .slice(0, 7)
            .map((g: any, i: number) => ({
              id: i,
              symbol: g.ticker,
              name: "",
              price: g.day?.c || 0, // use day's closing price
              change: g.todaysChange || 0,
              changePercent: g.todaysChangePerc || 0,
            }))

          setStockData(gainers)
          
          // Cache the data
          const cacheData: CachedData = {
            chartData: points,
            stockData: gainers,
            timestamp: Date.now()
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
          
        } else {
          console.log("[DEBUG] Fetching personal portfolio", { from, to });
        
          const allStockPrices: Record<string, { t: number; c: number }[]> = {};
          const timestampsSet = new Set<number>();
          const stocksInfo: StockData[] = [];
        
          for (const [idx, symbol] of PERSONAL_STOCKS.entries()) {
            const interval = timePeriod === "day" ? "30/minute" : "1/day";
            const url = `https://api.polygon.io/v2/aggs/ticker/${symbol}/range/${interval}/${from}/${to}?adjusted=true&sort=asc&limit=5000&apiKey=${API_KEY}`;
            console.log("[DEBUG] Fetching", symbol, url);
        
            const res = await fetch(url);
            const json = await res.json();
        
            if (!json.results || json.results.length === 0) {
              console.error("No results for", symbol);
              continue;
            }
        
            allStockPrices[symbol] = json.results.map((entry: any) => ({
              t: entry.t,
              c: entry.c,
            }));
        
            for (const entry of json.results) {
              timestampsSet.add(entry.t);
            }
        
            const first = json.results[0];
            const last = json.results[json.results.length - 1];
        
            stocksInfo.push({
              id: idx,
              symbol,
              name: "",
              price: last.c,
              change: last.c - first.c,
              changePercent: ((last.c - first.c) / first.c) * 100,
            });
          }
        
          const timestamps = Array.from(timestampsSet).sort((a, b) => a - b);
        
          const lastKnownPrice: Record<string, number> = {}; // symbol -> last known price
          const symbolToPrices = { ...allStockPrices }; // copy
        
          const points: DataPoint[] = [];
        
          for (const t of timestamps) {
            let sum = 0;
            let count = 0;
            for (const symbol of PERSONAL_STOCKS) {
              const prices = symbolToPrices[symbol] || [];
              while (prices.length && prices[0].t <= t) {
                lastKnownPrice[symbol] = prices[0].c;
                prices.shift();
              }
              if (lastKnownPrice[symbol] != null) {
                sum += lastKnownPrice[symbol];
                count += 1;
              }
            }
            if (count > 0) {
              points.push({
                name: t,
                value: sum / count,
              });
            }
          }
        
          setChartData(points);
          setStockData(stocksInfo.sort((a, b) => b.changePercent - a.changePercent));
        
          const cacheData: CachedData = {
            chartData: points,
            stockData: stocksInfo.sort((a, b) => b.changePercent - a.changePercent),
            timestamp: Date.now(),
          };
          localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        }

        setError(null)
      } catch (err: any) {
        console.error(err)
        setError(err.message || "Error loading data")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [dataSource, timePeriod])

  // Use a loading indicator that doesn't cause layout shifts
  if (loading) {
    return (
      <div className="space-y-6">
        {/* Tabs */}
        <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
          <Tabs value={dataSource} onValueChange={onDataSourceChange}>
            <TabsList className="grid grid-cols-2 w-64">
              <TabsTrigger value="personal">My Portfolio</TabsTrigger>
              <TabsTrigger value="market">Market Overview</TabsTrigger>
            </TabsList>
          </Tabs>
          <Tabs value={timePeriod} onValueChange={handleTimePeriodChange}>
            <TabsList className="grid grid-cols-3 w-48">
              <TabsTrigger value="day">Day</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="month">Month</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        
        {/* Skeleton loading state that maintains layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border border-border/50 shadow-md overflow-hidden">
            <CardContent className="p-0">
              <div className="p-6 pb-0 flex justify-between items-start">
                <div>
                  <div className="h-4 w-32 bg-muted rounded animate-pulse mb-2"></div>
                  <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="h-6 w-16 bg-muted rounded animate-pulse"></div>
              </div>
              <div className="h-[300px] mt-2 bg-muted/30 animate-pulse"></div>
            </CardContent>
          </Card>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">
                {dataSource === "personal" ? "Portfolio Top Performers" : "Market Top Performers Today"}
              </h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowAll(prev => !prev)}
              >
                {showAll ? "View Less" : "View All"}
              </Button>
            </div>
            <div className={`space-y-2 transition-all duration-500 overflow-hidden`}>
              {(dataSource === "personal"
                ? (showAll ? stockData : stockData.slice(0, 4))
                : (showAll ? stockData.slice(0, 7) : stockData.slice(0, 4))
              ).map((s) => (
                <div key={s.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{s.symbol}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${s.price.toFixed(2)}</div>
                    <div className={s.changePercent > 0 ? "text-green-500" : "text-red-500"}>
                      {s.change > 0 ? "+" : ""}{s.change.toFixed(2)} ({s.changePercent > 0 ? "+" : ""}{s.changePercent.toFixed(1)}%)
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
  
  if (error) return <div className="p-4 text-center text-red-500">{error}</div>

  const title = dataSource === "personal" ? "Portfolio Performance" : "Market Performance"
  const timeframeText = timePeriod === "day" ? "today" : timePeriod === "week" ? "this week" : "this month"

  const latest = chartData[chartData.length-1]
  const first = chartData[0]
  const value = latest ? `$${latest.value.toLocaleString()}` : "-"
  const pctChange = first ? ((latest.value - first.value) / first.value) * 100 : 0
  const changeLabel = `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(1)}%`
  const isPositive = pctChange >= 0

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
        <Tabs value={dataSource} onValueChange={onDataSourceChange}>
          <TabsList className="grid grid-cols-2 w-64">
            <TabsTrigger value="personal">My Portfolio</TabsTrigger>
            <TabsTrigger value="market">Market Overview</TabsTrigger>
          </TabsList>
        </Tabs>
        <Tabs value={timePeriod} onValueChange={handleTimePeriodChange}>
          <TabsList className="grid grid-cols-3 w-48">
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="week">Week</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chart */}
        <Card className="border border-border/50 shadow-md overflow-hidden">
          <CardContent className="p-0">
            <div className="p-6 pb-0 flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {`${title} (${timeframeText})`}
                </p>
                <h3 className="text-2xl font-bold">{value}</h3>
              </div>
              <Badge variant={isPositive ? "default" : "destructive"} className="flex items-center">
                {isPositive ? <ArrowUpRight className="h-3.5 w-3.5 mr-1" /> : <ArrowDownRight className="h-3.5 w-3.5 mr-1" />}
                {changeLabel}
              </Badge>
            </div>
            <div className="h-[300px] mt-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis 
                    dataKey="name"
                    tickFormatter={(value) => {
                      const date = new Date(value);
                      if (timePeriod === "day") {
                        return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); // example: "3:45 PM"
                      }
                      return date.toLocaleDateString(); // example: "4/27/2025"
                    }}
                  />

                  <YAxis 
                    domain={['auto', 'auto']} 
                    scale="linear"
                    padding={{ top: 20, bottom: 20 }}
                  />
                  <Tooltip content={<CustomTooltip timePeriod={timePeriod} />} />
                  <Area 
                    type="monotone" 
                    dataKey="value" 
                    stroke="#22c55e" 
                    fillOpacity={1} 
                    fill="url(#colorValue)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            {/* market doesn't allow pulling outside of today's behavior*/}
            <h3 className="text-lg font-medium">{dataSource === "personal" ? "Portfolio Top Performers" : "Market Top Performers Today"}</h3>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setShowAll(prev => !prev)}
            >
              {showAll ? "View Less" : "View All"}
            </Button>
          </div>
          <div className="space-y-2">
          {(showAll 
            ? (dataSource === "personal" ? stockData : stockData.slice(0, 7))
            : stockData.slice(0, 4)
          ).map(s => (
              <div key={s.symbol} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <div className="font-medium">{s.symbol}</div>
                </div>
                <div className="text-right">
                  <div className="font-medium">${s.price.toFixed(2)}</div>
                  <div className={s.changePercent > 0 ? "text-green-500" : "text-red-500"}>
                    {s.change > 0 ? "+" : ""}{s.change.toFixed(2)} ({s.changePercent > 0 ? "+" : ""}{s.changePercent.toFixed(1)}%)
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