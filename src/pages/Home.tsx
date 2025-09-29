// CORRECTED IMPORT PATHS - The builder will now find these files
import { Header } from "@/components/core/Header";
import { FlightCard } from "@/components/flights/FlightCard";
import { QuickActions } from "@/components/home/QuickActions";
import { SmartPathCard } from "@/components/home/SmartPathCard";
import { BottomNavigation } from "@/components/core/BottomNavigation";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const Home = () => {
  // Mock data for demonstration
  const flights = [
    {
      flightNumber: "UA 482",
      airline: "United Airlines",
      destination: "Tokyo (NRT)",
      departure: "12:05 PM",
      gate: "C12",
      status: "on-time" as const,
    },
     {
      flightNumber: "DL 5678",
      airline: "Delta Air Lines",
      destination: "Chicago ORD",
      departure: "4:20 PM",
      gate: "B8",
      status: "on-time" as const,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-subtle pb-20">
      <Header />
      
      <main className="p-4 space-y-6">
        {/* ProPass Section */}
        <SmartPathCard />
        
        {/* My Flights */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>My Flights</span>
              <Badge className="bg-primary text-primary-foreground">
                {flights.length} Active
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {flights.map((flight, index) => (
              <FlightCard key={index} flight={flight} />
            ))}
          </CardContent>
        </Card>
        
        {/* Quick Actions */}
        <QuickActions />
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Home;

