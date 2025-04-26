import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { MarketOverview } from "@/components/market-overview"
import { PortfolioSidebar } from "@/components/portfolio-sidebar"
import { NewsAnalysis } from "@/components/news-analysis"
// idk why only this doesn't take next structure. needs explicit TS path alias
import { ModeToggle } from "../components/mode-toggle"
import { Bell, Search, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

export default function Dashboard() {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar for portfolio - desktop */}
      <div className="hidden lg:block w-80 border-r p-4 overflow-auto bg-card/50 shadow-inner">
        <PortfolioSidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden absolute left-4 top-4 z-30">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80 p-0">
          <div className="h-full overflow-auto p-4">
            <PortfolioSidebar />
          </div>
        </SheetContent>
      </Sheet>

      {/* Main content area */}
      <div className="flex-1 flex flex-col overflow-auto">
        <header className="border-b sticky top-0 bg-background/95 backdrop-blur-sm z-20 shadow-sm">
          <div className="max-w-7xl mx-auto flex justify-between items-center p-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">Financial Advisor</h1>
              <div className="hidden md:flex relative rounded-md">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input 
                  type="text" 
                  placeholder="Search markets..." 
                  className="pl-8 h-9 w-[200px] rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <ModeToggle />
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive"></span>
                <span className="sr-only">Notifications</span>
              </Button>
              <Avatar className="h-9 w-9 transition-transform hover:scale-105">
                <AvatarImage src="/avatar.png" alt="User" />
                <AvatarFallback className="bg-primary/10 text-primary">AW</AvatarFallback>
              </Avatar>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Stock market section (top) */}
          <Card className="shadow-md border border-border/40">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xl font-semibold">Market Overview</CardTitle>
              <CardDescription className="text-muted-foreground">Track market performance and your portfolio</CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <Tabs defaultValue="personal">
                <TabsList className="mb-5 w-full md:w-auto">
                  <TabsTrigger value="personal">My Portfolio</TabsTrigger>
                  <TabsTrigger value="market">Market Overview</TabsTrigger>
                </TabsList>
                <TabsContent value="personal" className="mt-0">
                  <MarketOverview type="personal" />
                </TabsContent>
                <TabsContent value="market" className="mt-0">
                  <MarketOverview type="market" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* News analysis section (bottom) */}
          <Card className="shadow-md border border-border/40">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xl font-semibold">News Analysis</CardTitle>
              <CardDescription className="text-muted-foreground">Financial news and market sentiment</CardDescription>
            </CardHeader>
            <CardContent className="pt-5 pb-0">
              <div className="h-[600px] md:h-[750px] overflow-auto">
                <NewsAnalysis />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
