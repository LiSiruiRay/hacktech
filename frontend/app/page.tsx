import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketOverview } from "@/components/market-overview"
import { PortfolioSidebar } from "@/components/portfolio-sidebar"
import { NewsAnalysis } from "@/components/news-analysis"

export default function Dashboard() {
  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar for portfolio */}
      <div className="hidden md:block w-80 border-r p-4 overflow-auto">
        <PortfolioSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="border-b p-4">
          <h1 className="text-2xl font-bold">Financial Advisor Dashboard</h1>
        </header>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Stock market section (top right) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>Market Overview</CardTitle>
              <CardDescription>Track market performance and your portfolio</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="personal">
                <TabsList className="mb-4">
                  <TabsTrigger value="personal">My Portfolio</TabsTrigger>
                  <TabsTrigger value="market">Market Overview</TabsTrigger>
                </TabsList>
                <TabsContent value="personal">
                  <MarketOverview type="personal" />
                </TabsContent>
                <TabsContent value="market">
                  <MarketOverview type="market" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* News analysis section (bottom right) */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle>News Analysis</CardTitle>
              <CardDescription>Financial news and market sentiment</CardDescription>
            </CardHeader>
            <CardContent>
              <NewsAnalysis />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
