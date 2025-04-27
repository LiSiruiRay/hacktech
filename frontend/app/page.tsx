"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MarketOverview } from "@/components/market-overview";
import { PortfolioSidebar } from "@/components/portfolio-sidebar";
import { NewsAnalysis } from "@/components/news-analysis";
// idk why only this doesn't take next structure. needs explicit TS path alias
import { ModeToggle } from "../components/mode-toggle";
import { Bell, Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import dynamic from "next/dynamic";
import { ExpandableFrame } from "@/components/expandable-frame";

const GraphViewApp = dynamic(
  () => import("@/components/GraphApp/GraphViewApp"),
  {
    ssr: false,
  }
);

// Define types for our data source
type DataSource = "personal" | "market";

export default function Dashboard() {
  // State management for toggling between different views
  const [marketDataSource, setMarketDataSource] =
    useState<DataSource>("personal");
  const [newsDataSource, setNewsDataSource] = useState<DataSource>("personal");

  // Function to handle market data source change
  const handleMarketDataSourceChange = (value: string) => {
    setMarketDataSource(value as DataSource);
  };

  // Function to handle news data source change
  const handleNewsDataSourceChange = (value: string) => {
    setNewsDataSource(value as DataSource);
  };
  //clear local storage
  function clearLocalCache() {
    localStorage.clear();
    console.log("✅ LocalStorage cleared.");
    alert("Local storage cleared!");
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left sidebar for portfolio - desktop */}
      <div className="hidden lg:block w-80 border-r p-4 overflow-auto bg-card/50 shadow-inner">
        <PortfolioSidebar />
      </div>

      {/* Mobile sidebar drawer */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden absolute left-4 top-4 z-30"
          >
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
              <h1 className="text-2xl font-bold text-foreground">
                Financial Advisor
              </h1>
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
                <AvatarFallback className="bg-primary/10 text-primary">
                  AW
                </AvatarFallback>
              </Avatar>
              {/* make visible when i want to clear local storage - not optimal but it's convenient so idc it's a hackathon not production code */}
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 p-0 text-xs"
                onClick={clearLocalCache}
              >
                🧹
              </Button>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 md:p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* Stock market section (top) */}
          <Card className="shadow-md border border-border/40">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xl font-semibold">
                Market Overview
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Track market performance and your portfolio
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5">
              <MarketOverview
                dataSource={marketDataSource}
                onDataSourceChange={handleMarketDataSourceChange}
              />
            </CardContent>
          </Card>

          {/* Graph Visualization iframe */}
          <Card className="shadow-md border border-border/40">
            <CardHeader className="pb-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold">
                    Graph Analysis
                  </CardTitle>
                  <CardDescription className="text-muted-foreground"></CardDescription>
                </div>
                <a
                  href="http://localhost:3001"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <span>Open in new window</span>
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 15 15"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                  >
                    <path
                      d="M3 2C2.44772 2 2 2.44772 2 3V12C2 12.5523 2.44772 13 3 13H12C12.5523 13 13 12.5523 13 12V8.5C13 8.22386 12.7761 8 12.5 8C12.2239 8 12 8.22386 12 8.5V12H3V3H6.5C6.77614 3 7 2.77614 7 2.5C7 2.22386 6.77614 2 6.5 2H3ZM12.8536 2.14645C12.9015 2.19439 12.9377 2.24964 12.9621 2.30861C12.9861 2.36669 12.9996 2.4303 13 2.497L13 2.5V2.50049V5.5C13 5.77614 12.7761 6 12.5 6C12.2239 6 12 5.77614 12 5.5V3.70711L6.85355 8.85355C6.65829 9.04882 6.34171 9.04882 6.14645 8.85355C5.95118 8.65829 5.95118 8.34171 6.14645 8.14645L11.2929 3H9.5C9.22386 3 9 2.77614 9 2.5C9 2.22386 9.22386 2 9.5 2H12.4999H12.5C12.5678 2 12.6324 2.01349 12.6914 2.03794C12.7504 2.06234 12.8056 2.09851 12.8536 2.14645Z"
                      fill="currentColor"
                      fillRule="evenodd"
                      clipRule="evenodd"
                    ></path>
                  </svg>
                </a>
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[500px]">
              <iframe
                src="http://localhost:3001"
                className="w-full h-full border-0"
                title="Graph Analysis"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                loading="lazy"
              />
            </CardContent>
          </Card>

          {/* News analysis section (bottom) */}
          <Card className="shadow-md border border-border/40">
            <CardHeader className="pb-3 border-b">
              <CardTitle className="text-xl font-semibold">
                News Analysis
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Financial news and market sentiment
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-5 pb-0">
              <div className="h-[600px] md:h-[750px] overflow-auto">
                <NewsAnalysis
                  defaultDataSource={newsDataSource}
                  onDataSourceChange={handleNewsDataSourceChange}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
