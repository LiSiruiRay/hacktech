"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

// Mock data for stocks and crypto
const stocksData = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 10, price: 182.52, value: 1825.2, change: 1.25, changePercent: 0.69 },
  {
    symbol: "MSFT",
    name: "Microsoft Corp.",
    shares: 5,
    price: 417.88,
    value: 2089.4,
    change: -2.32,
    changePercent: -0.55,
  },
  {
    symbol: "AMZN",
    name: "Amazon.com Inc.",
    shares: 8,
    price: 178.75,
    value: 1430.0,
    change: 3.45,
    changePercent: 1.97,
  },
  {
    symbol: "GOOGL",
    name: "Alphabet Inc.",
    shares: 6,
    price: 163.42,
    value: 980.52,
    change: 0.87,
    changePercent: 0.54,
  },
  { symbol: "TSLA", name: "Tesla Inc.", shares: 4, price: 177.58, value: 710.32, change: -1.23, changePercent: -0.69 },
  {
    symbol: "META",
    name: "Meta Platforms Inc.",
    shares: 7,
    price: 474.99,
    value: 3324.93,
    change: 2.56,
    changePercent: 0.54,
  },
]

const cryptoData = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    amount: 0.5,
    price: 63245.78,
    value: 31622.89,
    change: 1254.32,
    changePercent: 2.02,
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    amount: 2.5,
    price: 3052.67,
    value: 7631.68,
    change: -87.45,
    changePercent: -2.79,
  },
  { symbol: "SOL", name: "Solana", amount: 15, price: 142.56, value: 2138.4, change: 3.21, changePercent: 2.3 },
  { symbol: "ADA", name: "Cardano", amount: 1000, price: 0.45, value: 450.0, change: 0.01, changePercent: 2.27 },
]

export function PortfolioSidebar() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredStocks = stocksData.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const filteredCrypto = cryptoData.filter(
    (crypto) =>
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">My Portfolio</h2>

      <div className="relative">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search assets..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <Tabs defaultValue="stocks">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="stocks">Stocks</TabsTrigger>
          <TabsTrigger value="crypto">Crypto</TabsTrigger>
        </TabsList>

        <TabsContent value="stocks" className="space-y-4 mt-4">
          <div className="text-sm text-muted-foreground flex justify-between">
            <span>Total Value: $10,360.37</span>
            <span className="text-green-500">+2.3%</span>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredStocks.map((stock) => (
              <Card key={stock.symbol} className="hover:bg-accent/50 cursor-pointer transition-colors">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{stock.symbol}</div>
                      <div className="text-xs text-muted-foreground">{stock.name}</div>
                      <div className="text-xs">{stock.shares} shares</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${stock.value.toFixed(2)}</div>
                      <div className={stock.change > 0 ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                        {stock.change > 0 ? "+" : ""}
                        {stock.changePercent}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="crypto" className="space-y-4 mt-4">
          <div className="text-sm text-muted-foreground flex justify-between">
            <span>Total Value: $41,842.97</span>
            <span className="text-green-500">+1.8%</span>
          </div>

          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredCrypto.map((crypto) => (
              <Card key={crypto.symbol} className="hover:bg-accent/50 cursor-pointer transition-colors">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{crypto.symbol}</div>
                      <div className="text-xs text-muted-foreground">{crypto.name}</div>
                      <div className="text-xs">
                        {crypto.amount} {crypto.symbol}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${crypto.value.toFixed(2)}</div>
                      <div className={crypto.change > 0 ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                        {crypto.change > 0 ? "+" : ""}
                        {crypto.changePercent}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
