import { Header } from "@/components/core/Header";
import { WaitTimeCard } from "@/components/wait-times/WaitTimeCard";
import { BottomNavigation } from "@/components/core/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

const WaitTimes = () => {
  const { toast } = useToast();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    toast({
      title: "Refreshing Wait Times",
      description: "Updating all location wait times...",
    });
    
    setTimeout(() => {
      setIsRefreshing(false);
      toast({
        title: "Wait Times Updated",
        description: "All wait times have been refreshed",
      });
    }, 2000);
  };

  const securityWaitTimes = [
    { location: "Security Checkpoint A", type: "security" as const, waitTime: 8, capacity: "low" as const },
    { location: "Security Checkpoint B", type: "security" as const, waitTime: 15, capacity: "medium" as const },
    { location: "Security Checkpoint C", type: "security" as const, waitTime: 22, capacity: "high" as const },
    { location: "TSA PreCheck Lane", type: "security" as const, waitTime: 3, capacity: "low" as const },
  ];

  const restaurantWaitTimes = [
    { location: "Starbucks Terminal 3", type: "restaurant" as const, waitTime: 12, capacity: "medium" as const },
    { location: "Wolfgang Puck Express", type: "restaurant" as const, waitTime: 8, capacity: "low" as const },
    { location: "McDonald's", type: "restaurant" as const, waitTime: 5, capacity: "low" as const },
    { location: "California Pizza Kitchen", type: "restaurant" as const, waitTime: 18, capacity: "high" as const },
  ];

  const loungeWaitTimes = [
    { location: "United Club", type: "lounge" as const, waitTime: 0, capacity: "low" as const },
    { location: "American Express Centurion", type: "lounge" as const, waitTime: 5, capacity: "medium" as const },
    { location: "Priority Pass Lounge", type: "lounge" as const, waitTime: 12, capacity: "medium" as const },
  ];

  const shopWaitTimes = [
    { location: "Hudson News", type: "shop" as const, waitTime: 3, capacity: "low" as const },
    { location: "Tech Hub Electronics", type: "shop" as const, waitTime: 7, capacity: "low" as const },
    { location: "Duty Free Shop", type: "shop" as const, waitTime: 10, capacity: "medium" as const },
  ];

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-destructive" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-success" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getAverageWaitTime = (waitTimes: any[]) => {
    return Math.round(waitTimes.reduce((sum, item) => sum + item.waitTime, 0) / waitTimes.length);
  };

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header />
      
      <main className="p-4 space-y-6">
        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-primary">{getAverageWaitTime(securityWaitTimes)}min</p>
              <p className="text-sm text-muted-foreground">Avg Security Wait</p>
              <div className="flex items-center justify-center mt-1">
                {getTrendIcon(-2)}
                <span className="text-xs text-muted-foreground ml-1">vs last hour</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="shadow-card">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-accent">{getAverageWaitTime(restaurantWaitTimes)}min</p>
              <p className="text-sm text-muted-foreground">Avg Restaurant Wait</p>
              <div className="flex items-center justify-center mt-1">
                {getTrendIcon(1)}
                <span className="text-xs text-muted-foreground ml-1">vs last hour</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Refresh Button */}
        <div className="text-center">
          <Button variant="outline" className="gap-2" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Refreshing...' : 'Refresh Wait Times'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            Last updated: {isRefreshing ? 'Updating...' : '2 minutes ago'}
          </p>
        </div>

        {/* Wait Time Categories */}
        <Tabs defaultValue="security" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="security" className="text-xs">Security</TabsTrigger>
            <TabsTrigger value="restaurants" className="text-xs">Food</TabsTrigger>
            <TabsTrigger value="lounges" className="text-xs">Lounges</TabsTrigger>
            <TabsTrigger value="shops" className="text-xs">Shops</TabsTrigger>
          </TabsList>
          
          <TabsContent value="security" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Security Checkpoints</span>
                  <Badge className="bg-primary text-primary-foreground">
                    {securityWaitTimes.length} Locations
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {securityWaitTimes.map((waitTime, index) => (
                  <WaitTimeCard key={index} waitTime={waitTime} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="restaurants" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Restaurants & Cafes</span>
                  <Badge className="bg-accent text-accent-foreground">
                    {restaurantWaitTimes.length} Locations
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {restaurantWaitTimes.map((waitTime, index) => (
                  <WaitTimeCard key={index} waitTime={waitTime} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="lounges" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Lounges</span>
                  <Badge className="bg-success text-success-foreground">
                    {loungeWaitTimes.length} Locations
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {loungeWaitTimes.map((waitTime, index) => (
                  <WaitTimeCard key={index} waitTime={waitTime} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="shops" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Shops & Services</span>
                  <Badge className="bg-warning text-warning-foreground">
                    {shopWaitTimes.length} Locations
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {shopWaitTimes.map((waitTime, index) => (
                  <WaitTimeCard key={index} waitTime={waitTime} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default WaitTimes;