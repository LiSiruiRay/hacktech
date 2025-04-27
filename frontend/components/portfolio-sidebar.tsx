"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"

const API_KEY = process.env.NEXT_PUBLIC_POLYGON_API_KEY

const INITIAL_STOCKS = [
  { symbol: "AAPL", name: "Apple Inc.", shares: 10 },
  { symbol: "MSFT", name: "Microsoft Corp.", shares: 5 },
  { symbol: "AMZN", name: "Amazon.com Inc.", shares: 8 },
  { symbol: "GOOGL", name: "Alphabet Inc.", shares: 6 },
  { symbol: "META", name: "Meta Platforms Inc.", shares: 7 },
  { symbol: "IBM", name: "International Business Machines Corp.", shares: 9 }
]

const CRYPTO_DATA = [
  { symbol: "BTC", name: "Bitcoin", amount: 0.5, price: 63245.78, value: 31622.89, change: 1254.32, changePercent: 2.02 },
  { symbol: "ETH", name: "Ethereum", amount: 2.5, price: 3052.67, value: 7631.68, change: -87.45, changePercent: -2.79 },
  { symbol: "SOL", name: "Solana", amount: 15, price: 142.56, value: 2138.4, change: 3.21, changePercent: 2.3 },
  { symbol: "ADA", name: "Cardano", amount: 1000, price: 0.45, value: 450.0, change: 0.01, changePercent: 2.27 },
]

// Cache expiration (15 min)
const CACHE_EXPIRY_MS = 15 * 60 * 1000
const CACHE_KEY = "portfolio-stock-data"

export function PortfolioSidebar() {
  const [searchQuery, setSearchQuery] = useState("")
  const [stocks, setStocks] = useState<any[]>(INITIAL_STOCKS)

  useEffect(() => {
    async function fetchStockPrices() {
      if (!API_KEY) {
        console.error("Missing API key")
        return
      }

      try {
        const res = await fetch(`https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=${API_KEY}`)
        const data = await res.json()

        const prices = data.tickers.filter((t: any) => 
          INITIAL_STOCKS.some((s) => s.symbol === t.ticker)
        )

        const updated = INITIAL_STOCKS.map((stock) => {
          const ticker = prices.find((p: any) => p.ticker === stock.symbol)
          const price = ticker?.day?.c ?? 0
          const change = ticker?.todaysChange ?? 0
          const changePercent = ticker?.todaysChangePerc ?? 0
          const value = price * stock.shares

          return { ...stock, price, value, change, changePercent }
        })

        setStocks(updated)

        // Cache it
        const cacheData = {
          timestamp: Date.now(),
          data: updated
        }
        localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData))

      } catch (err) {
        console.error("Error fetching stock prices", err)
      }
    }

    function loadFromCacheOrFetch() {
      const cacheStr = localStorage.getItem(CACHE_KEY)
      if (cacheStr) {
        try {
          const cache = JSON.parse(cacheStr)
          const age = Date.now() - cache.timestamp

          if (age < CACHE_EXPIRY_MS) {
            console.log("[DEBUG] Using cached portfolio stocks")
            setStocks(cache.data)
            return
          } else {
            console.log("[DEBUG] Cache expired, fetching new data")
          }
        } catch (err) {
          console.error("Error parsing cache", err)
        }
      }

      // Cache missing or expired
      fetchStockPrices()
    }

    loadFromCacheOrFetch()

  }, [])

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredCrypto = CRYPTO_DATA.filter(
    (crypto) =>
      crypto.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      crypto.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                      <div className="font-medium">${stock.value?.toFixed(2) ?? "-"}</div>
                      <div className={stock.change > 0 ? "text-green-500 text-xs" : "text-red-500 text-xs"}>
                        {stock.change > 0 ? "+" : ""}
                        {stock.changePercent?.toFixed(2) ?? "0"}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="crypto" className="space-y-4 mt-4">
          <div className="space-y-2 max-h-[calc(100vh-250px)] overflow-y-auto pr-1">
            {filteredCrypto.map((crypto) => (
              <Card key={crypto.symbol} className="hover:bg-accent/50 cursor-pointer transition-colors">
                <CardContent className="p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{crypto.symbol}</div>
                      <div className="text-xs text-muted-foreground">{crypto.name}</div>
                      <div className="text-xs">{crypto.amount} {crypto.symbol}</div>
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
