import { Header } from "@/components/core/Header";
import { FlightCard } from "@/components/flights/FlightCard";
import { BottomNavigation } from "@/components/core/BottomNavigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Flights = () => {
  const { toast } = useToast();

  const handleSearch = () => {
    toast({
      title: "Search Flights",
      description: "Flight search opened",
    });
  };

  const handleFilter = () => {
    toast({
      title: "Filter Options",
      description: "Filter by airline, status, or gate",
    });
  };

  const handleCalendar = () => {
    toast({
      title: "Flight Schedule",
      description: "Calendar view opened",
    });
  };

  const departures = [
    {
      flightNumber: "AA 1234",
      airline: "American Airlines",
      destination: "New York JFK",
      departure: "3:45 PM",
      gate: "A12",
      status: "boarding" as const,
    },
    {
      flightNumber: "DL 5678",
      airline: "Delta Air Lines",
      destination: "Chicago ORD",
      departure: "4:20 PM",
      gate: "B8",
      status: "on-time" as const,
    },
    {
      flightNumber: "UA 9012",
      airline: "United Airlines",
      destination: "San Francisco SFO",
      departure: "5:15 PM",
      gate: "C24",
      status: "delayed" as const,
      delay: 25,
    },
    {
      flightNumber: "SW 3456",
      airline: "Southwest Airlines",
      destination: "Denver DEN",
      departure: "6:30 PM",
      gate: "D15",
      status: "on-time" as const,
    },
  ];

  const arrivals = [
    {
      flightNumber: "AA 7890",
      airline: "American Airlines",
      destination: "From Miami MIA",
      departure: "4:15 PM",
      gate: "A8",
      status: "departed" as const,
    },
    {
      flightNumber: "DL 2468",
      airline: "Delta Air Lines",
      destination: "From Atlanta ATL",
      departure: "4:45 PM",
      gate: "B12",
      status: "on-time" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header />
      
      <main className="p-4">
        {/* Search and Filter Controls */}
        <div className="flex gap-3 mb-6">
          <Button variant="outline" className="flex-1 justify-start gap-2" onClick={handleSearch}>
            <Search className="h-4 w-4" />
            Search flights...
          </Button>
          <Button variant="outline" size="icon" onClick={handleFilter}>
            <Filter className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleCalendar}>
            <Calendar className="h-4 w-4" />
          </Button>
        </div>

        {/* Flight Tabs */}
        <Tabs defaultValue="departures" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="departures">Departures</TabsTrigger>
            <TabsTrigger value="arrivals">Arrivals</TabsTrigger>
          </TabsList>
          
          <TabsContent value="departures" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Departing Flights</span>
                  <Badge className="bg-primary text-primary-foreground">
                    {departures.length} Flights
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {departures.map((flight, index) => (
                  <FlightCard key={index} flight={flight} />
                ))}
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="arrivals" className="space-y-4">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Arriving Flights</span>
                  <Badge className="bg-accent text-accent-foreground">
                    {arrivals.length} Flights
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {arrivals.map((flight, index) => (
                  <FlightCard key={index} flight={flight} />
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

export default Flights;
