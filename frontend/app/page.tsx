import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketOverview } from "@/components/market-overview"
import { PortfolioSidebar } from "@/components/portfolio-sidebar"
import { NewsAnalysis } from "@/components/news-analysis"

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar for portfolio */}
      <div className="hidden md:block w-80 border-r p-4 overflow-auto bg-sidebar shadow-inner">
        <PortfolioSidebar />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="border-b p-4 sticky top-0 bg-background z-20 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center">
            <h1 className="text-2xl font-semibold text-slate-800">Financial Advisor Dashboard</h1>
            <div className="flex items-center gap-4">
              <button className="p-2 rounded-full hover:bg-accent/80 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              </button>
              <div className="h-8 w-8 rounded-full bg-slate-700 text-white flex items-center justify-center">
                <span className="font-medium">AW</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 p-6 space-y-6">
          {/* Stock market section (top) */}
          <Card className="shadow-sm border border-slate-200">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-slate-800">Market Overview</CardTitle>
              <CardDescription className="pb-2 text-slate-500">Track market performance and your portfolio</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs defaultValue="personal">
                <TabsList className="mb-5 bg-slate-100">
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

          {/* News analysis section (bottom)*/}
          {/* this contains the entire news analysis box */}
          <Card className="min-h-[780px] shadow-sm border border-slate-200 flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-slate-800">News Analysis</CardTitle>
              <CardDescription className="pb-2 text-slate-500">Financial news and market sentiment</CardDescription>
            </CardHeader>
            {/* pt-5 is top padding, pb-0 is bottom padding */}
            <CardContent className="pt-5 pb-0 flex-1">
              <div className="h-full overflow-auto">
                <NewsAnalysis />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
