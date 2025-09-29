import { Header } from "@/components/core/Header";
import { BottomNavigation } from "@/components/core/BottomNavigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Coffee, ShoppingBag, Shield } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const Map = () => {
    const { toast } = useToast();

    const handleNavigate = (locationName: string) => {
        toast({
            title: "Navigation",
            description: `Starting navigation to ${locationName}`,
        });
    };

    const locations = [
        { name: "Security Checkpoint A", type: "security", icon: Shield },
        { name: "Starbucks", type: "restaurant", icon: Coffee },
        { name: "Hudson News", type: "shop", icon: ShoppingBag },
    ];
    
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            <Header />
            <main className="p-4 space-y-4">
                <Card className="overflow-hidden">
                    <div className="h-64 bg-gray-300 flex items-center justify-center">
                         <p className="text-gray-500">Interactive Map View</p>
                    </div>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Key Locations</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {locations.map((location, index) => (
                             <div key={index} className="flex items-center justify-between p-2 hover:bg-gray-100 rounded-md">
                                <div className="flex items-center gap-3">
                                    <location.icon className="h-5 w-5 text-gray-500" />
                                    <span>{location.name}</span>
                                </div>
                                <Button variant="ghost" size="icon" onClick={() => handleNavigate(location.name)}>
                                    <Navigation className="h-4 w-4" />
                                </Button>
                             </div>
                        ))}
                    </CardContent>
                </Card>
            </main>
            <BottomNavigation />
        </div>
    );
};

export default Map;

