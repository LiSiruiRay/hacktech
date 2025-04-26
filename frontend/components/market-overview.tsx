"use client"

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

// Mock data for the charts
const personalData = [
  { name: "Jan", value: 4000 },
  { name: "Feb", value: 3000 },
  { name: "Mar", value: 5000 },
  { name: "Apr", value: 4800 },
  { name: "May", value: 6000 },
  { name: "Jun", value: 5500 },
  { name: "Jul", value: 7000 },
]

const marketData = [
  { name: "Jan", value: 30000 },
  { name: "Feb", value: 32000 },
  { name: "Mar", value: 31000 },
  { name: "Apr", value: 33000 },
  { name: "May", value: 34500 },
  { name: "Jun", value: 34000 },
  { name: "Jul", value: 36000 },
]

// Mock stock data
const stockData = [
  { symbol: "AAPL", name: "Apple Inc.", price: 182.52, change: 1.25, changePercent: 0.69 },
  { symbol: "MSFT", name: "Microsoft Corp.", price: 417.88, change: -2.32, changePercent: -0.55 },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: 178.75, change: 3.45, changePercent: 1.97 },
  { symbol: "GOOGL", name: "Alphabet Inc.", price: 163.42, change: 0.87, changePercent: 0.54 },
]

interface MarketOverviewProps {
  type: "personal" | "market"
}

export function MarketOverview({ type }: MarketOverviewProps) {
  const data = type === "personal" ? personalData : marketData
  const title = type === "personal" ? "Portfolio Performance" : "Market Performance"
  const value = type === "personal" ? "$7,000" : "$36,000"
  const change = type === "personal" ? "+12.5%" : "+4.2%"
  const isPositive = !change.includes("-")

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
                <AreaChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 0 }}>
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
