import { Header } from "@/components/core/Header";
import { QuickActions } from "@/components/home/QuickActions";
import { BottomNavigation } from "@/components/core/BottomNavigation";
// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// Replacements
import { EnhancedSmartPathCard } from "@/components/home/EnhancedSmartPathCard";
import { ProfessionalFlightCard } from "@/components/flights/ProfessionalFlightCard";

const Home = () => {
  // Mock data for demonstration - matches your flight card interface
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="space-y-6 p-4">
        {/* ProPass / Smart Path (enhanced) */}
        <EnhancedSmartPathCard />

        {/* My Flights */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-medium">
              My Flights
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {flights.length} Active
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {flights.map((flight, index) => (
              <ProfessionalFlightCard
                key={index}
                flight={flight}
              />
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <QuickActions />
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Home;