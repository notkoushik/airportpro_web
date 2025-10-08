// src/pages/Flights.tsx
import { Header } from "@/components/core/Header";
import { BottomNavigation } from "@/components/core/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const Flights = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 pb-20">
        <Card>
          <CardHeader>
            <CardTitle>My Flights</CardTitle>
          </CardHeader>
          <CardContent>
            <p>Flight information will appear here.</p>
          </CardContent>
        </Card>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Flights;
